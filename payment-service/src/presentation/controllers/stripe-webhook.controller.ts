import {
  Controller,
  Post,
  Headers,
  RawBodyRequest,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PaymentStatus } from '../../domain/value-objects/payment-status.enum';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../domain/repositories/payment.repository.interface';
import { StripeClientService } from '../../infrastructure/stripe/stripe-client.service';
import { PaymentEventPublisher } from '../../infrastructure/events/payment-event.publisher';
import { Inject } from '@nestjs/common';
import Stripe from 'stripe';

@Controller('webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripeClient: StripeClientService,
    private readonly config: ConfigService,
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: IPaymentRepository,
    private readonly eventPublisher: PaymentEventPublisher,
  ) {}

  @Post('stripe')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const rawBody = req.rawBody;
    if (!rawBody || !signature) {
      throw new BadRequestException('Missing Stripe-Signature header or raw body');
    }

    const webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET') ?? '';

    let event: Stripe.Event;
    try {
      event = this.stripeClient.constructWebhookEvent(rawBody, signature, webhookSecret);
    } catch (err: unknown) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(err)}`);
      throw new BadRequestException('Invalid Stripe-Signature');
    }

    await this.processEvent(event);
    return { received: true };
  }

  private async processEvent(event: Stripe.Event): Promise<void> {
    this.logger.debug(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event);
        break;
      case 'payment_intent.canceled':
        await this.handlePaymentCancelled(event);
        break;
      default:
        this.logger.debug(`Unhandled Stripe event type: ${event.type} — returning 200`);
    }
  }

  private async handlePaymentFailed(event: Stripe.Event): Promise<void> {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await this.paymentRepo.findByStripePaymentIntentId(intent.id);
    if (payment === null) {
      this.logger.warn(`Payment not found for stripe PI ${intent.id} on payment_intent.payment_failed`);
      return;
    }

    // Deduplication: already in target state
    if (payment.status === PaymentStatus.FAILED) {
      this.logger.debug(`Payment ${payment.paymentId} already FAILED — skipping`);
      return;
    }

    // If already in a state that cannot transition to FAILED, log and skip
    if (
      payment.status !== PaymentStatus.PENDING &&
      payment.status !== PaymentStatus.AUTHORIZED
    ) {
      this.logger.warn(
        `Unexpected state ${payment.status} for payment_intent.payment_failed on ${payment.paymentId}`,
      );
      return;
    }

    const failureMessage =
      intent.last_payment_error?.message ?? 'Payment failed via Stripe webhook';
    payment.markFailed(failureMessage);
    await this.paymentRepo.save(payment);

    for (const domainEvent of payment.getUncommittedEvents()) {
      try {
        await this.eventPublisher.publish(domainEvent as any);
      } catch (err: unknown) {
        this.logger.warn(`Kafka publish failed on webhook payment_intent.payment_failed: ${String(err)}`);
      }
    }
  }

  private async handlePaymentCancelled(event: Stripe.Event): Promise<void> {
    const intent = event.data.object as Stripe.PaymentIntent;
    const payment = await this.paymentRepo.findByStripePaymentIntentId(intent.id);
    if (payment === null) {
      this.logger.warn(`Payment not found for stripe PI ${intent.id} on payment_intent.canceled`);
      return;
    }

    // Deduplication: already CANCELLED
    if (payment.status === PaymentStatus.CANCELLED) {
      this.logger.debug(`Payment ${payment.paymentId} already CANCELLED — skipping`);
      return;
    }

    if (payment.status !== PaymentStatus.AUTHORIZED) {
      this.logger.warn(
        `Unexpected state ${payment.status} for payment_intent.canceled on ${payment.paymentId}`,
      );
      return;
    }

    payment.markCancelled();
    await this.paymentRepo.save(payment);
    // No Kafka event for CANCELLED (per design.md §7, AC-006-5)
  }
}
