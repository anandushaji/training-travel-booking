import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer } from '../../search/searchSlice';
import { bookingReducer } from '../bookingSlice';
import { profileReducer } from '../../profile/profileSlice';
import { BookingConfirmationPage } from '../pages/BookingConfirmationPage';
import type { Booking } from '../booking.types';

const baseBooking: Booking = {
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
  updatedAt: '2026-06-01T10:01:00Z',
};

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
      search: searchReducer,
      booking: bookingReducer,
      profile: profileReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

function renderPage(bookingId: string) {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[`/bookings/${bookingId}/confirmation`]}>
        <Routes>
          <Route path="/bookings/:id/confirmation" element={<BookingConfirmationPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('BookingConfirmationPage — receipt link', () => {
  it('REQ-BOOKING-CONF-S01: receipt link shown when receiptId present', async () => {
    server.use(
      http.get('http://localhost/api/bookings/:id', () =>
        HttpResponse.json<Booking>({ ...baseBooking, receiptId: 'r-1' }),
      ),
    );

    renderPage('b-1');

    await waitFor(() => {
      expect(screen.getByTestId('view-receipt-link')).toBeInTheDocument();
    });
  });

  it('REQ-BOOKING-CONF-S02: receipt link absent when receiptId missing', async () => {
    server.use(
      http.get('http://localhost/api/bookings/:id', () =>
        HttpResponse.json<Booking>(baseBooking),
      ),
    );

    renderPage('b-2');

    await waitFor(() => {
      expect(screen.getByTestId('booking-confirmation-page')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('view-receipt-link')).not.toBeInTheDocument();
  });
});
