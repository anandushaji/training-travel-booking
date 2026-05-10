import { InventoryEventPublisher } from './inventory-event.publisher';
import { MetricsService } from '../observability/metrics.service';
import { FlightReservedEvent } from '../../domain/events/flight-reserved.event';

const mockProducer = () => ({
  send: jest.fn().mockResolvedValue(undefined),
});

const mockMetrics = (): jest.Mocked<MetricsService> =>
  ({
    incrementKafkaPublished: jest.fn(),
  } as unknown as jest.Mocked<MetricsService>);

const makeEvent = () =>
  new FlightReservedEvent({
    aggregateId: 'res-uuid-1',
    correlationId: 'corr-1',
    causationId: 'cause-1',
    data: {
      reservationId: 'res-uuid-1',
      offerId: 'offer-1',
      passengerId: 'pax-uuid-1',
      origin: 'LHR',
      destination: 'JFK',
      flightNumber: 'BA117',
      carrier: 'BA',
      departureAt: '2026-07-01T10:00:00Z',
      arrivalAt: '2026-07-01T13:00:00Z',
      cabinClass: 'ECONOMY',
      expiresAt: '2026-07-01T10:15:00Z',
    },
  });

describe('InventoryEventPublisher', () => {
  let publisher: InventoryEventPublisher;
  let producer: ReturnType<typeof mockProducer>;
  let metrics: jest.Mocked<MetricsService>;

  beforeEach(() => {
    producer = mockProducer();
    metrics = mockMetrics();
    publisher = new InventoryEventPublisher(producer as never, metrics);
  });

  it('should produce FlightReserved message to inventory-events topic with complete ADR-003 schema', async () => {
    const event = makeEvent();
    await publisher.publish(event);

    expect(producer.send).toHaveBeenCalledTimes(1);
    const call = producer.send.mock.calls[0]![0];
    expect(call.topic).toBe('inventory-events');
    const payload = JSON.parse(call.messages[0].value as string);
    expect(payload).toMatchObject({
      eventId: expect.any(String),
      eventType: 'FlightReserved',
      aggregateId: 'res-uuid-1',
      occurredOn: expect.any(String),
      correlationId: 'corr-1',
      causationId: 'cause-1',
      data: expect.objectContaining({ reservationId: 'res-uuid-1' }),
    });
  });

  it('should re-throw and increment failure counter when Kafka producer fails', async () => {
    const event = makeEvent();
    producer.send.mockRejectedValue(new Error('Kafka down'));

    await expect(publisher.publish(event)).rejects.toThrow('Kafka down');
    expect(metrics.incrementKafkaPublished).toHaveBeenCalledWith(
      'inventory-events',
      'FlightReserved',
      'failure',
    );
  });

  it('should increment kafka_events_published_total success counter on successful publish', async () => {
    const event = makeEvent();
    await publisher.publish(event);
    expect(metrics.incrementKafkaPublished).toHaveBeenCalledWith(
      'inventory-events',
      'FlightReserved',
      'success',
    );
  });

  it('should use empty string for correlationId and causationId when absent from event', async () => {
    const event = new FlightReservedEvent({
      aggregateId: 'res-uuid-2',
      // no correlationId or causationId
      data: {
        reservationId: 'res-uuid-2',
        offerId: 'offer-2',
        passengerId: 'pax-uuid-2',
        origin: 'CDG',
        destination: 'BKK',
        flightNumber: 'AF001',
        carrier: 'AF',
        departureAt: '2026-07-02T10:00:00Z',
        arrivalAt: '2026-07-02T22:00:00Z',
        cabinClass: 'BUSINESS',
        expiresAt: '2026-07-02T10:15:00Z',
      },
    });

    // Force correlationId and causationId to undefined to trigger the ?? '' branches
    (event as unknown as Record<string, unknown>)['correlationId'] = undefined;
    (event as unknown as Record<string, unknown>)['causationId'] = undefined;

    await publisher.publish(event);

    const call = producer.send.mock.calls[0]![0];
    const payload = JSON.parse(call.messages[0].value as string);
    expect(payload.correlationId).toBe('');
    expect(payload.causationId).toBe('');
  });

  it('should serialise occurredOn as ISO string when it is not a Date instance', async () => {
    const event = makeEvent();
    // Coerce occurredOn to a plain string to exercise the non-Date branch
    (event as unknown as Record<string, unknown>)['occurredOn'] = '2026-07-01T10:00:00.000Z';

    await publisher.publish(event);

    const call = producer.send.mock.calls[0]![0];
    const payload = JSON.parse(call.messages[0].value as string);
    expect(typeof payload.occurredOn).toBe('string');
  });
});
