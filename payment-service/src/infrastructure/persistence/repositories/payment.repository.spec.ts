import { PaymentRepository } from './payment.repository';
import { PaymentTypeOrmEntity } from '../entities/payment.typeorm-entity';
import { Payment } from '../../../domain/aggregates/payment.aggregate';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';
import { Money } from '../../../domain/value-objects/money.vo';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const TEST_UUID2 = '00000000-0000-4000-8000-000000000002';
const TEST_UUID3 = '00000000-0000-4000-8000-000000000003';

function makePaymentEntity(overrides: Partial<PaymentTypeOrmEntity> = {}): PaymentTypeOrmEntity {
  const now = new Date();
  return {
    id: TEST_UUID,
    travelerId: TEST_UUID2,
    bookingId: TEST_UUID3,
    paymentMethodId: TEST_UUID,
    amount: '350.00',
    currency: 'USD',
    status: PaymentStatus.AUTHORIZED,
    stripePaymentIntentId: 'pi_abc',
    idempotencyKey: 'idem-key-001',
    description: null,
    failureReason: null,
    capturedAmount: null,
    refundedAmount: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('PaymentRepository', () => {
  let repo: PaymentRepository;
  let mockTypeOrmRepo: jest.Mocked<any>;

  beforeEach(() => {
    mockTypeOrmRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
    };
    repo = new PaymentRepository(mockTypeOrmRepo);
  });

  describe('findByIdempotencyKey()', () => {
    it('should return payment by idempotency key', async () => {
      const entity = makePaymentEntity();
      mockTypeOrmRepo.findOne.mockResolvedValue(entity);

      const result = await repo.findByIdempotencyKey('idem-key-001');
      expect(result).not.toBeNull();
      expect(result!.idempotencyKey).toBe('idem-key-001');
      expect(mockTypeOrmRepo.findOne).toHaveBeenCalledWith({
        where: { idempotencyKey: 'idem-key-001' },
      });
    });

    it('should return null when idempotency key not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);
      const result = await repo.findByIdempotencyKey('missing-key');
      expect(result).toBeNull();
    });
  });

  describe('findByStripePaymentIntentId()', () => {
    it('should return payment by stripePaymentIntentId', async () => {
      const entity = makePaymentEntity({ stripePaymentIntentId: 'pi_xyz' });
      mockTypeOrmRepo.findOne.mockResolvedValue(entity);

      const result = await repo.findByStripePaymentIntentId('pi_xyz');
      expect(result).not.toBeNull();
      expect(result!.stripePaymentIntentId).toBe('pi_xyz');
    });

    it('should return null when stripePaymentIntentId not found', async () => {
      mockTypeOrmRepo.findOne.mockResolvedValue(null);
      const result = await repo.findByStripePaymentIntentId('pi_unknown');
      expect(result).toBeNull();
    });
  });

  describe('findById()', () => {
    it('should return payment by id', async () => {
      const entity = makePaymentEntity();
      mockTypeOrmRepo.findOne.mockResolvedValue(entity);

      const result = await repo.findById(TEST_UUID);
      expect(result).not.toBeNull();
      expect(result!.paymentId).toBe(TEST_UUID);
    });
  });

  describe('save()', () => {
    it('should correctly reconstruct Payment aggregate from TypeORM entity', async () => {
      const entity = makePaymentEntity({ status: PaymentStatus.CAPTURED, capturedAmount: '350.00' });
      mockTypeOrmRepo.findOne.mockResolvedValue(entity);

      const result = await repo.findById(TEST_UUID);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(PaymentStatus.CAPTURED);
      expect(result!.capturedAmount).toBe(350.00);
    });

    it('should call typeorm save with mapped entity', async () => {
      const payment = Payment.reconstitute({
        id: TEST_UUID,
        travelerId: TEST_UUID2,
        bookingId: TEST_UUID3,
        paymentMethodId: TEST_UUID,
        money: new Money(350, 'USD'),
        status: PaymentStatus.PENDING,
        stripePaymentIntentId: null,
        idempotencyKey: 'idem-001',
        description: null,
        failureReason: null,
        capturedAmount: null,
        refundedAmount: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockTypeOrmRepo.save.mockResolvedValue({});

      await repo.save(payment);
      expect(mockTypeOrmRepo.save).toHaveBeenCalled();
    });
  });
});
