import { DomainEvent, DomainEventProps } from '@travel/shared';

interface BookingCreatedData {
  travelerId: string;
  offerId: string;
  itinerary: Record<string, unknown>;
  totalAmount: number;
  currency: string;
}

export class BookingCreatedEvent extends DomainEvent {
  readonly data: BookingCreatedData;

  constructor(props: DomainEventProps & { data: BookingCreatedData }) {
    super(props);
    this.data = props.data;
  }

  get eventName(): string {
    return 'BookingCreated';
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
