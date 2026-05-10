import { PolicyViolation } from '../../domain/value-objects/policy-rules.value-object';

export interface PolicyValidationResponseDto {
  valid: boolean;
  violations: PolicyViolation[];
  requiresApproval: boolean;
  policyId: string | null;
  department: string;
}
