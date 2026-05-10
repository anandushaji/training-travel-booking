import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface ExpenseRecordedData {
  bookingId: string;
  travelerId: string;
  amount: number;
  currency: string;
  status: 'ACTIVE' | 'CANCELLED';
}

export class ExpenseRecordedEvent extends DomainEvent {
  readonly data: ExpenseRecordedData;

  constructor(props: DomainEventProps & { data: ExpenseRecordedData }) {
    super(props);
    this.data = props.data;
  }

  get eventName(): string {
    return 'ExpenseRecorded';
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
