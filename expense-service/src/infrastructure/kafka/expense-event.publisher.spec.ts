import * as prom from 'prom-client';
import { ExpenseEventPublisher } from './expense-event.publisher';
import { ExpenseMetricsService } from '../metrics/expense-metrics.service';
import { ReceiptGeneratedEvent } from '../../domain/events/receipt-generated.event';
import { ExpenseRecordedEvent } from '../../domain/events/expense-recorded.event';

describe('ExpenseEventPublisher', () => {
  let publisher: ExpenseEventPublisher;
  let mockProducer: { send: jest.Mock };
  let metrics: ExpenseMetricsService;

  beforeEach(() => {
    prom.register.clear();
    mockProducer = { send: jest.fn().mockResolvedValue(undefined) };
    metrics = new ExpenseMetricsService();
    publisher = new ExpenseEventPublisher(mockProducer as any, metrics);
  });

  function makeReceiptGeneratedEvent(): ReceiptGeneratedEvent {
    return new ReceiptGeneratedEvent({
      aggregateId: 'receipt-id-1',
      correlationId: 'corr-1',
      data: {
        bookingId: 'booking-1',
        travelerId: 'traveler-1',
        receiptNumber: 'RCP-2026-000001',
        amount: 450.0,
        currency: 'USD',
      },
    });
  }

  it('sends to expense-events with aggregateId key', async () => {
    const event = makeReceiptGeneratedEvent();
    await publisher.publishReceiptGenerated(event);

    expect(mockProducer.send).toHaveBeenCalledWith({
      topic: 'expense-events',
      messages: [expect.objectContaining({ key: 'receipt-id-1' })],
    });
  });

  it('ReceiptGenerated message has receiptNumber in data', async () => {
    const event = makeReceiptGeneratedEvent();
    await publisher.publishReceiptGenerated(event);

    const call = mockProducer.send.mock.calls[0][0];
    const message = call.messages[0];
    const parsed = JSON.parse(message.value);
    expect(parsed.data.receiptNumber).toBe('RCP-2026-000001');
  });

  it('Kafka error is swallowed after logging', async () => {
    mockProducer.send.mockRejectedValueOnce(new Error('Kafka broker down'));
    const event = makeReceiptGeneratedEvent();
    // Must NOT throw
    await expect(publisher.publishReceiptGenerated(event)).resolves.toBeUndefined();
  });

  it('increments kafka_messages_produced_total on success', async () => {
    const event = makeReceiptGeneratedEvent();
    const before = await prom.register.getSingleMetricAsString(
      'kafka_messages_produced_total',
    );
    await publisher.publishReceiptGenerated(event);
    const metrics_out = await prom.register.getSingleMetricAsString(
      'kafka_messages_produced_total',
    );
    expect(metrics_out).toContain('topic="expense-events"');
    expect(metrics_out).toContain('} 1');
  });

  it('publishExpenseRecorded sends to expense-events', async () => {
    const event = new ExpenseRecordedEvent({
      aggregateId: 'expense-id-1',
      data: {
        bookingId: 'booking-1',
        travelerId: 'traveler-1',
        amount: 450,
        currency: 'USD',
        status: 'ACTIVE',
      },
    });
    await publisher.publishExpenseRecorded(event);
    expect(mockProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'expense-events' }),
    );
  });
});
