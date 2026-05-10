import { generateUuid } from '../utils/uuid.util';

export interface DomainEventProps {
  aggregateId: string;
  correlationId?: string;
  causationId?: string;
}

export abstract class DomainEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly correlationId: string;
  readonly causationId: string;

  abstract get eventName(): string;

  constructor(props: DomainEventProps) {
    this.eventId = generateUuid();
    this.aggregateId = props.aggregateId;
    this.occurredOn = new Date();
    this.correlationId = props.correlationId ?? generateUuid();
    this.causationId = props.causationId ?? this.eventId;
  }
}
