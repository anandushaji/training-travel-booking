import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';

export interface PolicyRulesResponseDto {
  maxFlightCost: number;
  allowedCabinClasses: CabinClass[];
  advanceBookingDays: number;
  requiresApproval: boolean;
  approvalThreshold: number;
  allowInternational: boolean;
}

export interface PolicyResponseDto {
  id: string;
  name: string;
  description: string | null;
  department: string;
  rules: PolicyRulesResponseDto;
  active: boolean;
  createdBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
