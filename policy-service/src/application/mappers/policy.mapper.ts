import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { PolicyResponseDto } from '../dtos/policy-response.dto';

export class PolicyMapper {
  static toDto(policy: TravelPolicy): PolicyResponseDto {
    return {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      department: policy.department,
      rules: {
        maxFlightCost: policy.rules.maxFlightCost,
        allowedCabinClasses: [...policy.rules.allowedCabinClasses],
        advanceBookingDays: policy.rules.advanceBookingDays,
        requiresApproval: policy.rules.requiresApproval,
        approvalThreshold: policy.rules.approvalThreshold,
        allowInternational: policy.rules.allowInternational,
      },
      active: policy.active,
      createdBy: policy.createdBy,
      version: policy.version,
      createdAt: policy.createdAt.toISOString(),
      updatedAt: policy.updatedAt.toISOString(),
    };
  }
}
