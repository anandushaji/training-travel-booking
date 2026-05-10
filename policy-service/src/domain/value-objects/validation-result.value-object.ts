import { PolicyViolation } from './policy-rules.value-object';

export class ValidationResult {
  readonly valid: boolean;
  readonly violations: PolicyViolation[];
  readonly requiresApproval: boolean;

  private constructor(valid: boolean, violations: PolicyViolation[], requiresApproval: boolean) {
    this.valid = valid;
    this.violations = violations;
    this.requiresApproval = requiresApproval;
  }

  static pass(requiresApproval = false): ValidationResult {
    return new ValidationResult(true, [], requiresApproval);
  }

  static fail(violations: PolicyViolation[], requiresApproval = false): ValidationResult {
    return new ValidationResult(false, violations, requiresApproval);
  }
}
