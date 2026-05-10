import { Inject, Injectable, Logger } from '@nestjs/common';
import { KAFKA_PRODUCER } from '@travel/shared';
import { Producer } from 'kafkajs';
import { PolicyValidatedEvent } from '../../domain/events/policy-validated.event';
import { PolicyViolationDetectedEvent } from '../../domain/events/policy-violation-detected.event';

const POLICY_EVENTS_TOPIC = 'policy-events';

@Injectable()
export class PolicyEventPublisher {
  private readonly logger = new Logger(PolicyEventPublisher.name);

  constructor(
    @Inject(KAFKA_PRODUCER) private readonly producer: Producer,
  ) {}

  async publishPolicyValidated(event: PolicyValidatedEvent): Promise<void> {
    const envelope = {
      eventId: event.eventId,
      eventType: event.eventName,
      aggregateId: event.aggregateId,
      occurredOn: event.occurredOn instanceof Date
        ? event.occurredOn.toISOString()
        : String(event.occurredOn),
      correlationId: event.correlationId,
      causationId: event.causationId,
      data: event.data,
    };

    try {
      await this.producer.send({
        topic: POLICY_EVENTS_TOPIC,
        messages: [
          {
            key: event.aggregateId,
            value: JSON.stringify(envelope),
          },
        ],
      });
      this.logger.debug(`Published ${event.eventName} for aggregate ${event.aggregateId}`);
    } catch (err) {
      this.logger.error(`Failed to publish ${event.eventName}: ${(err as Error).message}`);
      throw err;
    }
  }

  async publishPolicyViolationDetected(event: PolicyViolationDetectedEvent): Promise<void> {
    const envelope = {
      eventId: event.eventId,
      eventType: event.eventName,
      aggregateId: event.aggregateId,
      occurredOn: event.occurredOn instanceof Date
        ? event.occurredOn.toISOString()
        : String(event.occurredOn),
      correlationId: event.correlationId,
      causationId: event.causationId,
      data: event.data,
    };

    try {
      await this.producer.send({
        topic: POLICY_EVENTS_TOPIC,
        messages: [
          {
            key: event.aggregateId,
            value: JSON.stringify(envelope),
          },
        ],
      });
      this.logger.debug(`Published ${event.eventName} for aggregate ${event.aggregateId}`);
    } catch (err) {
      this.logger.error(`Failed to publish ${event.eventName}: ${(err as Error).message}`);
      throw err;
    }
  }
}
