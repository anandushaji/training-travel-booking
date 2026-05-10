import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Booking } from '../booking.types';

describe('Booking type — receiptId field', () => {
  it('REQ-BOOKING-TYPE-S01: Booking interface allows optional receiptId', () => {
    expectTypeOf<Booking['receiptId']>().toEqualTypeOf<string | undefined>();
  });

  it('REQ-BOOKING-TYPE-S02: Booking object can include receiptId', () => {
    const booking: Booking = {
      id: 'b-1',
      travelerId: 'traveler-1',
      flightOfferId: 'offer-1',
      status: 'CONFIRMED',
      itinerary: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2026-06-01',
        cabinClass: 'ECONOMY',
        passengers: 1,
      },
      totalAmount: 450,
      currency: 'USD',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
      receiptId: 'r-1',
    };
    expect(booking.receiptId).toBe('r-1');
  });

  it('REQ-BOOKING-TYPE-S03: Booking object can omit receiptId', () => {
    const booking: Booking = {
      id: 'b-2',
      travelerId: 'traveler-1',
      flightOfferId: 'offer-1',
      status: 'CONFIRMED',
      itinerary: {
        origin: 'JFK',
        destination: 'LAX',
        departureDate: '2026-06-01',
        cabinClass: 'ECONOMY',
        passengers: 1,
      },
      totalAmount: 450,
      currency: 'USD',
      createdAt: '2026-06-01T10:00:00Z',
      updatedAt: '2026-06-01T10:00:00Z',
    };
    expect(booking.receiptId).toBeUndefined();
  });
});
