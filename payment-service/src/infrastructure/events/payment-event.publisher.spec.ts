import { PaymentEventPublisher } from './payment-event.publisher';
import { MetricsService } from '../observability/metrics.service';
import { PaymentAuthorizedEvent } from '../../domain/events/payment-authorized.event';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';

describe('PaymentEventPublisher', () => {
  let publisher: PaymentEventPublisher;
  let mockProducer: jest.Mocked<any>;
  let mockMetrics: jest.Mocked<MetricsService>;

  beforeEach(() => {
    mockProducer = { send: jest.fn().mockResolvedValue(undefined) };
    mockMetrics = {
      incrementKafkaEventsPublished: jest.fn(),
    } as unknown as jest.Mocked<MetricsService>;
    publisher = new PaymentEventPublisher(mockProducer, mockMetrics);
  });

  it('should publish PaymentAuthorized event with correct ADR-003 schema to payment-events topic', async () => {
    const event = new PaymentAuthorizedEvent({
      aggregateId: TEST_UUID,
      data: {
        paymentId: TEST_UUID,
        bookingId: TEST_UUID,
        travelerId: TEST_UUID,
        amount: 350.00,
        currency: 'USD',
        stripePaymentIntentId: 'pi_abc',
      },
    });

    await publisher.publish(event);

    expect(mockProducer.send).toHaveBeenCalledTimes(1);
    const call = mockProducer.send.mock.calls[0][0];
    expect(call.topic).toBe('payment-events');

    const message = call.messages[0];
    const parsed = JSON.parse(message.value);

    // ADR-003 envelope fields
    expect(parsed).toHaveProperty('eventId');
    expect(parsed).toHaveProperty('eventType', 'PaymentAuthorized');
    expect(parsed).toHaveProperty('aggregateId', TEST_UUID);
    expect(parsed).toHaveProperty('occurredOn');
    expect(parsed).toHaveProperty('correlationId');
    expect(parsed).toHaveProperty('causationId');
    expect(parsed).toHaveProperty('data');
    expect(parsed.data).toHaveProperty('paymentId', TEST_UUID);
  });

  it('should use paymentId as Kafka message key', async () => {
    const event = new PaymentAuthorizedEvent({
      aggregateId: TEST_UUID,
      data: {
        paymentId: TEST_UUID,
        bookingId: TEST_UUID,
        travelerId: TEST_UUID,
        amount: 350.00,
        currency: 'USD',
        stripePaymentIntentId: 'pi_abc',
      },
    });

    await publisher.publish(event);

    const message = mockProducer.send.mock.calls[0][0].messages[0];
    expect(message.key).toBe(TEST_UUID);
  });

  it('should increment kafka_events_published_total with event_type label', async () => {
    const event = new PaymentAuthorizedEvent({
      aggregateId: TEST_UUID,
      data: {
        paymentId: TEST_UUID,
        bookingId: TEST_UUID,
        travelerId: TEST_UUID,
        amount: 350.00,
        currency: 'USD',
        stripePaymentIntentId: 'pi_abc',
      },
    });

    await publisher.publish(event);

    expect(mockMetrics.incrementKafkaEventsPublished).toHaveBeenCalledWith(
      'payment-events',
      'PaymentAuthorized',
    );
  });

  it('should fallback to String() when occurredOn is not a Date instance', async () => {
    const event = new PaymentAuthorizedEvent({
      aggregateId: TEST_UUID,
      data: {
        paymentId: TEST_UUID,
        bookingId: TEST_UUID,
        travelerId: TEST_UUID,
        amount: 350.00,
        currency: 'USD',
        stripePaymentIntentId: 'pi_abc',
      },
    });
    // Override the readonly occurredOn with a non-Date value
    (event as any).occurredOn = '2024-01-01T00:00:00.000Z';

    await publisher.publish(event);

    const message = mockProducer.send.mock.calls[0]![0].messages[0];
    const parsed = JSON.parse(message.value);
    expect(parsed.occurredOn).toBe('2024-01-01T00:00:00.000Z');
  });
});
