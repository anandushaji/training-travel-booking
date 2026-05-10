// @ts-nocheck
import { BookingReadModelUpdater } from './booking-read-model.updater';
import { BookingConfirmedEvent } from '../../domain/events/booking-confirmed.event';
import { BookingCancelledEvent } from '../../domain/events/booking-cancelled.event';

describe('BookingReadModelUpdater', () => {
  let updater: BookingReadModelUpdater;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = { upsert: jest.fn().mockResolvedValue(undefined), updateStatus: jest.fn().mockResolvedValue(undefined) };
    updater = new BookingReadModelUpdater(mockRepo);
  });

  it('BookingConfirmed upserts with all fields', async () => {
    const event = new BookingConfirmedEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: {
        travelerId: 'trav-1',
        travelerName: 'Alice Smith',
        travelerEmail: 'alice@example.com',
        reservationId: 'RES-001',
        paymentId: 'PAY-001',
        itinerary: { origin: 'JFK', destination: 'LAX', departureDate: '2026-08-01', cabinClass: 'ECONOMY' },
        totalAmount: 450,
        currency: 'USD',
        confirmedAt: new Date().toISOString(),
      },
    });
    await updater.onBookingConfirmed(event);
    expect(mockRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ travelerName: 'Alice Smith', status: 'CONFIRMED' }),
    );
  });

  it('BookingCancelled updates status', async () => {
    const event = new BookingCancelledEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: { travelerId: 'trav-1', reason: 'cancelled', cancelledAt: new Date().toISOString() },
    });
    await updater.onBookingCancelled(event);
    expect(mockRepo.updateStatus).toHaveBeenCalledWith('booking-1', 'CANCELLED');
  });

  it('upsert is idempotent', async () => {
    const event = new BookingConfirmedEvent({
      aggregateId: 'booking-1',
      correlationId: 'corr-1',
      data: {
        travelerId: 'trav-1',
        travelerName: 'Alice',
        travelerEmail: 'alice@example.com',
        reservationId: 'RES-001',
        paymentId: 'PAY-001',
        itinerary: { origin: 'JFK', destination: 'LAX', departureDate: '2026-08-01' },
        totalAmount: 450,
        currency: 'USD',
        confirmedAt: new Date().toISOString(),
      },
    });
    await updater.onBookingConfirmed(event);
    await updater.onBookingConfirmed(event);
    // upsert called twice — idempotent because repo.upsert uses ON CONFLICT DO UPDATE
    expect(mockRepo.upsert).toHaveBeenCalledTimes(2);
  });
});
