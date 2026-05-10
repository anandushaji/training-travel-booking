import { UpdatePolicyUseCase } from './update-policy.use-case';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyCacheService } from '../../infrastructure/cache/policy-cache.service';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';
import { NotFoundException } from '@travel/shared';

const baseRules = {
  maxFlightCost: 1000,
  allowedCabinClasses: [CabinClass.ECONOMY],
  advanceBookingDays: 7,
  requiresApproval: false,
  approvalThreshold: 800,
  allowInternational: true,
};

describe('UpdatePolicyUseCase', () => {
  let useCase: UpdatePolicyUseCase;
  let mockRepo: jest.Mocked<TravelPolicyRepository>;
  let mockCache: jest.Mocked<PolicyCacheService>;

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<TravelPolicyRepository>;

    mockCache = {
      invalidateDepartmentPolicies: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PolicyCacheService>;

    useCase = new UpdatePolicyUseCase(mockRepo, mockCache);
  });

  it('updates and returns policy', async () => {
    const policy = TravelPolicy.create({ name: 'Old', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.findById.mockResolvedValueOnce(policy);
    mockRepo.save.mockImplementation(async (p) => p);

    const result = await useCase.execute(policy.id, { name: 'New' });
    expect(result.name).toBe('New');
  });

  it('version incremented after update', async () => {
    const policy = TravelPolicy.create({ name: 'Old', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.findById.mockResolvedValueOnce(policy);
    mockRepo.save.mockImplementation(async (p) => p);

    await useCase.execute(policy.id, { name: 'Updated' });
    expect(policy.version).toBe(1);
  });

  it('throws NotFoundException when not found', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);
    await expect(useCase.execute('missing', { name: 'X' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('invalidates cache after update', async () => {
    const policy = TravelPolicy.create({ name: 'Old', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.findById.mockResolvedValueOnce(policy);
    mockRepo.save.mockImplementation(async (p) => p);

    await useCase.execute(policy.id, { name: 'New' });
    expect(mockCache.invalidateDepartmentPolicies).toHaveBeenCalledWith('Eng');
  });

  it('updates description and active fields', async () => {
    const policy = TravelPolicy.create({ name: 'Old', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.findById.mockResolvedValueOnce(policy);
    mockRepo.save.mockImplementation(async (p) => p);

    const result = await useCase.execute(policy.id, { description: 'New desc', active: false });
    expect(result.description).toBe('New desc');
    expect(result.active).toBe(false);
  });

  it('updates rules field', async () => {
    const policy = TravelPolicy.create({ name: 'Old', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.findById.mockResolvedValueOnce(policy);
    mockRepo.save.mockImplementation(async (p) => p);

    const newRules = { ...baseRules, maxFlightCost: 2000 };
    await useCase.execute(policy.id, { rules: newRules as any });
    expect(policy.rules.maxFlightCost).toBe(2000);
  });
});
