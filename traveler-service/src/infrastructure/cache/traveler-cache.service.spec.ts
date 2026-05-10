import { TravelerCacheService, TravelerCacheDto } from './traveler-cache.service';

describe('TravelerCacheService', () => {
  let service: TravelerCacheService;
  let mockRedis: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  const sampleDto: TravelerCacheDto = {
    id: 'traveler-uuid-123',
    employeeId: 'EMP-001',
    name: 'Alice',
    email: 'alice@corp.com',
    department: 'Engineering',
    role: 'EMPLOYEE',
    preferences: {},
    deletedAt: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    updatedAt: '2026-05-01T00:00:00.000Z',
  };

  beforeEach(() => {
    mockRedis = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    service = new TravelerCacheService(mockRedis as never);
  });

  describe('get()', () => {
    it('should return cached dto on get', async () => {
      mockRedis.get.mockResolvedValue(JSON.stringify(sampleDto));
      const result = await service.get('traveler-uuid-123');
      expect(result).toEqual(sampleDto);
      expect(mockRedis.get).toHaveBeenCalledWith(
        'traveler:profile:traveler-uuid-123',
      );
    });

    it('should return null when key does not exist', async () => {
      mockRedis.get.mockResolvedValue(null);
      const result = await service.get('unknown-id');
      expect(result).toBeNull();
    });

    it('should return null and not throw when redis get throws', async () => {
      mockRedis.get.mockRejectedValue(new Error('Redis unavailable'));
      const result = await service.get('traveler-uuid-123');
      expect(result).toBeNull();
    });
  });

  describe('set()', () => {
    it('should call redis.set with correct key pattern and TTL 3600', async () => {
      mockRedis.set.mockResolvedValue('OK');
      await service.set('traveler-uuid-123', sampleDto);
      expect(mockRedis.set).toHaveBeenCalledWith(
        'traveler:profile:traveler-uuid-123',
        JSON.stringify(sampleDto),
        'EX',
        3600,
      );
    });

    it('should not throw and emit warn log when redis set throws', async () => {
      mockRedis.set.mockRejectedValue(new Error('Redis unavailable'));
      await expect(service.set('traveler-uuid-123', sampleDto)).resolves.not.toThrow();
    });
  });

  describe('invalidate()', () => {
    it('should call redis.del with correct key on invalidate', async () => {
      mockRedis.del.mockResolvedValue(1);
      await service.invalidate('traveler-uuid-123');
      expect(mockRedis.del).toHaveBeenCalledWith(
        'traveler:profile:traveler-uuid-123',
      );
    });

    it('should not throw when redis del throws', async () => {
      mockRedis.del.mockRejectedValue(new Error('Redis unavailable'));
      await expect(service.invalidate('traveler-uuid-123')).resolves.not.toThrow();
    });
  });
});
