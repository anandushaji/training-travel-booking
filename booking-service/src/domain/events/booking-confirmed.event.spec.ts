// @ts-nocheck
import { BookingConfirmedEvent } from './booking-confirmed.event';

describe('BookingConfirmedEvent', () => {
  it('data contains travelerName and paymentId', () => {
    const event = new BookingConfirmedEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: {
        travelerId: 'traveler-1',
        travelerName: 'Alice Smith',
        travelerEmail: 'alice@example.com',
        reservationId: 'RES-001',
        paymentId: 'PAY-001',
        itinerary: { origin: 'JFK', destination: 'LAX' },
        totalAmount: 450,
        currency: 'USD',
        confirmedAt: new Date().toISOString(),
      },
    });
    const envelope = event.toEnvelope();
    expect((envelope['data'] as any).travelerName).toBe('Alice Smith');
    expect((envelope['data'] as any).paymentId).toBe('PAY-001');
    expect((envelope['data'] as any).reservationId).toBe('RES-001');
  });
});
