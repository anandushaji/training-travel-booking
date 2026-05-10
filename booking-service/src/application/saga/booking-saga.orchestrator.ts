import { Injectable, Logger } from '@nestjs/common';
import { Booking } from '../../domain/aggregates/booking.aggregate';
import { BookingSaga } from '../../domain/entities/booking-saga.entity';
import { BookingSagaRepository } from '../../infrastructure/repositories/booking-saga.repository';
import { PolicyServiceClient } from '../../infrastructure/http/policy-service.client';
import { InventoryServiceClient } from '../../infrastructure/http/inventory-service.client';
import { PaymentServiceClient } from '../../infrastructure/http/payment-service.client';
import { BookingMetricsService } from '../../infrastructure/metrics/booking-metrics.service';
import { DomainException } from '@travel/shared';

export class PolicyViolationException extends DomainException {
  constructor(violations: string[]) {
    super(
      `Policy validation failed: ${violations.join(', ')}`,
      'POLICY_VIOLATION',
      422,
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

@Injectable()
export class BookingSagaOrchestrator {
  private readonly logger = new Logger(BookingSagaOrchestrator.name);

  constructor(
    private readonly sagaRepo: BookingSagaRepository,
    private readonly policyClient: PolicyServiceClient,
    private readonly inventoryClient: InventoryServiceClient,
    private readonly paymentClient: PaymentServiceClient,
    private readonly metrics: BookingMetricsService,
  ) {}

  async execute(booking: Booking, correlationId: string): Promise<void> {
    const saga = BookingSaga.create(booking.id);
    const sagaStart = Date.now();

    // Persist saga as STARTED
    await this.sagaRepo.save(saga);

    // Step 1: Validate Policy
    const step1 = saga.addStep('validate_policy');
    step1.markInProgress();
    await this.sagaRepo.save(saga);

    try {
      const policyResult = await this.policyClient.validatePolicy(
        {
          travelerId: booking.travelerId,
          department: 'UNKNOWN',
          offerId: booking.offerId,
          totalAmount: booking.totalAmount,
          currency: booking.currency,
          itinerary: booking.itinerary.toJSON(),
        },
        correlationId,
      );

      if (!policyResult.valid) {
        step1.markFailed('Policy violation');
        saga.markStepFailed(1, 'Policy violation');
        saga.fail();
        await this.sagaRepo.save(saga);
        throw new PolicyViolationException(policyResult.violations ?? ['Policy violation']);
      }

      saga.markStepCompleted(1);
      await this.sagaRepo.save(saga);
    } catch (err) {
      if (err instanceof PolicyViolationException) {
        throw err;
      }
      saga.markStepFailed(1, (err as Error).message);
      saga.fail();
      await this.sagaRepo.save(saga);
      await this.compensate(booking, saga, correlationId);
      throw err;
    }

    // Step 2: Reserve Flight
    const step2 = saga.addStep('create_reservation');
    step2.markInProgress();
    await this.sagaRepo.save(saga);

    try {
      const reservation = await this.inventoryClient.createReservation(
        booking.offerId,
        booking.itinerary.toJSON(),
        correlationId,
      );
      booking.reserve(reservation.reservationId);
      saga.markStepCompleted(2);
      await this.sagaRepo.save(saga);
    } catch (err) {
      saga.markStepFailed(2, (err as Error).message);
      await this.sagaRepo.save(saga);
      await this.compensate(booking, saga, correlationId);
      throw err;
    }

    // Step 3: Authorize Payment
    const step3 = saga.addStep('authorize_payment');
    step3.markInProgress();
    await this.sagaRepo.save(saga);

    try {
      const paymentResult = await this.paymentClient.authorizePayment(
        booking.id,
        booking.travelerId,
        booking.totalAmount,
        booking.currency,
        correlationId,
      );
      booking.startPaymentProcessing(paymentResult.paymentId);
      saga.markStepCompleted(3);
      await this.sagaRepo.save(saga);
    } catch (err) {
      saga.markStepFailed(3, (err as Error).message);
      await this.sagaRepo.save(saga);
      await this.compensate(booking, saga, correlationId);
      throw err;
    }

    // Step 4: Capture Payment
    const step4 = saga.addStep('capture_payment');
    step4.markInProgress();
    await this.sagaRepo.save(saga);

    try {
      await this.paymentClient.capturePayment(booking.paymentId as string, correlationId);
      booking.confirm('', '');
      saga.markStepCompleted(4);
      saga.complete();
      await this.sagaRepo.save(saga);

      const duration = (Date.now() - sagaStart) / 1000;
      this.metrics.bookingSagaDurationSeconds.observe(duration);
      this.metrics.incrementBookingsConfirmed();
    } catch (err) {
      saga.markStepFailed(4, (err as Error).message);
      await this.sagaRepo.save(saga);
      await this.compensate(booking, saga, correlationId);
      throw err;
    }
  }

  async compensate(booking: Booking, saga: BookingSaga, correlationId: string): Promise<void> {
    this.logger.warn(`Compensating saga for booking ${booking.id}`);
    saga.beginCompensation();
    await this.sagaRepo.save(saga);

    let compensationFailed = false;

    // Compensation step C1: refund payment (if authorized)
    if (booking.paymentId) {
      try {
        await this.paymentClient.refundPayment(booking.paymentId, correlationId);
      } catch (err) {
        this.logger.error(
          `Compensation failed for bookingId=${booking.id} sagaId=${saga.id} stepName=refund_payment: ${(err as Error).message}`,
        );
        compensationFailed = true;
        this.metrics.incrementCompensationFailed();
      }
    }

    // Compensation step C2: cancel reservation (if reserved)
    if (booking.reservationId) {
      try {
        await this.inventoryClient.cancelReservation(booking.reservationId, correlationId);
      } catch (err) {
        this.logger.error(
          `Compensation failed for bookingId=${booking.id} sagaId=${saga.id} stepName=cancel_reservation: ${(err as Error).message}`,
        );
        compensationFailed = true;
        this.metrics.incrementCompensationFailed();
      }
    }

    booking.fail('Saga compensation');

    if (compensationFailed) {
      saga.markCompensatedWithErrors();
    } else {
      saga.markCompensated();
    }
    await this.sagaRepo.save(saga);

    if (compensationFailed) {
      throw new Error('Saga compensation failed — manual intervention required');
    }
  }
}
