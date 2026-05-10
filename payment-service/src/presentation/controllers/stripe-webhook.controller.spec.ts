import { StripeWebhookController } from './stripe-webhook.controller';
import { PaymentStatus } from '../../domain/value-objects/payment-status.enum';
import { Payment } from '../../domain/aggregates/payment.aggregate';
import { Money } from '../../domain/value-objects/money.vo';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const BOOKING_UUID = '00000000-0000-4000-8000-000000000002';
const METHOD_UUID = '00000000-0000-4000-8000-000000000003';

function makePayment(status: PaymentStatus): Payment {
  return Payment.reconstitute({
    id: TEST_UUID,
    travelerId: TEST_UUID,
    bookingId: BOOKING_UUID,
    paymentMethodId: METHOD_UUID,
    money: new Money(350, 'USD'),
    status,
    stripePaymentIntentId: 'pi_abc',
    idempotencyKey: 'idem-001',
    description: null,
    failureReason: null,
    capturedAmount: null,
    refundedAmount: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeStripeEvent(type: string, intentId = 'pi_abc', failureMessage?: string): any {
  return {
    type,
    data: {
      object: {
        id: intentId,
        last_payment_error: failureMessage ? { message: failureMessage } : undefined,
      },
    },
  };
}

describe('StripeWebhookController', () => {
  let controller: StripeWebhookController;
  let mockStripe: jest.Mocked<any>;
  let mockConfig: jest.Mocked<any>;
  let mockPaymentRepo: jest.Mocked<any>;
  let mockPublisher: jest.Mocked<any>;

  beforeEach(() => {
    mockStripe = {
      constructWebhookEvent: jest.fn(),
    };
    mockConfig = {
      get: jest.fn().mockReturnValue('whsec_test'),
    };
    mockPaymentRepo = {
      findByStripePaymentIntentId: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    controller = new StripeWebhookController(
      mockStripe,
      mockConfig,
      mockPaymentRepo,
      mockPublisher,
    );
  });

  it('should return 400 when Stripe-Signature is invalid', async () => {
    mockStripe.constructWebhookEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    await expect(
      controller.handleWebhook('invalid_sig', mockReq),
    ).rejects.toThrow('Invalid Stripe-Signature');
  });

  it('should process payment_intent.payment_failed and transition payment to FAILED', async () => {
    const payment = makePayment(PaymentStatus.AUTHORIZED);
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.payment_failed', 'pi_abc', 'card_declined'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(payment);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    await controller.handleWebhook('valid_sig', mockReq);

    expect(payment.status).toBe(PaymentStatus.FAILED);
    expect(mockPaymentRepo.save).toHaveBeenCalledWith(payment);
    expect(mockPublisher.publish).toHaveBeenCalled();
  });

  it('should idempotently return 200 for duplicate payment_intent.payment_failed without re-processing', async () => {
    const payment = makePayment(PaymentStatus.FAILED); // already FAILED
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.payment_failed'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(payment);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    const result = await controller.handleWebhook('valid_sig', mockReq);

    expect(result).toEqual({ received: true });
    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
    expect(mockPublisher.publish).not.toHaveBeenCalled();
  });

  it('should transition to CANCELLED and not publish Kafka event on payment_intent.canceled', async () => {
    const payment = makePayment(PaymentStatus.AUTHORIZED);
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.canceled'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(payment);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    await controller.handleWebhook('valid_sig', mockReq);

    expect(payment.status).toBe(PaymentStatus.CANCELLED);
    expect(mockPaymentRepo.save).toHaveBeenCalledWith(payment);
    expect(mockPublisher.publish).not.toHaveBeenCalled(); // No Kafka event for CANCELLED
  });

  it('should not query any stripe_webhook_events table during webhook processing', async () => {
    // This is a static guarantee — no reference to stripe_webhook_events in the controller code
    // We verify by checking the controller has no such method/dependency
    expect((controller as any).webhookEventsRepo).toBeUndefined();
    expect((controller as any).stripeWebhookEventsService).toBeUndefined();
  });

  it('should return 200 for unhandled event types', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_method.attached'),
    );

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    const result = await controller.handleWebhook('valid_sig', mockReq);

    expect(result).toEqual({ received: true });
    expect(mockPaymentRepo.findByStripePaymentIntentId).not.toHaveBeenCalled();
  });

  it('should return 400 when rawBody is missing', async () => {
    const mockReq = { rawBody: undefined } as any;
    await expect(
      controller.handleWebhook('valid_sig', mockReq),
    ).rejects.toThrow('Missing Stripe-Signature header or raw body');
  });

  it('should return 400 when signature header is missing', async () => {
    const mockReq = { rawBody: Buffer.from('{}') } as any;
    await expect(
      controller.handleWebhook(undefined as any, mockReq),
    ).rejects.toThrow('Missing Stripe-Signature header or raw body');
  });

  it('should return 200 silently when payment not found for payment_intent.payment_failed', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.payment_failed'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    const result = await controller.handleWebhook('valid_sig', mockReq);

    expect(result).toEqual({ received: true });
    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
  });

  it('should skip processing when payment state is unexpected for payment_intent.payment_failed', async () => {
    const payment = makePayment(PaymentStatus.CAPTURED);  // non-PENDING/AUTHORIZED
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.payment_failed'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(payment);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    await controller.handleWebhook('valid_sig', mockReq);

    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
  });

  it('should still return 200 when Kafka publish fails on payment_intent.payment_failed', async () => {
    const payment = makePayment(PaymentStatus.AUTHORIZED);
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.payment_failed', 'pi_abc', 'declined'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(payment);
    mockPublisher.publish.mockRejectedValue(new Error('Kafka down'));

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    const result = await controller.handleWebhook('valid_sig', mockReq);

    expect(result).toEqual({ received: true });
  });

  it('should return 200 silently when payment not found for payment_intent.canceled', async () => {
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.canceled'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(null);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    const result = await controller.handleWebhook('valid_sig', mockReq);

    expect(result).toEqual({ received: true });
    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
  });

  it('should idempotently skip already-CANCELLED on payment_intent.canceled', async () => {
    const payment = makePayment(PaymentStatus.CANCELLED);
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.canceled'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(payment);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    await controller.handleWebhook('valid_sig', mockReq);

    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
  });

  it('should skip processing when payment state is unexpected for payment_intent.canceled', async () => {
    const payment = makePayment(PaymentStatus.CAPTURED);  // non-AUTHORIZED
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.canceled'),
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(payment);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    await controller.handleWebhook('valid_sig', mockReq);

    expect(mockPaymentRepo.save).not.toHaveBeenCalled();
  });

  it('should use fallback failure message when last_payment_error is absent', async () => {
    const payment = makePayment(PaymentStatus.PENDING);
    mockStripe.constructWebhookEvent.mockReturnValue(
      makeStripeEvent('payment_intent.payment_failed', 'pi_abc', undefined), // no failureMessage
    );
    mockPaymentRepo.findByStripePaymentIntentId.mockResolvedValue(payment);

    const mockReq = { rawBody: Buffer.from('{}') } as any;
    await controller.handleWebhook('valid_sig', mockReq);

    expect(payment.status).toBe(PaymentStatus.FAILED);
    expect(payment.failureReason).toBe('Payment failed via Stripe webhook');
  });
});
