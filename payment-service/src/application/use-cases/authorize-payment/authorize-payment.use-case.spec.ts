import { AuthorizePaymentUseCase, PaymentProcessingException } from './authorize-payment.use-case';
import { PaymentDeclinedException, StripeCircuitOpenException } from '../../../infrastructure/stripe/stripe-client.service';
import { ConflictException, NotFoundException } from '@travel/shared';
import { BadRequestException } from '@nestjs/common';
import { ForbiddenException } from '../detach-payment-method/detach-payment-method.use-case';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';
import { Payment } from '../../../domain/aggregates/payment.aggregate';
import { Money } from '../../../domain/value-objects/money.vo';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const BOOKING_UUID = '00000000-0000-4000-8000-000000000002';
const METHOD_UUID = '00000000-0000-4000-8000-000000000003';

function makeAuthorizedPayment(): Payment {
  return Payment.reconstitute({
    id: TEST_UUID,
    travelerId: TEST_UUID,
    bookingId: BOOKING_UUID,
    paymentMethodId: METHOD_UUID,
    money: new Money(350, 'USD'),
    status: PaymentStatus.AUTHORIZED,
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

describe('AuthorizePaymentUseCase', () => {
  let useCase: AuthorizePaymentUseCase;
  let mockPaymentRepo: jest.Mocked<any>;
  let mockMethodRepo: jest.Mocked<any>;
  let mockStripe: jest.Mocked<any>;
  let mockPublisher: jest.Mocked<any>;
  let mockMetrics: jest.Mocked<any>;

  const baseCommand = {
    travelerId: TEST_UUID,
    bookingId: BOOKING_UUID,
    paymentMethodId: METHOD_UUID,
    amount: 350,
    currency: 'USD',
    idempotencyKey: 'idem-key-001',
  };

  const mockMethod = {
    paymentMethodId: METHOD_UUID,
    travelerId: TEST_UUID,
    stripePaymentMethodId: 'pm_test_visa4242',
    isActive: true,
  };

  beforeEach(() => {
    mockPaymentRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findByIdempotencyKey: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
    };
    mockMethodRepo = {
      findById: jest.fn().mockResolvedValue(mockMethod),
    };
    mockStripe = {
      createPaymentIntent: jest.fn().mockResolvedValue({ id: 'pi_abc' }),
    };
    mockPublisher = {
      publish: jest.fn().mockResolvedValue(undefined),
    };
    mockMetrics = {
      incrementPaymentsCreated: jest.fn(),
    };
    useCase = new AuthorizePaymentUseCase(
      mockPaymentRepo,
      mockMethodRepo,
      mockStripe,
      mockPublisher,
      mockMetrics,
    );
  });

  it('should return 200 with existing payment on duplicate Idempotency-Key', async () => {
    const existingPayment = makeAuthorizedPayment();
    mockPaymentRepo.findByIdempotencyKey.mockResolvedValue(existingPayment);

    const result = await useCase.execute(baseCommand);

    expect(result.isNew).toBe(false);
    expect(result.payment.paymentId).toBe(TEST_UUID);
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('should return 402 and publish PaymentFailed when Stripe returns card_declined', async () => {
    mockStripe.createPaymentIntent.mockRejectedValue(
      new PaymentDeclinedException('card_declined', 'insufficient_funds', 'Card declined'),
    );

    await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(PaymentDeclinedException);
    expect(mockPaymentRepo.save).toHaveBeenCalled();
    expect(mockPublisher.publish).toHaveBeenCalled();
  });

  it('should persist payment and return 201 even when Kafka publish fails', async () => {
    mockPublisher.publish.mockRejectedValue(new Error('Kafka error'));

    const result = await useCase.execute(baseCommand);

    expect(result.isNew).toBe(true);
    expect(mockPaymentRepo.save).toHaveBeenCalled();
  });

  it('should save payment with status AUTHORIZED and stripePaymentIntentId after success', async () => {
    const result = await useCase.execute(baseCommand);

    expect(result.payment.status).toBe(PaymentStatus.AUTHORIZED);
    expect(result.payment.stripePaymentIntentId).toBe('pi_abc');
  });

  it('should throw BadRequestException when idempotencyKey is missing', async () => {
    await expect(
      useCase.execute({ ...baseCommand, idempotencyKey: '' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(mockStripe.createPaymentIntent).not.toHaveBeenCalled();
  });

  it('should throw NotFoundException when payment method is not found', async () => {
    mockMethodRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('should throw ForbiddenException when payment method belongs to different traveler', async () => {
    mockMethodRepo.findById.mockResolvedValue({ ...mockMethod, travelerId: 'different-traveler' });
    await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('should throw PaymentProcessingException when Stripe circuit is open', async () => {
    mockStripe.createPaymentIntent.mockRejectedValue(new StripeCircuitOpenException());
    await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(PaymentProcessingException);
  });

  it('should rethrow generic Stripe errors that are not declined or circuit-open', async () => {
    const genericError = new Error('Network timeout');
    mockStripe.createPaymentIntent.mockRejectedValue(genericError);
    await expect(useCase.execute(baseCommand)).rejects.toBe(genericError);
  });

  it('should still throw PaymentDeclinedException when Kafka fails publishing PaymentFailed', async () => {
    mockStripe.createPaymentIntent.mockRejectedValue(
      new PaymentDeclinedException('card_declined', 'insufficient_funds', 'Declined'),
    );
    mockPublisher.publish.mockRejectedValue(new Error('Kafka down'));

    await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(PaymentDeclinedException);
    expect(mockPaymentRepo.save).toHaveBeenCalled();
  });

  it('should throw ConflictException when payment with same idempotency key is in-flight', async () => {
    const pendingPayment = Payment.reconstitute({
      id: TEST_UUID,
      travelerId: TEST_UUID,
      bookingId: BOOKING_UUID,
      paymentMethodId: METHOD_UUID,
      money: new Money(350, 'USD'),
      status: PaymentStatus.PENDING,
      stripePaymentIntentId: null,
      idempotencyKey: 'idem-key-001',
      description: null,
      failureReason: null,
      capturedAmount: null,
      refundedAmount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockPaymentRepo.findByIdempotencyKey.mockResolvedValue(pendingPayment);

    await expect(useCase.execute(baseCommand)).rejects.toBeInstanceOf(ConflictException);
  });
});
