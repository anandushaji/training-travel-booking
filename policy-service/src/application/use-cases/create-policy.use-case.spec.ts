import { CreatePolicyUseCase } from './create-policy.use-case';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyCacheService } from '../../infrastructure/cache/policy-cache.service';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';
import { ConflictException } from '@travel/shared';
import { QueryFailedError } from 'typeorm';

const baseRules = {
  maxFlightCost: 1000,
  allowedCabinClasses: [CabinClass.ECONOMY],
  advanceBookingDays: 7,
  requiresApproval: false,
  approvalThreshold: 800,
  allowInternational: true,
};

describe('CreatePolicyUseCase', () => {
  let useCase: CreatePolicyUseCase;
  let mockRepo: jest.Mocked<TravelPolicyRepository>;
  let mockCache: jest.Mocked<PolicyCacheService>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAll: jest.fn(),
      findByDepartment: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<TravelPolicyRepository>;

    mockCache = {
      invalidateDepartmentPolicies: jest.fn().mockResolvedValue(undefined),
      getPoliciesForDepartment: jest.fn(),
      setPoliciesForDepartment: jest.fn(),
      getTravelerDepartment: jest.fn(),
      setTravelerDepartment: jest.fn(),
    } as unknown as jest.Mocked<PolicyCacheService>;

    useCase = new CreatePolicyUseCase(mockRepo, mockCache);
  });

  it('creates and returns policy', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.save.mockResolvedValueOnce(policy);

    const result = await useCase.execute({ name: 'Test', department: 'Eng', rules: baseRules as any }, 'admin');
    expect(result.name).toBe('Test');
  });

  it('throws ConflictException on duplicate (23505)', async () => {
    const dbError = new QueryFailedError('INSERT', [], new Error('duplicate key'));
    (dbError as any).code = '23505';
    mockRepo.save.mockRejectedValueOnce(dbError);

    await expect(
      useCase.execute({ name: 'Test', department: 'Eng', rules: baseRules as any }, 'admin'),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows unknown errors', async () => {
    mockRepo.save.mockRejectedValueOnce(new Error('DB connection lost'));
    await expect(
      useCase.execute({ name: 'Test', department: 'Eng', rules: baseRules as any }, 'admin'),
    ).rejects.toThrow('DB connection lost');
  });

  it('invalidates cache after create', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.save.mockResolvedValueOnce(policy);

    await useCase.execute({ name: 'Test', department: 'Eng', rules: baseRules as any }, 'admin');
    expect(mockCache.invalidateDepartmentPolicies).toHaveBeenCalledWith('Eng');
  });

  it('creates policy with description when provided', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Eng', rules: baseRules, description: 'My policy' }, 'admin');
    mockRepo.save.mockResolvedValueOnce(policy);

    const result = await useCase.execute(
      { name: 'Test', department: 'Eng', rules: baseRules as any, description: 'My policy' },
      'admin',
    );
    expect(result.description).toBe('My policy');
  });
});
