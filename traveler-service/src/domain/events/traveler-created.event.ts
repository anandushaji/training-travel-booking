import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface TravelerCreatedData {
  travelerId: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
}

interface TravelerCreatedProps extends DomainEventProps {
  data: TravelerCreatedData;
}

export class TravelerCreatedEvent extends DomainEvent {
  readonly version = '1';
  readonly data: TravelerCreatedData;

  get eventName(): string {
    return 'TravelerCreated';
  }

  constructor(props: TravelerCreatedProps) {
    super(props);
    this.data = props.data;
  }
}
