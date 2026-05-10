// @ts-nocheck
import { BookingCancelledEvent } from './booking-cancelled.event';

describe('BookingCancelledEvent', () => {
  it('data contains reason', () => {
    const event = new BookingCancelledEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: {
        travelerId: 'traveler-1',
        reason: 'Change of plans',
        cancelledAt: new Date().toISOString(),
      },
    });
    const envelope = event.toEnvelope();
    expect((envelope['data'] as any).reason).toBe('Change of plans');
  });
});
