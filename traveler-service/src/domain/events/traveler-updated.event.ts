import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface TravelerUpdatedData {
  travelerId: string;
  changedFields: string[];
  snapshot: {
    name: string;
    email: string;
    department: string;
    role: string;
  };
}

interface TravelerUpdatedProps extends DomainEventProps {
  data: TravelerUpdatedData;
}

export class TravelerUpdatedEvent extends DomainEvent {
  readonly version = '1';
  readonly data: TravelerUpdatedData;

  get eventName(): string {
    return 'TravelerUpdated';
  }

  constructor(props: TravelerUpdatedProps) {
    super(props);
    this.data = props.data;
  }
}
