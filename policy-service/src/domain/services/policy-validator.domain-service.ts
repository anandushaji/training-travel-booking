import { Injectable } from '@nestjs/common';
import { TravelPolicy } from '../aggregates/travel-policy.aggregate';
import { CabinClass, PolicyViolation } from '../value-objects/policy-rules.value-object';
import { ValidationResult } from '../value-objects/validation-result.value-object';

export interface PolicyValidationRequest {
  travelerId: string;
  amount: number;
  cabinClass?: CabinClass;
  origin?: string;
  destination?: string;
  advanceBookingDays?: number;
}

@Injectable()
export class PolicyValidatorDomainService {
  validate(
    request: PolicyValidationRequest,
    policy: TravelPolicy | null,
  ): ValidationResult {
    if (policy === null) {
      return ValidationResult.pass();
    }

    const violations: PolicyViolation[] = [];

    // Rule 1: cabinClass must be in allowedCabinClasses
    if (request.cabinClass !== undefined) {
      if (!policy.rules.allowedCabinClasses.includes(request.cabinClass)) {
        violations.push({
          rule: 'cabinClass',
          severity: 'ERROR',
          message: `Cabin class "${request.cabinClass}" is not allowed. Allowed: ${policy.rules.allowedCabinClasses.join(', ')}`,
        });
      }
    }

    // Rule 2: amount must be <= maxFlightCost
    if (request.amount > policy.rules.maxFlightCost) {
      violations.push({
        rule: 'maxFlightCost',
        severity: 'ERROR',
        message: `Amount ${request.amount} exceeds maximum allowed flight cost ${policy.rules.maxFlightCost}`,
      });
    }

    // Rule 3: advanceBookingDays must be >= policy.rules.advanceBookingDays
    if (request.advanceBookingDays !== undefined) {
      if (request.advanceBookingDays < policy.rules.advanceBookingDays) {
        violations.push({
          rule: 'advanceBookingDays',
          severity: 'ERROR',
          message: `Advance booking days ${request.advanceBookingDays} is below the minimum of ${policy.rules.advanceBookingDays}`,
        });
      }
    }

    // Rule 4: allowInternational — WARNING if international route detected and not allowed
    if (!policy.rules.allowInternational) {
      const origin = request.origin ?? '';
      const destination = request.destination ?? '';
      const isLikelyInternational =
        origin.length === 2 &&
        destination.length === 2 &&
        origin.toUpperCase() !== destination.toUpperCase();
      if (isLikelyInternational) {
        violations.push({
          rule: 'allowInternational',
          severity: 'WARNING',
          message: `International travel may not be permitted under this policy`,
        });
      }
    }

    // Check requiresApproval
    const requiresApproval =
      policy.rules.requiresApproval ||
      request.amount > policy.rules.approvalThreshold;

    if (violations.length > 0) {
      return ValidationResult.fail(violations, requiresApproval);
    }

    return ValidationResult.pass(requiresApproval);
  }
}
