import { http, HttpResponse } from 'msw';
import type { Booking, BookingListResponse } from '../../features/booking/booking.types';

export const mockBooking: Booking = {
  id: 'booking-test-1',
  travelerId: 'traveler-1',
  flightOfferId: 'offer-test-1',
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
  createdAt: '2026-05-01T10:00:00Z',
  updatedAt: '2026-05-01T10:05:00Z',
  confirmedAt: '2026-05-01T10:05:00Z',
};

const pendingBooking: Booking = {
  ...mockBooking,
  id: 'booking-pending-1',
  status: 'PENDING',
  confirmedAt: undefined,
};

export const bookingHandlers = [
  http.get('http://localhost/api/bookings', () =>
    HttpResponse.json<BookingListResponse>({
      bookings: [mockBooking],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        limit: 20,
      },
    }),
  ),

  http.post('http://localhost/api/bookings', () =>
    HttpResponse.json<Booking>(pendingBooking, { status: 201 }),
  ),

  http.get('http://localhost/api/bookings/:id', () =>
    HttpResponse.json<Booking>(mockBooking),
  ),

  http.post('http://localhost/api/bookings/:id/cancel', () =>
    HttpResponse.json<Booking>({ ...mockBooking, status: 'CANCELLED', cancelledAt: new Date().toISOString() }),
  ),
];
