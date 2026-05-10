import { PaymentMethodRepository } from './payment-method.repository';
import { PaymentMethodTypeOrmEntity } from '../entities/payment-method.typeorm-entity';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';

function makeMethodEntity(overrides: Partial<PaymentMethodTypeOrmEntity> = {}): PaymentMethodTypeOrmEntity {
  const now = new Date();
  return {
    id: TEST_UUID,
    travelerId: TEST_UUID,
    stripePaymentMethodId: 'pm_test_visa4242',
    cardBrand: 'visa',
    last4: '4242',
    expiryMonth: 12,
    expiryYear: 2027,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('PaymentMethodRepository', () => {
  let repo: PaymentMethodRepository;
  let mockTypeOrmRepo: jest.Mocked<any>;

  beforeEach(() => {
    mockTypeOrmRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    repo = new PaymentMethodRepository(mockTypeOrmRepo);
  });

  describe('findByTravelerId()', () => {
    it('should return only active payment methods for traveler', async () => {
      const activeMethod = makeMethodEntity({ isActive: true });
      mockTypeOrmRepo.find.mockResolvedValue([activeMethod]);

      const result = await repo.findByTravelerId(TEST_UUID);
      expect(result).toHaveLength(1);
      expect(result[0]!.isActive).toBe(true);
      expect(mockTypeOrmRepo.find).toHaveBeenCalledWith({
        where: { travelerId: TEST_UUID, isActive: true },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array when no active methods', async () => {
      mockTypeOrmRepo.find.mockResolvedValue([]);
      const result = await repo.findByTravelerId(TEST_UUID);
      expect(result).toHaveLength(0);
    });
  });

  describe('findByStripePaymentMethodId()', () => {
    it('should return payment method by stripe id', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(makeMethodEntity());
      const result = await repo.findByStripePaymentMethodId('pm_test_visa4242');
      expect(result).not.toBeNull();
      expect(result!.stripePaymentMethodId).toBe('pm_test_visa4242');
    });

    it('should return null when stripe id not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);
      const result = await repo.findByStripePaymentMethodId('pm_unknown');
      expect(result).toBeNull();
    });
  });
});
