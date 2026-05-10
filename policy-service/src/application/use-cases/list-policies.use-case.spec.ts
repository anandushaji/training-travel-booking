import { ListPoliciesUseCase } from './list-policies.use-case';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';

const baseRules = {
  maxFlightCost: 1000,
  allowedCabinClasses: [CabinClass.ECONOMY],
  advanceBookingDays: 7,
  requiresApproval: false,
  approvalThreshold: 800,
  allowInternational: true,
};

describe('ListPoliciesUseCase', () => {
  let useCase: ListPoliciesUseCase;
  let mockRepo: jest.Mocked<TravelPolicyRepository>;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<TravelPolicyRepository>;

    useCase = new ListPoliciesUseCase(mockRepo);
  });

  it('returns mapped DTOs for all policies', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Engineering', rules: baseRules }, 'admin');
    mockRepo.findAll.mockResolvedValueOnce([policy]);

    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(result[0]!.name).toBe('Test');
    expect(mockRepo.findAll).toHaveBeenCalledWith({});
  });

  it('passes department filter to repository', async () => {
    mockRepo.findAll.mockResolvedValueOnce([]);

    await useCase.execute({ department: 'Finance' });
    expect(mockRepo.findAll).toHaveBeenCalledWith({ department: 'Finance' });
  });

  it('passes active filter to repository', async () => {
    mockRepo.findAll.mockResolvedValueOnce([]);

    await useCase.execute({ active: true });
    expect(mockRepo.findAll).toHaveBeenCalledWith({ active: true });
  });

  it('returns empty array when no policies match', async () => {
    mockRepo.findAll.mockResolvedValueOnce([]);

    const result = await useCase.execute({ department: 'Unknown' });
    expect(result).toEqual([]);
  });
});
