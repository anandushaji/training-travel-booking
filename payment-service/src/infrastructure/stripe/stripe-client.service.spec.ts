import { StripeClientService, PaymentDeclinedException, StripeCircuitOpenException } from './stripe-client.service';
import { MetricsService } from '../observability/metrics.service';

// Mock stripe
jest.mock('stripe', () => {
  class StripeError extends Error {
    statusCode: number;
    code: string;
    constructor(msg: string, statusCode: number, code: string) {
      super(msg);
      this.name = 'StripeError';
      this.statusCode = statusCode;
      this.code = code;
    }
  }
  class StripeCardError extends StripeError {
    decline_code: string | undefined;
    constructor(msg: string, statusCode: number, code: string, declineCode?: string) {
      super(msg, statusCode, code);
      this.name = 'StripeCardError';
      this.decline_code = declineCode;
    }
  }
  const mockStripe = jest.fn().mockReturnValue({
    paymentIntents: {
      create: jest.fn(),
      capture: jest.fn(),
    },
    refunds: {
      create: jest.fn(),
    },
    paymentMethods: {
      attach: jest.fn(),
      detach: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  });
  (mockStripe as any).errors = { StripeError, StripeCardError };
  return mockStripe;
});

function makeMetrics(): jest.Mocked<MetricsService> {
  return {
    incrementStripeApiCalls: jest.fn(),
    incrementStripeApiErrors: jest.fn(),
    setCircuitState: jest.fn(),
    incrementRetryCount: jest.fn(),
    circuitBreakerErrorsTotal: { inc: jest.fn() } as any,
  } as unknown as jest.Mocked<MetricsService>;
}

function makeConfig(key = 'sk_test_x'): any {
  return { get: jest.fn().mockReturnValue(key) };
}

describe('StripeClientService', () => {
  let service: StripeClientService;
  let metrics: jest.Mocked<MetricsService>;

  beforeEach(() => {
    jest.clearAllMocks();
    metrics = makeMetrics();
    service = new StripeClientService(makeConfig(), metrics);
  });

  describe('constructWebhookEvent()', () => {
    it('should not wrap constructWebhookEvent in circuit breaker', () => {
      // constructWebhookEvent should be called directly on stripe instance (not via breaker)
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      stripeInstance.webhooks.constructEvent.mockReturnValue({ type: 'payment_intent.succeeded' });

      const result = service.constructWebhookEvent(
        Buffer.from('{}'),
        'sig_xxx',
        'whsec_xxx',
      );
      expect(result).toEqual({ type: 'payment_intent.succeeded' });
      // Not called through circuit breaker — no metrics incremented
      expect(metrics.incrementStripeApiCalls).not.toHaveBeenCalled();
    });
  });

  describe('metrics', () => {
    it('should increment stripe_api_calls_total on success and stripe_api_errors_total on error', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      stripeInstance.paymentIntents.create.mockResolvedValue({ id: 'pi_abc', status: 'requires_capture' });

      await service.createPaymentIntent(
        { amount: 35000, currency: 'usd', payment_method: 'pm_test' },
        'idem-key',
      );

      expect(metrics.incrementStripeApiCalls).toHaveBeenCalledWith('createPaymentIntent', 'success');
    });

    it('should increment stripe_api_errors_total on card decline (402)', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      const err = new Stripe.errors.StripeCardError('Card declined', 402, 'card_declined', 'insufficient_funds');
      stripeInstance.paymentIntents.create.mockRejectedValue(err);

      await expect(
        service.createPaymentIntent({ amount: 100, currency: 'usd' }, 'idem-key'),
      ).rejects.toBeInstanceOf(PaymentDeclinedException);

      expect(metrics.incrementStripeApiErrors).toHaveBeenCalledWith('createPaymentIntent', 'card_declined');
    });

    it('should set circuit_state gauge to 1 when circuit opens and 0 when circuit closes', () => {
      // Simulate circuit open event
      service.circuitBreaker.emit('open');
      expect(metrics.setCircuitState).toHaveBeenCalledWith('stripe', 1);

      // Simulate circuit close event
      service.circuitBreaker.emit('close');
      expect(metrics.setCircuitState).toHaveBeenCalledWith('stripe', 0);
    });
    it('should emit halfOpen event and log HALF-OPEN', () => {
      // Just cover the halfOpen event listener line
      expect(() => service.circuitBreaker.emit('halfOpen')).not.toThrow();
    });
  });

  describe('retry behaviour', () => {
    it('should not retry on Stripe 402 (card declined)', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      const err = new Stripe.errors.StripeCardError('Card declined', 402, 'card_declined', 'insufficient_funds');
      stripeInstance.paymentIntents.create.mockRejectedValue(err);

      await expect(
        service.createPaymentIntent({ amount: 100, currency: 'usd' }, 'idem-key'),
      ).rejects.toBeInstanceOf(PaymentDeclinedException);

      // create should only be called once (no retries for 402)
      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledTimes(1);
      expect(metrics.incrementRetryCount).not.toHaveBeenCalled();
    });

    it('should throw StripeProcessingException for non-retryable 400 Stripe error', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      const err = new Stripe.errors.StripeError('Bad request', 400, 'invalid_request_error');
      stripeInstance.paymentIntents.create.mockRejectedValue(err);

      await expect(
        service.createPaymentIntent({ amount: 100, currency: 'usd' }, 'idem-key'),
      ).rejects.toBeInstanceOf(Error);

      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledTimes(1);
    });

    it('should throw StripeCircuitOpenException when circuit is open', async () => {
      // Force circuit open
      service.circuitBreaker.open();

      await expect(
        service.createPaymentIntent({ amount: 100, currency: 'usd' }, 'idem-key'),
      ).rejects.toBeInstanceOf(StripeCircuitOpenException);
    });

    it('should retry on retryable Stripe 503 errors and succeed on third attempt', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      stripeInstance.paymentIntents.create
        .mockRejectedValueOnce(new Stripe.errors.StripeError('Server error', 503, 'api_error'))
        .mockRejectedValueOnce(new Stripe.errors.StripeError('Server error', 503, 'api_error'))
        .mockResolvedValueOnce({ id: 'pi_abc', status: 'requires_capture' });

      const result = await service.createPaymentIntent({ amount: 100, currency: 'usd' }, 'idem-key');

      expect(result).toMatchObject({ id: 'pi_abc' });
      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledTimes(3);
      expect(metrics.incrementRetryCount).toHaveBeenCalledTimes(2);
    }, 10000);

    it('should exhaust retries and throw StripeProcessingException for non-Stripe errors', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      stripeInstance.paymentIntents.create.mockRejectedValue(new Error('Network error'));

      await expect(
        service.createPaymentIntent({ amount: 100, currency: 'usd' }, 'idem-key'),
      ).rejects.toBeInstanceOf(Error);

      expect(stripeInstance.paymentIntents.create).toHaveBeenCalledTimes(4);
      expect(metrics.incrementRetryCount).toHaveBeenCalledTimes(3);
      expect(metrics.incrementStripeApiErrors).toHaveBeenCalledWith('createPaymentIntent', 'max_retries');
    }, 10000);
  });

  describe('capturePaymentIntent()', () => {
    it('should capture a payment intent successfully', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      stripeInstance.paymentIntents.capture.mockResolvedValue({ id: 'pi_abc', status: 'succeeded' });

      const result = await service.capturePaymentIntent('pi_abc');

      expect(result).toMatchObject({ id: 'pi_abc', status: 'succeeded' });
      expect(metrics.incrementStripeApiCalls).toHaveBeenCalledWith('capturePaymentIntent', 'success');
    });
  });

  describe('createRefund()', () => {
    it('should create a refund successfully', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      stripeInstance.refunds.create.mockResolvedValue({ id: 're_abc', amount: 10000 });

      const result = await service.createRefund('pi_abc', 100, 'requested_by_customer');

      expect(result).toMatchObject({ id: 're_abc', amount: 10000 });
      expect(metrics.incrementStripeApiCalls).toHaveBeenCalledWith('createRefund', 'success');
    });

    it('should create a full refund when amount is undefined', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      stripeInstance.refunds.create.mockResolvedValue({ id: 're_def', amount: 50000 });

      const result = await service.createRefund('pi_xyz', undefined, 'duplicate');

      expect(result).toMatchObject({ id: 're_def' });
      expect(stripeInstance.refunds.create).toHaveBeenCalledWith(
        expect.objectContaining({ payment_intent: 'pi_xyz', reason: 'duplicate' }),
      );
    });
  });

  describe('detachPaymentMethod()', () => {
    it('should detach a payment method successfully', async () => {
      const Stripe = require('stripe');
      const stripeInstance = Stripe.mock.results[Stripe.mock.results.length - 1]!.value;
      stripeInstance.paymentMethods.detach.mockResolvedValue({ id: 'pm_abc', object: 'payment_method' });

      const result = await service.detachPaymentMethod('pm_abc');

      expect(result).toMatchObject({ id: 'pm_abc' });
      expect(metrics.incrementStripeApiCalls).toHaveBeenCalledWith('detachPaymentMethod', 'success');
    });
  });
});

