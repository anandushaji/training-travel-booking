import { DomainException } from '@travel/shared';

export enum CabinClass {
  ECONOMY = 'ECONOMY',
  PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
  BUSINESS = 'BUSINESS',
  FIRST = 'FIRST',
}

export interface PolicyViolation {
  rule: string;
  severity: 'ERROR' | 'WARNING';
  message: string;
}

export interface PolicyRulesProps {
  maxFlightCost: number;
  allowedCabinClasses: CabinClass[];
  advanceBookingDays: number;
  requiresApproval: boolean;
  approvalThreshold: number;
  allowInternational: boolean;
}

export class PolicyRules {
  readonly maxFlightCost: number;
  readonly allowedCabinClasses: CabinClass[];
  readonly advanceBookingDays: number;
  readonly requiresApproval: boolean;
  readonly approvalThreshold: number;
  readonly allowInternational: boolean;

  constructor(props: PolicyRulesProps) {
    const validCabinClasses = Object.values(CabinClass);
    for (const cc of props.allowedCabinClasses) {
      if (!validCabinClasses.includes(cc)) {
        throw new DomainException(
          `Invalid cabin class: "${cc}"`,
          'INVALID_CABIN_CLASS',
          400,
          { value: cc },
        );
      }
    }
    this.maxFlightCost = props.maxFlightCost;
    this.allowedCabinClasses = [...props.allowedCabinClasses];
    this.advanceBookingDays = props.advanceBookingDays;
    this.requiresApproval = props.requiresApproval;
    this.approvalThreshold = props.approvalThreshold;
    this.allowInternational = props.allowInternational;
  }

  toPlain(): PolicyRulesProps {
    return {
      maxFlightCost: this.maxFlightCost,
      allowedCabinClasses: [...this.allowedCabinClasses],
      advanceBookingDays: this.advanceBookingDays,
      requiresApproval: this.requiresApproval,
      approvalThreshold: this.approvalThreshold,
      allowInternational: this.allowInternational,
    };
  }

  static fromPlain(props: PolicyRulesProps): PolicyRules {
    return new PolicyRules(props);
  }
}
