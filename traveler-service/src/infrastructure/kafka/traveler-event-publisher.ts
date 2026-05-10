import { Inject, Injectable, Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { DomainEvent, KAFKA_PRODUCER } from '@travel/shared';

const TOPIC_MAP: Record<string, string> = {
  TravelerCreated: 'traveler.created',
  TravelerUpdated: 'traveler.updated',
  TravelerDeleted: 'traveler.deleted',
};

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 200;
const MAX_DELAY_MS = 5000;
const JITTER_FACTOR = 0.2;

@Injectable()
export class TravelerEventPublisher {
  private readonly logger = new Logger(TravelerEventPublisher.name);

  constructor(
    @Inject(KAFKA_PRODUCER)
    private readonly producer: Producer,
  ) {}

  async publish(event: DomainEvent): Promise<void> {
    const topic = TOPIC_MAP[event.eventName];
    if (!topic) {
      this.logger.warn(`No topic mapping for event: ${event.eventName}`);
      return;
    }

    const message = {
      key: event.aggregateId,
      value: JSON.stringify(event),
      headers: {
        eventType: event.eventName,
        correlationId: event.correlationId ?? '',
      },
    };

    await this._publishWithRetry(topic, message, event);
  }

  private async _publishWithRetry(
    topic: string,
    message: { key: string; value: string; headers: Record<string, string> },
    event: DomainEvent,
    attempt = 1,
  ): Promise<void> {
    try {
      await this.producer.send({ topic, messages: [message] });
      this.logger.debug(`Published ${event.eventName} to ${topic}`);
    } catch (err) {
      if (attempt >= MAX_RETRIES) {
        this.logger.error(
          `Kafka publish failed after ${MAX_RETRIES} retries`,
          {
            eventType: event.eventName,
            aggregateId: event.aggregateId,
            correlationId: event.correlationId,
            error: String(err),
          },
        );
        return; // Do not propagate — caller should not fail due to Kafka
      }

      const delay = Math.min(
        BASE_DELAY_MS * Math.pow(2, attempt - 1) * (1 + JITTER_FACTOR * Math.random()),
        MAX_DELAY_MS,
      );
      this.logger.warn(
        `Kafka publish attempt ${attempt} failed, retrying in ${Math.round(delay)}ms`,
      );
      await new Promise((r) => { global.setTimeout(r, delay); });
      return this._publishWithRetry(topic, message, event, attempt + 1);
    }
  }
}
