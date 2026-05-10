import { ValidationResult } from './validation-result.value-object';
import { PolicyViolation } from './policy-rules.value-object';

describe('ValidationResult value object', () => {
  it('pass returns valid true', () => {
    const result = ValidationResult.pass();
    expect(result.valid).toBe(true);
    expect(result.violations).toEqual([]);
    expect(result.requiresApproval).toBe(false);
  });

  it('pass with requiresApproval=true', () => {
    const result = ValidationResult.pass(true);
    expect(result.valid).toBe(true);
    expect(result.requiresApproval).toBe(true);
  });

  it('fail sets valid false with violations', () => {
    const violations: PolicyViolation[] = [
      { rule: 'cabinClass', severity: 'ERROR', message: 'Cabin class not allowed' },
    ];
    const result = ValidationResult.fail(violations);
    expect(result.valid).toBe(false);
    expect(result.violations).toEqual(violations);
    expect(result.violations).toHaveLength(1);
  });

  it('fail preserves all violations', () => {
    const violations: PolicyViolation[] = [
      { rule: 'cabinClass', severity: 'ERROR', message: 'err1' },
      { rule: 'maxFlightCost', severity: 'ERROR', message: 'err2' },
    ];
    const result = ValidationResult.fail(violations);
    expect(result.violations).toHaveLength(2);
  });

  it('fail with requiresApproval', () => {
    const violations: PolicyViolation[] = [
      { rule: 'maxFlightCost', severity: 'ERROR', message: 'Too expensive' },
    ];
    const result = ValidationResult.fail(violations, true);
    expect(result.requiresApproval).toBe(true);
  });
});
