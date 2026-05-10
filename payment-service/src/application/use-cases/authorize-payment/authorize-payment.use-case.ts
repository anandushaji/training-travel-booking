import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConflictException, NotFoundException } from '@travel/shared';
import { Payment } from '../../../domain/aggregates/payment.aggregate';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../domain/repositories/payment.repository.interface';
import {
  IPaymentMethodRepository,
  PAYMENT_METHOD_REPOSITORY,
} from '../../../domain/repositories/payment-method.repository.interface';
import { StripeClientService, PaymentDeclinedException, StripeCircuitOpenException } from '../../../infrastructure/stripe/stripe-client.service';
import { PaymentEventPublisher } from '../../../infrastructure/events/payment-event.publisher';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { ForbiddenException } from '../detach-payment-method/detach-payment-method.use-case';
import {
  AuthorizePaymentCommand,
  AuthorizePaymentResponseDto,
} from './authorize-payment.command';

export class PaymentProcessingException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentProcessingException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

@Injectable()
export class AuthorizePaymentUseCase {
  private readonly logger = new Logger(AuthorizePaymentUseCase.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: IPaymentRepository,
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: IPaymentMethodRepository,
    private readonly stripeClient: StripeClientService,
    private readonly eventPublisher: PaymentEventPublisher,
    private readonly metrics: MetricsService,
  ) {}

  async execute(command: AuthorizePaymentCommand): Promise<{ payment: AuthorizePaymentResponseDto; isNew: boolean }> {
    if (!command.idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    // Step 2: Check idempotency
    const existing = await this.paymentRepo.findByIdempotencyKey(command.idempotencyKey);
    if (existing !== null) {
      if (existing.status === PaymentStatus.PENDING) {
        throw new ConflictException(
          `Payment with idempotency key ${command.idempotencyKey} is already in-flight.`,
          'PAYMENT_IN_FLIGHT',
        );
      }
      return {
        payment: this.toResponse(existing),
        isNew: false,
      };
    }

    // Step 3: Validate paymentMethodId belongs to the caller
    const method = await this.paymentMethodRepo.findById(command.paymentMethodId);
    if (method === null) {
      throw new NotFoundException(
        `Payment method ${command.paymentMethodId} not found.`,
        { code: 'PAYMENT_METHOD_NOT_FOUND' },
      );
    }
    if (method.travelerId !== command.travelerId) {
      throw new ForbiddenException(
        `Payment method ${command.paymentMethodId} does not belong to the caller.`,
      );
    }

    // Step 4: Create Payment aggregate in PENDING status
    const payment = Payment.create({
      travelerId: command.travelerId,
      bookingId: command.bookingId,
      paymentMethodId: command.paymentMethodId,
      amount: command.amount,
      currency: command.currency,
      idempotencyKey: command.idempotencyKey,
      ...(command.description !== undefined && { description: command.description }),
      ...(command.correlationId !== undefined && { correlationId: command.correlationId }),
    });

    // Step 5: Call Stripe
    try {
      const intent = await this.stripeClient.createPaymentIntent(
        {
          amount: Math.round(command.amount * 100), // Stripe expects cents
          currency: command.currency.toLowerCase(),
          payment_method: method.stripePaymentMethodId,
          confirm: true,
          ...(command.description !== undefined && { description: command.description }),
        },
        command.idempotencyKey,
      );

      // Step 6: Authorize aggregate
      payment.authorize(intent.id, command.correlationId);

      // Step 7: Save
      await this.paymentRepo.save(payment);
      this.metrics.incrementPaymentsCreated(command.currency);

      // Step 8: Publish event (non-fatal)
      const events = payment.getUncommittedEvents();
      for (const event of events) {
        try {
          await this.eventPublisher.publish(event as any);
        } catch (kafkaErr: unknown) {
          this.logger.warn(`Kafka publish failed for PaymentAuthorized ${payment.paymentId}: ${String(kafkaErr)}`);
        }
      }

      return { payment: this.toResponse(payment), isNew: true };

    } catch (err: unknown) {
      if (err instanceof PaymentDeclinedException) {
        payment.markFailed(err.code, command.correlationId);
        await this.paymentRepo.save(payment);
        try {
          for (const event of payment.getUncommittedEvents()) {
            await this.eventPublisher.publish(event as any);
          }
        } catch (kafkaErr: unknown) {
          this.logger.warn(`Kafka publish failed for PaymentFailed: ${String(kafkaErr)}`);
        }
        throw err;
      }

      if (err instanceof StripeCircuitOpenException) {
        throw new PaymentProcessingException(err.message);
      }

      throw err;
    }
  }

  private toResponse(payment: Payment): AuthorizePaymentResponseDto {
    return {
      paymentId: payment.paymentId,
      status: payment.status,
      amount: payment.money.amount,
      currency: payment.money.currency,
      bookingId: payment.bookingId,
      stripePaymentIntentId: payment.stripePaymentIntentId ?? '',
      createdAt: payment.createdAt,
    };
  }
}
