import { AttachPaymentMethodUseCase } from './attach-payment-method.use-case';
import { IPaymentMethodRepository } from '../../../domain/repositories/payment-method.repository.interface';
import { ConflictException } from '@travel/shared';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';

describe('AttachPaymentMethodUseCase', () => {
  let useCase: AttachPaymentMethodUseCase;
  let mockRepo: jest.Mocked<IPaymentMethodRepository>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn(),
      findByTravelerId: jest.fn(),
      findByStripePaymentMethodId: jest.fn(),
    };
    useCase = new AttachPaymentMethodUseCase(mockRepo);
  });

  it('should return PaymentMethodResponseDto without stripePaymentMethodId', async () => {
    mockRepo.findByStripePaymentMethodId.mockResolvedValue(null);

    const result = await useCase.execute({
      travelerId: TEST_UUID,
      stripePaymentMethodId: 'pm_test_visa4242',
      cardBrand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
    });

    expect(result).not.toHaveProperty('stripePaymentMethodId');
    expect(result.cardBrand).toBe('visa');
    expect(result.travelerId).toBe(TEST_UUID);
  });

  it('should throw ConflictException when stripePaymentMethodId already exists', async () => {
    const existingMethod = { paymentMethodId: TEST_UUID } as any;
    mockRepo.findByStripePaymentMethodId.mockResolvedValue(existingMethod);

    await expect(
      useCase.execute({
        travelerId: TEST_UUID,
        stripePaymentMethodId: 'pm_test_visa4242',
        cardBrand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2027,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('should set travelerId from JWT claim not from request body', async () => {
    mockRepo.findByStripePaymentMethodId.mockResolvedValue(null);

    const result = await useCase.execute({
      travelerId: TEST_UUID,
      stripePaymentMethodId: 'pm_test_visa4242',
      cardBrand: 'visa',
      last4: '4242',
      expiryMonth: 12,
      expiryYear: 2027,
    });

    expect(result.travelerId).toBe(TEST_UUID);
  });
});
