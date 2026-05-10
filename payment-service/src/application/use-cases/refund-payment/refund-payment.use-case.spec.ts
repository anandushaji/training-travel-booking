import { RefundPaymentUseCase } from './refund-payment.use-case';
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
    capturedAmount: 350,
    refundedAmount: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('RefundPaymentUseCase', () => {
  let useCase: RefundPaymentUseCase;
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
      createRefund: jest.fn().mockResolvedValue({ amount: 35000 }),
    };
    mockPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    mockMetrics = { incrementPaymentsRefunded: jest.fn() };
    useCase = new RefundPaymentUseCase(mockRepo, mockStripe, mockPublisher, mockMetrics);
  });

  it('should refund CAPTURED payment and publish PaymentRefunded event', async () => {
    mockRepo.findById.mockResolvedValue(makePayment(PaymentStatus.CAPTURED));

    const result = await useCase.execute({
      paymentId: TEST_UUID,
      callerTravelerId: TEST_UUID,
      reason: 'requested_by_customer',
    });

    expect(result.status).toBe(PaymentStatus.REFUNDED);
    expect(mockPublisher.publish).toHaveBeenCalled();
  });

  it('should return 409 when attempting to refund non-CAPTURED payment', async () => {
    mockRepo.findById.mockResolvedValue(makePayment(PaymentStatus.AUTHORIZED));

    await expect(
      useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID, reason: 'requested_by_customer' }),
    ).rejects.toThrow(expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }));
  });

  it('should return 403 when traveler attempts to refund another traveler\'s payment', async () => {
    const payment = makePayment(PaymentStatus.CAPTURED);
    mockRepo.findById.mockResolvedValue(payment);

    await expect(
      useCase.execute({ paymentId: TEST_UUID, callerTravelerId: OTHER_UUID, reason: 'requested_by_customer' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(mockStripe.createRefund).not.toHaveBeenCalled();
  });

  it('should return 404 when payment not found', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(
      useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID, reason: 'requested_by_customer' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should still return refunded response when Kafka publish fails', async () => {
    mockRepo.findById.mockResolvedValue(makePayment(PaymentStatus.CAPTURED));
    mockPublisher.publish.mockRejectedValue(new Error('Kafka down'));

    const result = await useCase.execute({
      paymentId: TEST_UUID,
      callerTravelerId: TEST_UUID,
      reason: 'requested_by_customer',
    });
    expect(result.status).toBe(PaymentStatus.REFUNDED);
  });
});
