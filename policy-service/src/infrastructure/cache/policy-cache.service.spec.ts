import * as prom from 'prom-client';
import { PolicyCacheService } from './policy-cache.service';
import { ConfigService } from '@nestjs/config';
import { PolicyMetricsService } from '../metrics/policy-metrics.service';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';

// Mock ioredis
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    setex: jest.fn(),
    del: jest.fn(),
    on: jest.fn(),
  }));
});

import Redis from 'ioredis';
const MockRedis = Redis as jest.MockedClass<typeof Redis>;

describe('PolicyCacheService', () => {
  let service: PolicyCacheService;
  let mockRedis: jest.Mocked<Redis>;
  let metricsService: jest.Mocked<PolicyMetricsService>;
  let configService: jest.Mocked<ConfigService>;

  const baseRules = {
    maxFlightCost: 1000,
    allowedCabinClasses: [CabinClass.ECONOMY],
    advanceBookingDays: 7,
    requiresApproval: false,
    approvalThreshold: 800,
    allowInternational: true,
  };

  beforeEach(() => {
    prom.register.clear();

    metricsService = {
      incrementCacheHits: jest.fn(),
      incrementCacheMisses: jest.fn(),
      incrementValidationsTotal: jest.fn(),
      incrementTravelerServiceRetries: jest.fn(),
      setTravelerServiceCbState: jest.fn(),
      incrementKafkaEventsPublished: jest.fn(),
    } as unknown as jest.Mocked<PolicyMetricsService>;

    configService = {
      get: jest.fn().mockReturnValue('redis://localhost:6379'),
    } as unknown as jest.Mocked<ConfigService>;

    service = new PolicyCacheService(configService, metricsService);
    // mock.instances stores `this`, not the returned object from mockImplementation;
    // mock.results.value is the actual object returned by the constructor mock.
    mockRedis = (MockRedis.mock.results[MockRedis.mock.results.length - 1] as jest.MockResult<Redis>).value as jest.Mocked<Redis>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPoliciesForDepartment', () => {
    it('returns parsed policies on hit', async () => {
      const policy = TravelPolicy.create(
        { name: 'Test', department: 'Engineering', rules: baseRules },
        'admin',
      );
      const serialised = JSON.stringify([{
        id: policy.id,
        name: policy.name,
        description: null,
        department: policy.department,
        rules: policy.rules.toPlain(),
        active: true,
        createdBy: 'admin',
        version: 0,
        createdAt: policy.createdAt.toISOString(),
        updatedAt: policy.updatedAt.toISOString(),
      }]);
      mockRedis.get.mockResolvedValueOnce(serialised);

      const result = await service.getPoliciesForDepartment('Engineering');
      expect(result).not.toBeNull();
      expect(result!).toHaveLength(1);
      expect(result![0]!.name).toBe('Test');
      expect(metricsService.incrementCacheHits).toHaveBeenCalledWith('policy');
    });

    it('returns null on miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);

      const result = await service.getPoliciesForDepartment('Engineering');
      expect(result).toBeNull();
      expect(metricsService.incrementCacheMisses).toHaveBeenCalledWith('policy');
    });

    it('returns null and warns on Redis error', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'));

      const result = await service.getPoliciesForDepartment('Engineering');
      expect(result).toBeNull();
    });

    it('increments hits counter on cache hit', async () => {
      mockRedis.get.mockResolvedValueOnce(JSON.stringify([]));
      await service.getPoliciesForDepartment('Engineering');
      expect(metricsService.incrementCacheHits).toHaveBeenCalledWith('policy');
    });

    it('increments misses counter on cache miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      await service.getPoliciesForDepartment('Engineering');
      expect(metricsService.incrementCacheMisses).toHaveBeenCalledWith('policy');
    });
  });

  describe('setPoliciesForDepartment', () => {
    it('sets TTL to 900 on write', async () => {
      mockRedis.setex.mockResolvedValueOnce('OK');
      await service.setPoliciesForDepartment('Engineering', []);
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'policy-service:policy:dept:Engineering',
        900,
        expect.any(String),
      );
    });
  });

  describe('invalidateDepartmentPolicies', () => {
    it('invalidate calls DEL with correct key', async () => {
      mockRedis.del.mockResolvedValueOnce(1);
      await service.invalidateDepartmentPolicies('Engineering');
      expect(mockRedis.del).toHaveBeenCalledWith('policy-service:policy:dept:Engineering');
    });
  });

  describe('getTravelerDepartment', () => {
    it('returns department on hit', async () => {
      mockRedis.get.mockResolvedValueOnce('Engineering');
      const result = await service.getTravelerDepartment('traveler-1');
      expect(result).toBe('Engineering');
      expect(metricsService.incrementCacheHits).toHaveBeenCalledWith('traveler');
    });

    it('returns null on miss', async () => {
      mockRedis.get.mockResolvedValueOnce(null);
      const result = await service.getTravelerDepartment('traveler-1');
      expect(result).toBeNull();
    });
  });

  describe('setTravelerDepartment', () => {
    it('sets TTL to 3600 on write', async () => {
      mockRedis.setex.mockResolvedValueOnce('OK');
      await service.setTravelerDepartment('traveler-1', 'Finance');
      expect(mockRedis.setex).toHaveBeenCalledWith(
        'policy-service:traveler-dept:traveler-1',
        3600,
        'Finance',
      );
    });

    it('swallows Redis SETEX error gracefully', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis down'));
      await expect(service.setTravelerDepartment('traveler-1', 'Finance')).resolves.toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('triggers redis error handler callback', () => {
      // Verify the 'error' listener was registered (line 24-26 in source)
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('setPoliciesForDepartment swallows Redis SETEX error', async () => {
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis down'));
      await expect(service.setPoliciesForDepartment('Engineering', [])).resolves.toBeUndefined();
    });

    it('invalidateDepartmentPolicies swallows Redis DEL error', async () => {
      mockRedis.del.mockRejectedValueOnce(new Error('Redis down'));
      await expect(service.invalidateDepartmentPolicies('Engineering')).resolves.toBeUndefined();
    });

    it('getTravelerDepartment swallows Redis GET error', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'));
      const result = await service.getTravelerDepartment('traveler-1');
      expect(result).toBeNull();
    });
  });
});
