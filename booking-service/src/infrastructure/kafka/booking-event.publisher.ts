import { Inject, Injectable, Logger } from '@nestjs/common';
import { KAFKA_PRODUCER } from '@travel/shared';
import { Producer } from 'kafkajs';
import { BookingCreatedEvent } from '../../domain/events/booking-created.event';
import { BookingConfirmedEvent } from '../../domain/events/booking-confirmed.event';
import { BookingCancelledEvent } from '../../domain/events/booking-cancelled.event';

const BOOKING_EVENTS_TOPIC = 'booking-events';

@Injectable()
export class BookingEventPublisher {
  private readonly logger = new Logger(BookingEventPublisher.name);

  constructor(
    @Inject(KAFKA_PRODUCER) private readonly producer: Producer,
  ) {}

  async publishBookingCreated(event: BookingCreatedEvent): Promise<void> {
    await this.publish(event.toEnvelope(), event.aggregateId, event.eventName);
  }

  async publishBookingConfirmed(event: BookingConfirmedEvent): Promise<void> {
    await this.publish(event.toEnvelope(), event.aggregateId, event.eventName);
  }

  async publishBookingCancelled(event: BookingCancelledEvent): Promise<void> {
    await this.publish(event.toEnvelope(), event.aggregateId, event.eventName);
  }

  private async publish(envelope: Record<string, unknown>, key: string, eventType: string): Promise<void> {
    try {
      await this.producer.send({
        topic: BOOKING_EVENTS_TOPIC,
        messages: [
          {
            key,
            value: JSON.stringify(envelope),
          },
        ],
      });
      this.logger.debug(`Published ${eventType} for aggregate ${key}`);
    } catch (err) {
      this.logger.error(`Failed to publish ${eventType}: ${(err as Error).message}`);
      throw err;
    }
  }
}
