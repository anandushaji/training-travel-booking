import { Injectable } from '@nestjs/common';
import * as prom from 'prom-client';

@Injectable()
export class ExpenseMetricsService {
  readonly httpRequestsTotal: prom.Counter<string>;
  readonly httpRequestDurationSeconds: prom.Histogram<string>;
  readonly receiptsGeneratedTotal: prom.Counter<string>;
  readonly receiptsVoidedTotal: prom.Counter<string>;
  readonly expenseEventsProcessedTotal: prom.Counter<string>;
  readonly kafkaMessagesProducedTotal: prom.Counter<string>;
  readonly kafkaConsumerLag: prom.Gauge<string>;

  constructor() {
    this.httpRequestsTotal = new prom.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDurationSeconds = new prom.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    });

    this.receiptsGeneratedTotal = new prom.Counter({
      name: 'receipts_generated_total',
      help: 'Total number of receipts generated',
    });

    this.receiptsVoidedTotal = new prom.Counter({
      name: 'receipts_voided_total',
      help: 'Total number of receipts voided',
    });

    this.expenseEventsProcessedTotal = new prom.Counter({
      name: 'expense_events_processed_total',
      help: 'Total number of expense events processed',
      labelNames: ['event_type', 'outcome'],
    });

    this.kafkaMessagesProducedTotal = new prom.Counter({
      name: 'kafka_messages_produced_total',
      help: 'Total number of Kafka messages produced',
      labelNames: ['topic'],
    });

    this.kafkaConsumerLag = new prom.Gauge({
      name: 'kafka_consumer_lag',
      help: 'Kafka consumer lag',
      labelNames: ['topic', 'group'],
    });
  }

  incrementReceiptsGenerated(): void {
    this.receiptsGeneratedTotal.inc();
  }

  incrementReceiptsVoided(): void {
    this.receiptsVoidedTotal.inc();
  }

  incrementExpenseEventsProcessed(eventType: string, outcome: string): void {
    this.expenseEventsProcessedTotal.labels(eventType, outcome).inc();
  }

  incrementKafkaMessagesProduced(topic: string): void {
    this.kafkaMessagesProducedTotal.labels(topic).inc();
  }

  setKafkaConsumerLag(topic: string, group: string, lag: number): void {
    this.kafkaConsumerLag.labels(topic, group).set(lag);
  }
}
