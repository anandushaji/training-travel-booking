// @ts-nocheck
import { BookingEventPublisher } from './booking-event.publisher';
import { BookingConfirmedEvent } from '../../domain/events/booking-confirmed.event';
import { BookingCancelledEvent } from '../../domain/events/booking-cancelled.event';
import { BookingCreatedEvent } from '../../domain/events/booking-created.event';

describe('BookingEventPublisher', () => {
  let publisher: BookingEventPublisher;
  let mockProducer: any;

  beforeEach(() => {
    mockProducer = { send: jest.fn().mockResolvedValue(undefined) };
    publisher = new BookingEventPublisher(mockProducer);
  });

  it('sends to booking-events with aggregateId key', async () => {
    const event = new BookingConfirmedEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: {
        travelerId: 'trav-1',
        travelerName: 'Alice',
        travelerEmail: 'alice@example.com',
        reservationId: 'RES-001',
        paymentId: 'PAY-001',
        itinerary: {},
        totalAmount: 450,
        currency: 'USD',
        confirmedAt: new Date().toISOString(),
      },
    });
    await publisher.publishBookingConfirmed(event);
    expect(mockProducer.send).toHaveBeenCalledWith(
      expect.objectContaining({
        topic: 'booking-events',
        messages: expect.arrayContaining([
          expect.objectContaining({ key: 'booking-1' }),
        ]),
      }),
    );
  });

  it('message conforms to ADR-003 envelope', async () => {
    const event = new BookingConfirmedEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: {
        travelerId: 'trav-1',
        travelerName: 'Alice',
        travelerEmail: 'alice@example.com',
        reservationId: 'RES-001',
        paymentId: 'PAY-001',
        itinerary: {},
        totalAmount: 450,
        currency: 'USD',
        confirmedAt: new Date().toISOString(),
      },
    });
    await publisher.publishBookingConfirmed(event);
    const sentMessage = mockProducer.send.mock.calls[0][0].messages[0].value;
    const envelope = JSON.parse(sentMessage);
    expect(envelope.eventId).toBeDefined();
    expect(envelope.eventType).toBe('BookingConfirmed');
    expect(envelope.aggregateId).toBe('booking-1');
    expect(envelope.occurredOn).toBeDefined();
    expect(envelope.correlationId).toBeDefined();
    expect(envelope.causationId).toBeDefined();
    expect(envelope.version).toBe('1.0');
    expect(envelope.data).toBeDefined();
  });

  it('rethrows Kafka error after logging', async () => {
    mockProducer.send.mockRejectedValue(new Error('kafka down'));
    const event = new BookingCancelledEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: { travelerId: 'trav-1', reason: 'test', cancelledAt: new Date().toISOString() },
    });
    await expect(publisher.publishBookingCancelled(event)).rejects.toThrow('kafka down');
  });
});
