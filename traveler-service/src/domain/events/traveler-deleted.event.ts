import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface TravelerDeletedData {
  travelerId: string;
  deletedAt: string;
}

interface TravelerDeletedProps extends DomainEventProps {
  data: TravelerDeletedData;
}

export class TravelerDeletedEvent extends DomainEvent {
  readonly version = '1';
  readonly data: TravelerDeletedData;

  get eventName(): string {
    return 'TravelerDeleted';
  }

  constructor(props: TravelerDeletedProps) {
    super(props);
    this.data = props.data;
  }
}
