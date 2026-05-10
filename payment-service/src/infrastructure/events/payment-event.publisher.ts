import { Inject, Injectable, Logger } from '@nestjs/common';
import { KAFKA_PRODUCER } from '@travel/shared';
import { Producer } from 'kafkajs';
import { PaymentAuthorizedEvent } from '../../domain/events/payment-authorized.event';
import { PaymentCapturedEvent } from '../../domain/events/payment-captured.event';
import { PaymentRefundedEvent } from '../../domain/events/payment-refunded.event';
import { PaymentFailedEvent } from '../../domain/events/payment-failed.event';
import { MetricsService } from '../observability/metrics.service';

const PAYMENT_EVENTS_TOPIC = 'payment-events';

type PaymentDomainEvent =
  | PaymentAuthorizedEvent
  | PaymentCapturedEvent
  | PaymentRefundedEvent
  | PaymentFailedEvent;

@Injectable()
export class PaymentEventPublisher {
  private readonly logger = new Logger(PaymentEventPublisher.name);

  constructor(
    @Inject(KAFKA_PRODUCER) private readonly producer: Producer,
    private readonly metrics: MetricsService,
  ) {}

  async publish(event: PaymentDomainEvent): Promise<void> {
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

    await this.producer.send({
      topic: PAYMENT_EVENTS_TOPIC,
      messages: [
        {
          key: event.aggregateId,
          value: JSON.stringify(envelope),
        },
      ],
    });

    this.metrics.incrementKafkaEventsPublished(PAYMENT_EVENTS_TOPIC, event.eventName);
    this.logger.debug(`Published ${event.eventName} for payment ${event.aggregateId}`);
  }
}
