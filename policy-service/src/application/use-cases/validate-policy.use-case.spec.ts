import { ValidatePolicyUseCase, JwtPayload } from './validate-policy.use-case';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyViolationRepository } from '../../infrastructure/repositories/policy-violation.repository';
import { TravelerServiceClient } from '../../infrastructure/http/traveler-service.client';
import { PolicyCacheService } from '../../infrastructure/cache/policy-cache.service';
import { PolicyEventPublisher } from '../../infrastructure/kafka/policy-event.publisher';
import { PolicyMetricsService } from '../../infrastructure/metrics/policy-metrics.service';
import { PolicyValidatorDomainService } from '../../domain/services/policy-validator.domain-service';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { ValidationResult } from '../../domain/value-objects/validation-result.value-object';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';
import { generateUuid } from '@travel/shared';
import * as prom from 'prom-client';

const baseRules = {
  maxFlightCost: 1000,
  allowedCabinClasses: [CabinClass.ECONOMY],
  advanceBookingDays: 7,
  requiresApproval: false,
  approvalThreshold: 800,
  allowInternational: true,
};

function makeJwtPayload(department = 'Engineering'): JwtPayload {
  return {
    sub: generateUuid(),
    email: 'user@example.com',
    role: 'EMPLOYEE',
    department,
    iat: 0,
    exp: 9999999999,
  };
}

