import { GetPolicyUseCase } from './get-policy.use-case';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';
import { NotFoundException } from '@travel/shared';

describe('GetPolicyUseCase', () => {
  let useCase: GetPolicyUseCase;
  let mockRepo: jest.Mocked<TravelPolicyRepository>;

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
    } as unknown as jest.Mocked<TravelPolicyRepository>;

    useCase = new GetPolicyUseCase(mockRepo);
  });

  it('returns policy when found', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Eng', rules: baseRules }, 'admin');
    mockRepo.findById.mockResolvedValueOnce(policy);

    const result = await useCase.execute(policy.id);
    expect(result.id).toBe(policy.id);
  });

  it('throws NotFoundException when not found', async () => {
    mockRepo.findById.mockResolvedValueOnce(null);
    await expect(useCase.execute('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
