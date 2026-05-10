import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import CircuitBreaker from 'opossum';
import { MetricsService } from '../observability/metrics.service';

export class PaymentDeclinedException extends Error {
  constructor(
    readonly code: string,
    readonly declineCode: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'PaymentDeclinedException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StripeCircuitOpenException extends Error {
  constructor() {
    super('Stripe service temporarily unavailable (circuit open)');
    this.name = 'StripeCircuitOpenException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class StripeProcessingException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StripeProcessingException';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

const NON_RETRYABLE_CODES = new Set([400, 402, 403, 404]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 5000;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => global.setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * ms * 0.3);
}

@Injectable()
export class StripeClientService {
  private readonly logger = new Logger(StripeClientService.name);
  private readonly stripe: Stripe;
  private readonly breaker: CircuitBreaker<[() => Promise<unknown>], unknown>;

  constructor(
    private readonly config: ConfigService,
    private readonly metrics: MetricsService,
  ) {
    this.stripe = new Stripe(this.config.get<string>('STRIPE_SECRET_KEY') ?? '', {
      apiVersion: '2023-10-16',
      timeout: 15000,
      maxNetworkRetries: 0, // we handle retries ourselves
    });

    this.breaker = new CircuitBreaker(
      (fn: () => Promise<unknown>) => fn(),
      {
        errorThresholdPercentage: 50,
        volumeThreshold: 10,
        timeout: 15000,
        resetTimeout: 30000,
      },
    );

    this.breaker.on('open', () => {
      this.logger.warn('Stripe circuit breaker OPENED');
      this.metrics.setCircuitState('stripe', 1);
    });
    this.breaker.on('halfOpen', () => {
      this.logger.log('Stripe circuit breaker HALF-OPEN');
    });
    this.breaker.on('close', () => {
      this.logger.log('Stripe circuit breaker CLOSED');
      this.metrics.setCircuitState('stripe', 0);
    });
  }

  private async withRetry<T>(
    operation: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await this.breaker.fire(fn) as T;
        this.metrics.incrementStripeApiCalls(operation, 'success');
        return result;
      } catch (err: unknown) {
        lastError = err;

        if (this.breaker.opened) {
          this.metrics.incrementStripeApiErrors(operation, 'circuit_open');
          throw new StripeCircuitOpenException();
        }

        if (err instanceof Stripe.errors.StripeError) {
          const statusCode = err.statusCode ?? 0;

          if (statusCode === 402) {
            this.metrics.incrementStripeApiErrors(operation, 'card_declined');
            this.metrics.incrementStripeApiCalls(operation, 'declined');
            throw new PaymentDeclinedException(
              err.code ?? 'payment_failed',
              (err as Stripe.errors.StripeCardError).decline_code,
              err.message,
            );
          }

          if (NON_RETRYABLE_CODES.has(statusCode)) {
            this.metrics.incrementStripeApiErrors(operation, `http_${statusCode}`);
            throw new StripeProcessingException(err.message);
          }

          if (attempt < MAX_RETRIES) {
            const backoff = jitter(Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS));
            this.logger.warn(`Stripe ${operation} attempt ${attempt + 1} failed (${statusCode}), retrying in ${backoff}ms`);
            this.metrics.incrementRetryCount(operation, 'retry');
            await delay(backoff);
            continue;
          }
        }

        if (attempt < MAX_RETRIES) {
          const backoff = jitter(Math.min(BASE_DELAY_MS * Math.pow(2, attempt), MAX_DELAY_MS));
          this.metrics.incrementRetryCount(operation, 'retry');
          await delay(backoff);
          continue;
        }
      }
    }

    this.metrics.incrementStripeApiErrors(operation, 'max_retries');
    throw new StripeProcessingException(
      `Stripe ${operation} failed after ${MAX_RETRIES} retries: ${String(lastError)}`,
    );
  }

  async createPaymentIntent(
    params: Stripe.PaymentIntentCreateParams,
    idempotencyKey: string,
  ): Promise<Stripe.PaymentIntent> {
    return this.withRetry('createPaymentIntent', () =>
      this.stripe.paymentIntents.create(
        { ...params, capture_method: 'manual' },
        { idempotencyKey },
      ),
    );
  }

  async capturePaymentIntent(stripePaymentIntentId: string): Promise<Stripe.PaymentIntent> {
    return this.withRetry('capturePaymentIntent', () =>
      this.stripe.paymentIntents.capture(stripePaymentIntentId),
    );
  }

  async createRefund(
    stripePaymentIntentId: string,
    amount: number | undefined,
    reason: Stripe.RefundCreateParams.Reason,
  ): Promise<Stripe.Refund> {
    return this.withRetry('createRefund', () =>
      this.stripe.refunds.create({
        payment_intent: stripePaymentIntentId,
        ...(amount !== undefined && { amount: Math.round(amount * 100) }),
        reason,
      }),
    );
  }

  async detachPaymentMethod(stripePaymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return this.withRetry('detachPaymentMethod', () =>
      this.stripe.paymentMethods.detach(stripePaymentMethodId),
    );
  }

  // NOT wrapped by circuit breaker — pure HMAC verification, no network call
  constructWebhookEvent(
    rawBody: Buffer | string,
    signature: string,
    secret: string,
  ): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  // Expose breaker for testing
  get circuitBreaker(): CircuitBreaker<[() => Promise<unknown>], unknown> {
    return this.breaker;
  }
}