describe('ValidatePolicyUseCase', () => {
  let useCase: ValidatePolicyUseCase;
  let mockPolicyRepo: jest.Mocked<TravelPolicyRepository>;
  let mockViolationRepo: jest.Mocked<PolicyViolationRepository>;
  let mockTravelerClient: jest.Mocked<TravelerServiceClient>;
  let mockCacheService: jest.Mocked<PolicyCacheService>;
  let mockEventPublisher: jest.Mocked<PolicyEventPublisher>;
  let mockMetrics: jest.Mocked<PolicyMetricsService>;
  let mockValidator: jest.Mocked<PolicyValidatorDomainService>;

  beforeEach(() => {
    prom.register.clear();

    mockPolicyRepo = {
      findByDepartment: jest.fn().mockResolvedValue([]),
    } as unknown as jest.Mocked<TravelPolicyRepository>;

    mockViolationRepo = {
      save: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<PolicyViolationRepository>;

    mockTravelerClient = {
      getTravelerDepartment: jest.fn().mockResolvedValue('Engineering'),
    } as unknown as jest.Mocked<TravelerServiceClient>;

    mockCacheService = {
      getTravelerDepartment: jest.fn().mockResolvedValue(null),
      setTravelerDepartment: jest.fn().mockResolvedValue(undefined),
      getPoliciesForDepartment: jest.fn().mockResolvedValue(null),
      setPoliciesForDepartment: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PolicyCacheService>;

    mockEventPublisher = {
      publishPolicyValidated: jest.fn().mockResolvedValue(undefined),
      publishPolicyViolationDetected: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<PolicyEventPublisher>;

    mockMetrics = {
      incrementValidationsTotal: jest.fn(),
      incrementCacheHits: jest.fn(),
      incrementCacheMisses: jest.fn(),
    } as unknown as jest.Mocked<PolicyMetricsService>;

    mockValidator = {
      validate: jest.fn().mockReturnValue(ValidationResult.pass()),
    } as unknown as jest.Mocked<PolicyValidatorDomainService>;

    useCase = new ValidatePolicyUseCase(
      mockPolicyRepo,
      mockViolationRepo,
      mockTravelerClient,
      mockCacheService,
      mockEventPublisher,
      mockMetrics,
      mockValidator,
    );
  });

  it('returns valid true on pass', async () => {
    mockValidator.validate.mockReturnValueOnce(ValidationResult.pass());

    const result = await useCase.execute(
      { travelerId: generateUuid(), amount: 300 },
      makeJwtPayload(),
      generateUuid(),
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('returns valid false with violations', async () => {
    mockValidator.validate.mockReturnValueOnce(
      ValidationResult.fail([{ rule: 'cabinClass', severity: 'ERROR', message: 'Not allowed' }]),
    );
    const policy = TravelPolicy.create({ name: 'Test', department: 'Engineering', rules: baseRules }, 'admin');
    mockPolicyRepo.findByDepartment.mockResolvedValueOnce([policy]);

    const result = await useCase.execute(
      { travelerId: generateUuid(), amount: 300 },
      makeJwtPayload(),
      generateUuid(),
    );
    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
  });

  it('inserts policy_violation row on failure', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Engineering', rules: baseRules }, 'admin');
    mockPolicyRepo.findByDepartment.mockResolvedValueOnce([policy]);
    mockValidator.validate.mockReturnValueOnce(
      ValidationResult.fail([{ rule: 'maxFlightCost', severity: 'ERROR', message: 'Too expensive' }]),
    );

    await useCase.execute(
      { travelerId: generateUuid(), amount: 2000 },
      makeJwtPayload(),
      generateUuid(),
    );

    expect(mockViolationRepo.save).toHaveBeenCalledTimes(1);
  });

  it('does not insert violation row on pass', async () => {
    mockValidator.validate.mockReturnValueOnce(ValidationResult.pass());

    await useCase.execute(
      { travelerId: generateUuid(), amount: 300 },
      makeJwtPayload(),
      generateUuid(),
    );

    expect(mockViolationRepo.save).not.toHaveBeenCalled();
  });

  it('publishes PolicyValidated on pass', async () => {
    mockValidator.validate.mockReturnValueOnce(ValidationResult.pass());

    await useCase.execute(
      { travelerId: generateUuid(), amount: 300 },
      makeJwtPayload(),
      generateUuid(),
    );

    // Fire-and-forget — give microtask queue a tick
    await Promise.resolve();
    expect(mockEventPublisher.publishPolicyValidated).toHaveBeenCalledTimes(1);
  });

  it('publishes PolicyViolationDetected on failure', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Engineering', rules: baseRules }, 'admin');
    mockPolicyRepo.findByDepartment.mockResolvedValueOnce([policy]);
    mockValidator.validate.mockReturnValueOnce(
      ValidationResult.fail([{ rule: 'cabinClass', severity: 'ERROR', message: 'Not allowed' }]),
    );

    await useCase.execute(
      { travelerId: generateUuid(), amount: 300 },
      makeJwtPayload(),
      generateUuid(),
    );

    await Promise.resolve();
    expect(mockEventPublisher.publishPolicyViolationDetected).toHaveBeenCalledTimes(1);
  });

  it('uses cached department without calling Traveler Service', async () => {
    mockCacheService.getTravelerDepartment.mockResolvedValueOnce('Finance');
    mockValidator.validate.mockReturnValueOnce(ValidationResult.pass());

    await useCase.execute(
      { travelerId: generateUuid(), amount: 300 },
      makeJwtPayload('Engineering'),
      generateUuid(),
    );

    expect(mockTravelerClient.getTravelerDepartment).not.toHaveBeenCalled();
  });

  it('uses JWT dept when circuit is open (traveler client returns fallback)', async () => {
    // When the circuit is open, TravelerServiceClient.getTravelerDepartment returns the jwt dept
    mockTravelerClient.getTravelerDepartment.mockResolvedValueOnce('Engineering');
    mockValidator.validate.mockReturnValueOnce(ValidationResult.pass());

    const result = await useCase.execute(
      { travelerId: generateUuid(), amount: 300 },
      makeJwtPayload('Engineering'),
      generateUuid(),
    );

    expect(result.department).toBe('Engineering');
  });

  it('returns valid when no policy exists for the department', async () => {
    mockPolicyRepo.findByDepartment.mockResolvedValueOnce([]);
    mockValidator.validate.mockReturnValueOnce(ValidationResult.pass());

    const result = await useCase.execute(
      { travelerId: generateUuid(), amount: 300 },
      makeJwtPayload(),
      generateUuid(),
    );

    expect(result.valid).toBe(true);
    expect(result.policyId).toBeNull();
  });

  it('logs error when publishPolicyValidated rejects (fire-and-forget catch)', async () => {
    mockValidator.validate.mockReturnValueOnce(ValidationResult.pass());
    mockEventPublisher.publishPolicyValidated.mockRejectedValueOnce(new Error('Kafka unavailable'));

    // Should not throw — error is caught by .catch()
    await expect(
      useCase.execute({ travelerId: generateUuid(), amount: 300 }, makeJwtPayload(), generateUuid()),
    ).resolves.toBeDefined();

    // Give the fire-and-forget promise time to settle
    await new Promise((r) => setTimeout(r, 10));
  });

  it('logs error when publishPolicyViolationDetected rejects (fire-and-forget catch)', async () => {
    const policy = TravelPolicy.create({ name: 'Test', department: 'Engineering', rules: baseRules }, 'admin');
    mockPolicyRepo.findByDepartment.mockResolvedValueOnce([policy]);
    mockValidator.validate.mockReturnValueOnce(
      ValidationResult.fail([{ rule: 'cabinClass', severity: 'ERROR', message: 'Not allowed' }]),
    );
    mockEventPublisher.publishPolicyViolationDetected.mockRejectedValueOnce(new Error('Kafka down'));

    await expect(
      useCase.execute({ travelerId: generateUuid(), amount: 300 }, makeJwtPayload(), generateUuid()),
    ).resolves.toBeDefined();

    await new Promise((r) => setTimeout(r, 10));
  });
});
