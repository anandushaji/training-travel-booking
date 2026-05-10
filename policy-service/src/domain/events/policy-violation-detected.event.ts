import { DomainEvent, DomainEventProps } from '@travel/shared';
import { PolicyViolation } from '../value-objects/policy-rules.value-object';

export interface PolicyViolationDetectedData {
  travelerId: string;
  policyId: string;
  violations: PolicyViolation[];
  requiresApproval: boolean;
}

export class PolicyViolationDetectedEvent extends DomainEvent {
  readonly data: PolicyViolationDetectedData;

  get eventName(): string {
    return 'PolicyViolationDetected';
  }

  constructor(props: DomainEventProps & { data: PolicyViolationDetectedData }) {
    super(props);
    this.data = props.data;
  }
}
