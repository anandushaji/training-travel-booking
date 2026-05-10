import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface PolicyValidatedData {
  travelerId: string;
  policyId: string | null;
  valid: true;
  violations: [];
}

export class PolicyValidatedEvent extends DomainEvent {
  readonly data: PolicyValidatedData;

  get eventName(): string {
    return 'PolicyValidated';
  }

  constructor(props: DomainEventProps & { data: PolicyValidatedData }) {
    super(props);
    this.data = props.data;
  }
}
