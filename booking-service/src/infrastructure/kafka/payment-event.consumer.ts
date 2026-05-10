import { Injectable, Logger } from '@nestjs/common';
import { BookingRepository } from '../repositories/booking.repository';
import { BookingSagaRepository } from '../repositories/booking-saga.repository';
import { BookingReadModelRepository } from '../repositories/booking-read-model.repository';
import { BookingEventPublisher } from './booking-event.publisher';
import { InventoryServiceClient } from '../http/inventory-service.client';
import { BookingConfirmedEvent } from '../../domain/events/booking-confirmed.event';
import { BookingCancelledEvent } from '../../domain/events/booking-cancelled.event';
import { SagaStatus } from '../../domain/value-objects/saga-status.enum';

interface PaymentCapturedData {
  bookingId: string;
  paymentId: string;
  travelerId: string;
  amount: number;
  currency: string;
}

interface PaymentFailedData {
  bookingId: string;
  paymentId?: string;
  reason: string;
}

@Injectable()
export class PaymentEventConsumer {
  private readonly logger = new Logger(PaymentEventConsumer.name);

  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly sagaRepo: BookingSagaRepository,
    private readonly readModelRepo: BookingReadModelRepository,
    private readonly publisher: BookingEventPublisher,
    private readonly inventoryClient: InventoryServiceClient,
  ) {}

  async handlePaymentCaptured(data: PaymentCapturedData, correlationId: string): Promise<void> {
    const booking = await this.bookingRepo.findById(data.bookingId);
    if (!booking) {
      this.logger.warn(`PaymentCaptured: booking ${data.bookingId} not found`);
      return;
    }

    const saga = await this.sagaRepo.findByBookingId(data.bookingId);
    if (saga && saga.status === SagaStatus.COMPLETED) {
      this.logger.debug(`PaymentCaptured: saga already COMPLETED for ${data.bookingId}, skipping (idempotent)`);
      return;
    }

    booking.confirm('', '');
    await this.bookingRepo.save(booking);

    if (saga) {
      saga.complete();
      await this.sagaRepo.save(saga);
    }

    const event = new BookingConfirmedEvent({
      aggregateId: booking.id,
      correlationId,
      data: {
        travelerId: booking.travelerId,
        travelerName: booking.travelerName ?? '',
        travelerEmail: booking.travelerEmail ?? '',
        reservationId: booking.reservationId ?? '',
        paymentId: data.paymentId,
        itinerary: booking.itinerary.toJSON(),
        totalAmount: booking.totalAmount,
        currency: booking.currency,
        confirmedAt: new Date().toISOString(),
      },
    });

    try {
      await this.publisher.publishBookingConfirmed(event);
    } catch (err) {
      this.logger.error(`Failed to publish BookingConfirmed: ${(err as Error).message}`);
    }

    await this.readModelRepo.updateStatus(booking.id, 'CONFIRMED');
  }

  async handlePaymentFailed(data: PaymentFailedData, correlationId: string): Promise<void> {
    const booking = await this.bookingRepo.findById(data.bookingId);
    if (!booking) {
      this.logger.warn(`PaymentFailed: booking ${data.bookingId} not found`);
      return;
    }

    const saga = await this.sagaRepo.findByBookingId(data.bookingId);
    if (saga && (saga.status === SagaStatus.COMPENSATED || saga.status === SagaStatus.COMPENSATED_WITH_ERRORS)) {
      this.logger.debug(`PaymentFailed: saga already COMPENSATED for ${data.bookingId}, skipping`);
      return;
    }

    // Best-effort cancel reservation
    if (booking.reservationId) {
      try {
        await this.inventoryClient.cancelReservation(booking.reservationId, correlationId);
      } catch (err) {
        this.logger.error(`PaymentFailed: failed to cancel reservation ${booking.reservationId}: ${(err as Error).message}`);
      }
    }

    booking.fail(data.reason);
    await this.bookingRepo.save(booking);

    if (saga) {
      saga.beginCompensation();
      saga.markCompensated();
      await this.sagaRepo.save(saga);
    }

    const event = new BookingCancelledEvent({
      aggregateId: booking.id,
      correlationId,
      data: {
        travelerId: booking.travelerId,
        reason: data.reason,
        cancelledAt: new Date().toISOString(),
      },
    });

    try {
      await this.publisher.publishBookingCancelled(event);
    } catch (err) {
      this.logger.error(`Failed to publish BookingCancelled: ${(err as Error).message}`);
    }
  }
}
