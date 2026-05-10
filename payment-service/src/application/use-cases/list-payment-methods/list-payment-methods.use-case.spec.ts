import { ListPaymentMethodsUseCase } from './list-payment-methods.use-case';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';

describe('ListPaymentMethodsUseCase', () => {
  let useCase: ListPaymentMethodsUseCase;
  let mockRepo: jest.Mocked<any>;

  beforeEach(() => {
    mockRepo = { findByTravelerId: jest.fn() };
    useCase = new ListPaymentMethodsUseCase(mockRepo);
  });

  it('should return only active payment methods for the authenticated traveler', async () => {
    mockRepo.findByTravelerId.mockResolvedValue([
      {
        paymentMethodId: TEST_UUID,
        travelerId: TEST_UUID,
        cardBrand: 'visa',
        last4: '4242',
        expiryMonth: 12,
        expiryYear: 2027,
        isActive: true,
        createdAt: new Date(),
      },
    ]);

    const result = await useCase.execute(TEST_UUID);
    expect(result).toHaveLength(1);
    expect(result[0]).not.toHaveProperty('stripePaymentMethodId');
    expect(result[0]!.cardBrand).toBe('visa');
    expect(mockRepo.findByTravelerId).toHaveBeenCalledWith(TEST_UUID);
  });

  it('should return empty array when traveler has no active methods', async () => {
    mockRepo.findByTravelerId.mockResolvedValue([]);
    const result = await useCase.execute(TEST_UUID);
    expect(result).toHaveLength(0);
  });
});
