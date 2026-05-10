import { GetPaymentUseCase } from './get-payment.use-case';
import { NotFoundException } from '@travel/shared';
import { ForbiddenException } from '../detach-payment-method/detach-payment-method.use-case';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';
import { Payment } from '../../../domain/aggregates/payment.aggregate';
import { Money } from '../../../domain/value-objects/money.vo';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const OTHER_UUID = '00000000-0000-4000-8000-000000000099';
const BOOKING_UUID = '00000000-0000-4000-8000-000000000002';
const METHOD_UUID = '00000000-0000-4000-8000-000000000003';

function makePayment(): Payment {
  return Payment.reconstitute({
    id: TEST_UUID,
    travelerId: TEST_UUID,
    bookingId: BOOKING_UUID,
    paymentMethodId: METHOD_UUID,
    money: new Money(350, 'USD'),
    status: PaymentStatus.CAPTURED,
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

describe('GetPaymentUseCase', () => {
  let useCase: GetPaymentUseCase;
  let mockRepo: jest.Mocked<any>;

  beforeEach(() => {
    mockRepo = { findById: jest.fn() };
    useCase = new GetPaymentUseCase(mockRepo);
  });

  it('should return payment details without Stripe fields for the authenticated owner', async () => {
    mockRepo.findById.mockResolvedValue(makePayment());

    const result = await useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID });

    expect(result.paymentId).toBe(TEST_UUID);
    expect(result.status).toBe(PaymentStatus.CAPTURED);
    expect(result).not.toHaveProperty('stripePaymentIntentId');
    expect(result).not.toHaveProperty('stripePaymentMethodId');
  });

  it('should return 403 when traveler attempts to retrieve another traveler\'s payment', async () => {
    mockRepo.findById.mockResolvedValue(makePayment());

    await expect(
      useCase.execute({ paymentId: TEST_UUID, callerTravelerId: OTHER_UUID }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should throw NotFoundException when payment does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(
      useCase.execute({ paymentId: TEST_UUID, callerTravelerId: TEST_UUID }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
