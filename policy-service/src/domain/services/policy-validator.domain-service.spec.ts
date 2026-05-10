import { PolicyValidatorDomainService } from './policy-validator.domain-service';
import { TravelPolicy } from '../aggregates/travel-policy.aggregate';
import { CabinClass } from '../value-objects/policy-rules.value-object';

const baseRules = {
  maxFlightCost: 1000,
  allowedCabinClasses: [CabinClass.ECONOMY, CabinClass.BUSINESS],
  advanceBookingDays: 7,
  requiresApproval: false,
  approvalThreshold: 800,
  allowInternational: true,
};

function makePolicy(overrides = {}): TravelPolicy {
  return TravelPolicy.create(
    { name: 'Test', department: 'Engineering', rules: { ...baseRules, ...overrides } },
    'admin',
  );
}

describe('PolicyValidatorDomainService', () => {
  let service: PolicyValidatorDomainService;

  beforeEach(() => {
    service = new PolicyValidatorDomainService();
  });

  it('validates - returns valid when all rules pass', () => {
    const policy = makePolicy();
    const result = service.validate(
      { travelerId: 'user-1', amount: 500, cabinClass: CabinClass.ECONOMY, advanceBookingDays: 14 },
      policy,
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('validates - cabin class violation', () => {
    const policy = makePolicy({ allowedCabinClasses: [CabinClass.ECONOMY] });
    const result = service.validate(
      { travelerId: 'user-1', amount: 500, cabinClass: CabinClass.BUSINESS },
      policy,
    );
    expect(result.valid).toBe(false);
    const rules = result.violations.map((v) => v.rule);
    expect(rules).toContain('cabinClass');
  });

  it('validates - maxFlightCost violation when amount exceeds max', () => {
    const policy = makePolicy({ maxFlightCost: 500 });
    const result = service.validate(
      { travelerId: 'user-1', amount: 501 },
      policy,
    );
    expect(result.valid).toBe(false);
    const rules = result.violations.map((v) => v.rule);
    expect(rules).toContain('maxFlightCost');
  });

  it('validates - amount equal to maxFlightCost passes (boundary inclusive)', () => {
    const policy = makePolicy({ maxFlightCost: 500 });
    const result = service.validate(
      { travelerId: 'user-1', amount: 500 },
      policy,
    );
    const rules = result.violations.map((v) => v.rule);
    expect(rules).not.toContain('maxFlightCost');
  });

  it('validates - advanceBookingDays violation', () => {
    const policy = makePolicy({ advanceBookingDays: 7 });
    const result = service.validate(
      { travelerId: 'user-1', amount: 300, advanceBookingDays: 3 },
      policy,
    );
    expect(result.valid).toBe(false);
    const rules = result.violations.map((v) => v.rule);
    expect(rules).toContain('advanceBookingDays');
  });

  it('validates - sets requiresApproval when amount exceeds threshold', () => {
    const policy = makePolicy({ approvalThreshold: 800, requiresApproval: false });
    const result = service.validate(
      { travelerId: 'user-1', amount: 900 },
      policy,
    );
    expect(result.requiresApproval).toBe(true);
  });

  it('validates - sets requiresApproval when policy.requiresApproval is true', () => {
    const policy = makePolicy({ requiresApproval: true, approvalThreshold: 99999 });
    const result = service.validate(
      { travelerId: 'user-1', amount: 100 },
      policy,
    );
    expect(result.requiresApproval).toBe(true);
  });

  it('validates - no policy returns pass', () => {
    const result = service.validate(
      { travelerId: 'user-1', amount: 500 },
      null,
    );
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('validates - collects all violations', () => {
    const policy = makePolicy({
      allowedCabinClasses: [CabinClass.ECONOMY],
      maxFlightCost: 300,
      advanceBookingDays: 10,
    });
    const result = service.validate(
      {
        travelerId: 'user-1',
        amount: 500,
        cabinClass: CabinClass.BUSINESS,
        advanceBookingDays: 3,
      },
      policy,
    );
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThanOrEqual(3);
  });

  it('validates - WARNING violation for international route when not allowed', () => {
    const policy = makePolicy({ allowInternational: false });
    const result = service.validate(
      { travelerId: 'user-1', amount: 300, origin: 'US', destination: 'GB' },
      policy,
    );
    const rules = result.violations.map((v) => v.rule);
    expect(rules).toContain('allowInternational');
    const violation = result.violations.find((v) => v.rule === 'allowInternational');
    expect(violation!.severity).toBe('WARNING');
  });

  it('validates - no WARNING for same origin and destination (domestic)', () => {
    const policy = makePolicy({ allowInternational: false });
    const result = service.validate(
      { travelerId: 'user-1', amount: 300, origin: 'US', destination: 'US' },
      policy,
    );
    const rules = result.violations.map((v) => v.rule);
    expect(rules).not.toContain('allowInternational');
  });

  it('validates - no international check when origin is not 2 chars', () => {
    const policy = makePolicy({ allowInternational: false });
    const result = service.validate(
      { travelerId: 'user-1', amount: 300, origin: 'NYC', destination: 'GB' },
      policy,
    );
    const rules = result.violations.map((v) => v.rule);
    expect(rules).not.toContain('allowInternational');
  });
});
