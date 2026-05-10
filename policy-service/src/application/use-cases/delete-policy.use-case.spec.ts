import { DeletePolicyUseCase } from './delete-policy.use-case';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyCacheService } from '../../infrastructure/cache/policy-cache.service';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';
import { NotFoundException } from '@travel/shared';

describe('DeletePolicyUseCase', () => {
  let useCase: DeletePolicyUseCase;
  let mockRepo: jest.Mocked<TravelPolicyRepository>;
  let mockCache: jest.Mocked<PolicyCacheService>;

  const baseRules = {
    maxFlightCost: 1000,
    allowedCabinClasses: [CabinClass.ECONOMY],
    advanceBookingDays: 7,
    requiresApproval: false,
    approvalThreshold: 800,
    allowInternational: true,
  };

  beforeEach(() => {
    mockRepo = {
      findById: jest.fn(),
      delete: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<TravelPolicyRepository>;

    mockCache = {
      invalidateDepartmentPolicies: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PolicyCacheService>;

    useCase = new DeletePolicyUseCase(mockRepo, mockCache);
  });

  it('deletes policy when found', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.findById.mockResolvedValueOnce(policy);

    await useCase.execute(policy.id);
    expect(mockRepo.delete).toHaveBeenCalledWith(policy.id);
  });

  it('throws NotFoundException when policy not found', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);
    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('invalidates cache after delete', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.findById.mockResolvedValueOnce(policy);

    await useCase.execute(policy.id);
    expect(mockCache.invalidateDepartmentPolicies).toHaveBeenCalledWith('Eng');
  });
});
