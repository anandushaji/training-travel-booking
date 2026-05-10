import { Injectable, Logger } from '@nestjs/common';
import { Producer } from 'kafkajs';
import { Inject } from '@nestjs/common';
import { KAFKA_PRODUCER } from '@travel/shared';
import { ReceiptGeneratedEvent } from '../../domain/events/receipt-generated.event';
import { ExpenseRecordedEvent } from '../../domain/events/expense-recorded.event';
import { ExpenseMetricsService } from '../metrics/expense-metrics.service';

const EXPENSE_EVENTS_TOPIC = 'expense-events';

@Injectable()
export class ExpenseEventPublisher {
  private readonly logger = new Logger(ExpenseEventPublisher.name);

  constructor(
    @Inject(KAFKA_PRODUCER) private readonly producer: Producer,
    private readonly metrics: ExpenseMetricsService,
  ) {}

  async publishReceiptGenerated(event: ReceiptGeneratedEvent): Promise<void> {
    await this.publish(event.toEnvelope(), event.aggregateId, event.eventName);
  }

  async publishExpenseRecorded(event: ExpenseRecordedEvent): Promise<void> {
    await this.publish(event.toEnvelope(), event.aggregateId, event.eventName);
  }

  private async publish(
    envelope: Record<string, unknown>,
    key: string,
    eventType: string,
  ): Promise<void> {
    try {
      await this.producer.send({
        topic: EXPENSE_EVENTS_TOPIC,
        messages: [
          {
            key,
            value: JSON.stringify(envelope),
          },
        ],
      });
      this.metrics.incrementKafkaMessagesProduced(EXPENSE_EVENTS_TOPIC);
      this.logger.debug(`Published ${eventType} for aggregate ${key}`);
    } catch (err) {
      this.logger.error(
        `Failed to publish ${eventType} to ${EXPENSE_EVENTS_TOPIC}: ${(err as Error).message}`,
      );
      // Best-effort: do NOT rethrow
    }
  }
}
