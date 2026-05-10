import { Inject, Injectable, Logger } from '@nestjs/common';
import { NotFoundException, DomainException } from '@travel/shared';
import Stripe from 'stripe';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../domain/repositories/payment.repository.interface';
import { StripeClientService } from '../../../infrastructure/stripe/stripe-client.service';
import { PaymentEventPublisher } from '../../../infrastructure/events/payment-event.publisher';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { ForbiddenException } from '../detach-payment-method/detach-payment-method.use-case';
import { RefundPaymentCommand, RefundPaymentResponseDto } from './refund-payment.command';

type StripeRefundReason = Stripe.RefundCreateParams.Reason;

@Injectable()
export class RefundPaymentUseCase {
  private readonly logger = new Logger(RefundPaymentUseCase.name);

  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: IPaymentRepository,
    private readonly stripeClient: StripeClientService,
    private readonly eventPublisher: PaymentEventPublisher,
    private readonly metrics: MetricsService,
  ) {}

  async execute(command: RefundPaymentCommand): Promise<RefundPaymentResponseDto> {
    const payment = await this.paymentRepo.findById(command.paymentId);
    if (payment === null) {
      throw new NotFoundException(
        `Payment ${command.paymentId} not found.`,
        { code: 'PAYMENT_NOT_FOUND' },
      );
    }

    // Ownership check BEFORE state check
    if (payment.travelerId !== command.callerTravelerId) {
      throw new ForbiddenException(
        `Payment ${command.paymentId} does not belong to the caller.`,
      );
    }

    // State check
    if (payment.status !== PaymentStatus.CAPTURED) {
      throw new DomainException(
        `Cannot refund payment in status ${payment.status}`,
        'INVALID_STATE_TRANSITION',
        409,
        { currentStatus: payment.status },
      );
    }

    const refund = await this.stripeClient.createRefund(
      payment.stripePaymentIntentId!,
      command.amount,
      command.reason as StripeRefundReason,
    );

    const refundedAmount = refund.amount / 100;
    payment.markRefunded(refundedAmount, command.reason, command.correlationId);
    await this.paymentRepo.save(payment);
    this.metrics.incrementPaymentsRefunded(payment.money.currency);

    for (const event of payment.getUncommittedEvents()) {
      try {
        await this.eventPublisher.publish(event as any);
      } catch (err: unknown) {
        this.logger.warn(`Kafka publish failed for PaymentRefunded: ${String(err)}`);
      }
    }

    return {
      paymentId: payment.paymentId,
      status: payment.status,
      refundedAmount,
      currency: payment.money.currency,
    };
  }
}
