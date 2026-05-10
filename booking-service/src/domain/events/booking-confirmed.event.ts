import { DomainEvent, DomainEventProps } from '@travel/shared';

interface BookingConfirmedData {
  travelerId: string;
  travelerName: string;
  travelerEmail: string;
  reservationId: string;
  paymentId: string;
  itinerary: Record<string, unknown>;
  totalAmount: number;
  currency: string;
  confirmedAt: string;
}

export class BookingConfirmedEvent extends DomainEvent {
  readonly data: BookingConfirmedData;

  constructor(props: DomainEventProps & { data: BookingConfirmedData }) {
    super(props);
    this.data = props.data;
  }

  get eventName(): string {
    return 'BookingConfirmed';
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
