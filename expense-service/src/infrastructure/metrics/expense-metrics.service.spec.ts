import * as prom from 'prom-client';
import { ExpenseMetricsService } from './expense-metrics.service';

describe('ExpenseMetricsService', () => {
  let service: ExpenseMetricsService;

  beforeEach(() => {
    prom.register.clear();
    service = new ExpenseMetricsService();
  });

  it('increments receipts_generated_total', async () => {
    service.incrementReceiptsGenerated();
    const out = await prom.register.getSingleMetricAsString('receipts_generated_total');
    expect(out).toContain('receipts_generated_total 1');
  });

  it('increments receipts_voided_total', async () => {
    service.incrementReceiptsVoided();
    const out = await prom.register.getSingleMetricAsString('receipts_voided_total');
    expect(out).toContain('receipts_voided_total 1');
  });

  it('increments processed_total with duplicate outcome', async () => {
    service.incrementExpenseEventsProcessed('BookingConfirmed', 'duplicate');
    const out = await prom.register.getSingleMetricAsString('expense_events_processed_total');
    expect(out).toContain('event_type="BookingConfirmed"');
    expect(out).toContain('outcome="duplicate"');
    expect(out).toContain('} 1');
  });

  it('increments kafka_messages_produced_total', async () => {
    service.incrementKafkaMessagesProduced('expense-events');
    const out = await prom.register.getSingleMetricAsString('kafka_messages_produced_total');
    expect(out).toContain('topic="expense-events"');
    expect(out).toContain('} 1');
  });

  it('sets kafka_consumer_lag', async () => {
    service.setKafkaConsumerLag('booking-events', 'expense-service-consumer', 5);
    const out = await prom.register.getSingleMetricAsString('kafka_consumer_lag');
    expect(out).toContain('topic="booking-events"');
    expect(out).toContain('} 5');
  });

  it('all metrics registered', () => {
    const metrics = prom.register.getMetricsAsArray();
    const names = metrics.map((m) => m.name);
    expect(names).toContain('http_requests_total');
    expect(names).toContain('receipts_generated_total');
    expect(names).toContain('expense_events_processed_total');
    expect(names).toContain('kafka_messages_produced_total');
    expect(names).toContain('kafka_consumer_lag');
  });
});
