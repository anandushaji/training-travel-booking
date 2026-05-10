import { DomainEvent, DomainEventProps } from '@travel/shared';

interface BookingCancelledData {
  travelerId: string;
  reason: string;
  cancelledAt: string;
}

export class BookingCancelledEvent extends DomainEvent {
  readonly data: BookingCancelledData;

  constructor(props: DomainEventProps & { data: BookingCancelledData }) {
    super(props);
    this.data = props.data;
  }

  get eventName(): string {
    return 'BookingCancelled';
  }

  toEnvelope(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventName,
      aggregateId: this.aggregateId,
      occurredOn: this.occurredOn.toISOString(),
      correlationId: this.correlationId,
      causationId: this.causationId,
      version: '1.0',
      data: this.data,
    };
  }
}
