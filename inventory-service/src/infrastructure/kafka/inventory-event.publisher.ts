import { Inject, Injectable, Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { DomainEvent, KAFKA_PRODUCER } from '@travel/shared';
import { MetricsService } from '../observability/metrics.service';

const TOPIC = 'inventory-events';

@Injectable()
export class InventoryEventPublisher {
  private readonly logger = new Logger(InventoryEventPublisher.name);

  constructor(
    @Inject(KAFKA_PRODUCER)
    private readonly producer: Producer,
    private readonly metrics: MetricsService,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const message = {
      key: event.aggregateId,
      value: JSON.stringify({
        eventId: event.eventId,
        eventType: event.eventName,
        aggregateId: event.aggregateId,
        occurredOn: event.occurredOn instanceof Date ? event.occurredOn.toISOString() : String(event.occurredOn),
        correlationId: event.correlationId ?? '',
        causationId: event.causationId ?? '',
        data: (event as DomainEvent & { data?: unknown }).data ?? {},
      }),
      headers: {
        eventType: event.eventName,
        correlationId: event.correlationId ?? '',
      },
    };

    try {
      await this.producer.send({ topic: TOPIC, messages: [message] });
      this.metrics.incrementKafkaPublished(TOPIC, event.eventName, 'success');
      this.logger.log(`Published ${event.eventName} to ${TOPIC}`);
    } catch (err) {
      this.metrics.incrementKafkaPublished(TOPIC, event.eventName, 'failure');
      this.logger.error('kafka_publish_failed', {
        eventType: event.eventName,
        aggregateId: event.aggregateId,
        error: String(err),
      });
      throw err;
    }
  }
}
