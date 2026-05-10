import { PolicyMapper } from './policy.mapper';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';

describe('PolicyMapper', () => {
  const baseRules = {
    maxFlightCost: 1500,
    allowedCabinClasses: [CabinClass.ECONOMY, CabinClass.BUSINESS],
    advanceBookingDays: 14,
    requiresApproval: false,
    approvalThreshold: 1000,
    allowInternational: true,
  };

  it('maps all aggregate fields to response shape', () => {
    const policy = TravelPolicy.create(
      { name: 'Standard Policy', department: 'Engineering', rules: baseRules },
      'admin-user',
    );
    const dto = PolicyMapper.toDto(policy);

    expect(dto.id).toBe(policy.id);
    expect(dto.name).toBe('Standard Policy');
    expect(dto.department).toBe('Engineering');
    expect(dto.active).toBe(true);
    expect(dto.createdBy).toBe('admin-user');
    expect(dto.version).toBe(0);
    expect(dto.createdAt).toBeDefined();
    expect(dto.updatedAt).toBeDefined();
  });

  it('maps rules to nested object', () => {
    const policy = TravelPolicy.create(
      { name: 'Test', department: 'Finance', rules: baseRules },
      'admin',
    );
    const dto = PolicyMapper.toDto(policy);

    expect(dto.rules).toBeDefined();
    expect(typeof dto.rules).toBe('object');
    expect(dto.rules.maxFlightCost).toBe(1500);
    expect(dto.rules.allowedCabinClasses).toEqual([CabinClass.ECONOMY, CabinClass.BUSINESS]);
    expect(dto.rules.allowInternational).toBe(true);
  });

  it('description is null when not provided', () => {
    const policy = TravelPolicy.create(
      { name: 'Test', department: 'Finance', rules: baseRules },
      'admin',
    );
    const dto = PolicyMapper.toDto(policy);
    expect(dto.description).toBeNull();
  });
});
