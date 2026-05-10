import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface ReceiptGeneratedData {
  bookingId: string;
  travelerId: string;
  receiptNumber: string;
  amount: number;
  currency: string;
}

export class ReceiptGeneratedEvent extends DomainEvent {
  readonly data: ReceiptGeneratedData;

  constructor(props: DomainEventProps & { data: ReceiptGeneratedData }) {
    super(props);
    this.data = props.data;
  }

  get eventName(): string {
    return 'ReceiptGenerated';
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
