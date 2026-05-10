import { TravelerEventPublisher } from './traveler-event-publisher';
import { TravelerCreatedEvent } from '../../domain/events/traveler-created.event';
import { TravelerUpdatedEvent } from '../../domain/events/traveler-updated.event';
import { TravelerDeletedEvent } from '../../domain/events/traveler-deleted.event';

// Speed up retry delays in tests
jest.useFakeTimers();

const makeProducer = () => ({
  send: jest.fn(),
});

const buildCreatedEvent = () =>
  new TravelerCreatedEvent({
    aggregateId: 'traveler-uuid-1',
    correlationId: 'corr-123',
    data: {
      travelerId: 'traveler-uuid-1',
      employeeId: 'EMP-001',
      name: 'Alice',
      email: 'alice@corp.com',
      department: 'Eng',
      role: 'EMPLOYEE',
    },
  });

const buildUpdatedEvent = () =>
  new TravelerUpdatedEvent({
    aggregateId: 'traveler-uuid-1',
    correlationId: 'corr-456',
    data: {
      travelerId: 'traveler-uuid-1',
      changedFields: ['name'],
      snapshot: { name: 'Alice2', email: 'alice@corp.com', department: 'Eng', role: 'EMPLOYEE' },
    },
  });

describe('TravelerEventPublisher', () => {
  beforeEach(() => jest.clearAllMocks());

  afterAll(() => jest.useRealTimers());

  it('should publish to traveler.created with travelerId as message key', async () => {
    const producer = makeProducer();
    producer.send.mockResolvedValue([]);
    const publisher = new TravelerEventPublisher(producer as never);

    await publisher.publish(buildCreatedEvent());

    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'traveler.created',
        messages: [expect.objectContaining({ key: 'traveler-uuid-1' })],
      }),
    );
  });

  it('should use travelerId as key for TravelerUpdated event', async () => {
    const producer = makeProducer();
    producer.send.mockResolvedValue([]);
    const publisher = new TravelerEventPublisher(producer as never);

    await publisher.publish(buildUpdatedEvent());

    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'traveler.updated',
        messages: [expect.objectContaining({ key: 'traveler-uuid-1' })],
      }),
    );
  });

  it('should emit error log with eventType aggregateId and correlationId after retries exhausted', async () => {
    const producer = makeProducer();
    producer.send.mockRejectedValue(new Error('broker unavailable'));
    const publisher = new TravelerEventPublisher(producer as never);

    const logSpy = jest.spyOn((publisher as any).logger, 'error');

    const publishPromise = publisher.publish(buildCreatedEvent());

    // Advance timers through all retry delays
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
      jest.runAllTimers();
    }
    await publishPromise;

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('retries'),
      expect.objectContaining({
        eventType: 'TravelerCreated',
        aggregateId: 'traveler-uuid-1',
        correlationId: 'corr-123',
      }),
    );
  });

  it('should succeed on second attempt after one transient failure', async () => {
    const producer = makeProducer();
    let calls = 0;
    producer.send.mockImplementation(async () => {
      calls++;
      if (calls === 1) throw new Error('transient');
      return [];
    });
    const publisher = new TravelerEventPublisher(producer as never);

    const publishPromise = publisher.publish(buildCreatedEvent());
    await Promise.resolve();
    jest.runAllTimers();
    await Promise.resolve();
    jest.runAllTimers();
    await publishPromise;

    expect(producer.send).toHaveBeenCalledTimes(2);
  });

  it('should not publish to unknown event type', async () => {
    const producer = makeProducer();
    const publisher = new TravelerEventPublisher(producer as never);

    // Create a fake domain event with an unknown name
    const fakeEvent = {
      eventName: 'UnknownEvent',
      aggregateId: 'id-1',
      correlationId: undefined,
    } as never;

    await publisher.publish(fakeEvent);
    expect(producer.send).not.toHaveBeenCalled();
  });

  it('should publish TravelerDeleted to traveler.deleted topic', async () => {
    const producer = makeProducer();
    producer.send.mockResolvedValue([]);
    const publisher = new TravelerEventPublisher(producer as never);

    const event = new TravelerDeletedEvent({
      aggregateId: 'traveler-uuid-1',
      correlationId: 'corr-789',
      data: { travelerId: 'traveler-uuid-1', deletedAt: new Date().toISOString() },
    });
    await publisher.publish(event);

    expect(producer.send).toHaveBeenCalledWith(
      expect.objectContaining({ topic: 'traveler.deleted' }),
    );
  });
});
