import { IdempotencyService } from './idempotency.service';

const makeRedis = () => ({
  get: jest.fn(),
  set: jest.fn().mockResolvedValue('OK'),
});

describe('IdempotencyService', () => {
  let service: IdempotencyService;
  let redis: ReturnType<typeof makeRedis>;

  beforeEach(() => {
    redis = makeRedis();
    service = new IdempotencyService(redis as never);
  });

  describe('get', () => {
    it('should return null when key is not in Redis', async () => {
      redis.get.mockResolvedValue(null);
      const result = await service.get('key-1');
      expect(result).toBeNull();
    });

    it('should return parsed value when key exists in Redis', async () => {
      const payload = { reservationId: 'res-1', status: 'PENDING' };
      redis.get.mockResolvedValue(JSON.stringify(payload));
      const result = await service.get<typeof payload>('key-1');
      expect(result).toEqual(payload);
    });

    it('should return null and log error when Redis throws', async () => {
      redis.get.mockRejectedValue(new Error('connection refused'));
      const result = await service.get('key-1');
      expect(result).toBeNull();
    });
  });

  describe('set', () => {
    it('should store JSON value with correct key and TTL', async () => {
      const payload = { reservationId: 'res-1' };
      await service.set('key-1', payload, 3600);

      expect(redis.set).toHaveBeenCalledWith(
        'inventory:idempotency:key-1',
        JSON.stringify(payload),
        'EX',
        3600,
      );
    });

    it('should rethrow when Redis set fails', async () => {
      redis.set.mockRejectedValue(new Error('Redis write error'));
      await expect(service.set('key-1', {}, 3600)).rejects.toThrow('Redis write error');
    });
  });

  describe('acquireLock', () => {
    it('should return true when lock is acquired (NX succeeds)', async () => {
      (redis as unknown as { set: jest.Mock }).set = jest.fn().mockResolvedValue('OK');
      const result = await service.acquireLock('key-1');
      expect(result).toBe(true);
    });

    it('should return false when lock is already held (NX returns null)', async () => {
      (redis as unknown as { set: jest.Mock }).set = jest.fn().mockResolvedValue(null);
      const result = await service.acquireLock('key-1');
      expect(result).toBe(false);
    });

    it('should return false when Redis throws', async () => {
      (redis as unknown as { set: jest.Mock }).set = jest.fn().mockRejectedValue(new Error('err'));
      const result = await service.acquireLock('key-1');
      expect(result).toBe(false);
    });
  });
});
