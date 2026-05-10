import { PolicyRules, CabinClass } from './policy-rules.value-object';
import { DomainException } from '@travel/shared';

describe('PolicyRules value object', () => {
  const validProps = {
    maxFlightCost: 1000,
    allowedCabinClasses: [CabinClass.ECONOMY, CabinClass.BUSINESS],
    advanceBookingDays: 7,
    requiresApproval: false,
    approvalThreshold: 800,
    allowInternational: true,
  };

  it('creates with valid props', () => {
    const rules = new PolicyRules(validProps);
    expect(rules.maxFlightCost).toBe(1000);
    expect(rules.allowedCabinClasses).toContain(CabinClass.ECONOMY);
  });

  it('rejects invalid cabinClass', () => {
    expect(() => {
      new PolicyRules({
        ...validProps,
        allowedCabinClasses: ['INVALID_CLASS' as CabinClass],
      });
    }).toThrow(DomainException);
  });

  it('toPlain returns plain object', () => {
    const rules = new PolicyRules(validProps);
    const plain = rules.toPlain();
    expect(plain.maxFlightCost).toBe(1000);
    expect(plain.allowedCabinClasses).toEqual([CabinClass.ECONOMY, CabinClass.BUSINESS]);
  });

  it('fromPlain creates PolicyRules', () => {
    const rules = PolicyRules.fromPlain(validProps);
    expect(rules).toBeInstanceOf(PolicyRules);
  });
});
