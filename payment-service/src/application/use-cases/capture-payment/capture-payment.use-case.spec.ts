import { CapturePaymentUseCase } from './capture-payment.use-case';
import { ForbiddenException } from '../detach-payment-method/detach-payment-method.use-case';
import { DomainException, NotFoundException } from '@travel/shared';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';
import { Payment } from '../../../domain/aggregates/payment.aggregate';
import { Money } from '../../../domain/value-objects/money.vo';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const OTHER_UUID = '00000000-0000-4000-8000-000000000099';
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
    idempotencyKey: 'idem-key-001',
    description: null,
    failureReason: null,
    capturedAmount: null,
    refundedAmount: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('CapturePaymentUseCase', () => {
  let useCase: CapturePaymentUseCase;
  let mockRepo: jest.Mocked<any>;
  let mockStripe: jest.Mocked<any>;
  let mockPublisher: jest.Mocked<any>;
  let mockMetrics: jest.Mocked<any>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
    };
    mockStripe = {
      capturePaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_abc', amount_received: 35000 }),
    };
    mockPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    mockMetrics = { incrementPaymentsCaptured: jest.fn() };
    useCase = new CapturePaymentUseCase(mockRepo, mockStripe, mockPublisher, mockMetrics);
  });

  it('should capture AUTHORIZED payment and publish PaymentCaptured event', async () => {
    mockRepo.findById.mockResolvedValue(makePayment(PaymentStatus.AUTHORIZED));

    const result = await useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID });

    expect(result.status).toBe(PaymentStatus.CAPTURED);
    expect(mockPublisher.publish).toHaveBeenCalled();
  });

  it('should return 409 when attempting to capture non-AUTHORIZED payment', async () => {
    mockRepo.findById.mockResolvedValue(makePayment(PaymentStatus.CAPTURED));

    await expect(
      useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }));
  });

  it('should return 403 when traveler attempts to capture another traveler\'s payment', async () => {
    const payment = makePayment(PaymentStatus.AUTHORIZED);
    mockRepo.findById.mockResolvedValue(payment);

    await expect(
      useCase.execute({ paymentId: TEST_UUID, callerTravelerId: OTHER_UUID }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    // Stripe should NOT be called after ownership failure
    expect(mockStripe.capturePaymentIntent).not.toHaveBeenCalled();
  });

  it('should always capture the full authorized amount regardless of any amountToCapture in command', async () => {
    mockRepo.findById.mockResolvedValue(makePayment(PaymentStatus.AUTHORIZED));

    await useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID });

    // Should be called WITHOUT amount_to_capture parameter
    expect(mockStripe.capturePaymentIntent).toHaveBeenCalledWith('pi_abc');
  });

  it('should return 404 when payment not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should still return captured response when Kafka publish fails', async () => {
    mockRepo.findById.mockResolvedValue(makePayment(PaymentStatus.AUTHORIZED));
    mockPublisher.publish.mockRejectedValue(new Error('Kafka down'));

    const result = await useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID });
    expect(result.status).toBe(PaymentStatus.CAPTURED);
  });

  it('should fall back to payment.money.amount when amount_received is undefined', async () => {
    mockRepo.findById.mockResolvedValue(makePayment(PaymentStatus.AUTHORIZED));
    mockStripe.capturePaymentIntent.mockResolvedValue({ id: 'pi_abc' }); // no amount_received

    const result = await useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID });
    expect(result.capturedAmount).toBe(350);
  });
});
