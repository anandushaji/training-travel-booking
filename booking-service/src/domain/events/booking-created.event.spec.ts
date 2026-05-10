// @ts-nocheck
import { BookingCreatedEvent } from './booking-created.event';

describe('BookingCreatedEvent', () => {
  it('serialises ADR-003 envelope', () => {
    const event = new BookingCreatedEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: {
        travelerId: 'traveler-1',
        offerId: 'offer-1',
        itinerary: { origin: 'JFK', destination: 'LAX' },
        totalAmount: 450,
        currency: 'USD',
      },
    });
    const envelope = event.toEnvelope();
    expect(envelope['eventId']).toBeDefined();
    expect(envelope['eventType']).toBe('BookingCreated');
    expect(envelope['aggregateId']).toBe('booking-1');
    expect(envelope['occurredOn']).toBeDefined();
    expect(envelope['correlationId']).toBe('corr-1');
    expect(envelope['causationId']).toBeDefined();
    expect(envelope['version']).toBe('1.0');
    expect(envelope['data']).toBeDefined();
  });
});
