import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer, setFilters } from '../searchSlice';
import { FlightResults } from './FlightResults';
import { _resetPolicyCounterForTesting } from './PolicyBadge';
import type { FlightOffer } from '../search.types';

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
      search: searchReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

function makeOffer(overrides: Partial<FlightOffer> = {}): FlightOffer {
  return {
    id: 'offer-default',
    airline: 'Test Air',
    origin: 'JFK',
    destination: 'LAX',
    departureTime: '2026-06-01T10:00:00Z',
    arrivalTime: '2026-06-01T15:30:00Z',
    price: { amount: 500, currency: 'USD' },
    stops: 0,
    duration: '5h 30m',
    ...overrides,
  };
}

function renderResults(
  offers: FlightOffer[],
  isLoading: boolean,
  isError: boolean,
  store = makeStore(),
  onRetry = vi.fn(),
) {
  render(
    <Provider store={store}>
      <MemoryRouter>
        <FlightResults
          offers={offers}
          isLoading={isLoading}
          isError={isError}
          onRetry={onRetry}
        />
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('FlightResults', () => {
  beforeEach(() => {
    _resetPolicyCounterForTesting();
  });

  it('REQ-RESULTS-S01: shows skeleton placeholders while loading', () => {
    renderResults([], true, false);
    const skeletons = screen.getAllByTestId('flight-card-skeleton');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByRole('article')).toBeNull();
  });

  it('REQ-RESULTS-S02: shows empty state message for zero results', async () => {
    renderResults([], false, false);
    await waitFor(() => {
      expect(screen.getByText(/No flights found/)).toBeDefined();
    });
  });

  it('REQ-RESULTS-S03: shows error banner on API failure', async () => {
    renderResults([], false, true);
    await waitFor(() => {
      expect(screen.getByText(/Failed to load flights/)).toBeDefined();
      expect(screen.getByRole('button', { name: /try again/i })).toBeDefined();
    });
  });

  it('REQ-RESULTS-S04: renders correct number of cards for N offers', async () => {
    const offers = Array.from({ length: 5 }, (_, i) =>
      makeOffer({ id: `offer-${i}`, airline: `Airline ${i}` }),
    );
    renderResults(offers, false, false);
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /select/i })).toHaveLength(5);
    });
  });

  it('REQ-RESULTS-S05: sorts results by price ascending when sortBy=price', async () => {
    const offers = [
      makeOffer({ id: 'o1', price: { amount: 600, currency: 'USD' }, airline: 'Airline 600' }),
      makeOffer({ id: 'o2', price: { amount: 300, currency: 'USD' }, airline: 'Airline 300' }),
      makeOffer({ id: 'o3', price: { amount: 450, currency: 'USD' }, airline: 'Airline 450' }),
    ];
    const store = makeStore();
    store.dispatch(setFilters({ sortBy: 'price' }));
    renderResults(offers, false, false, store);

    await waitFor(() => {
      // Use airline names (which embed price) to check DOM ordering
      const html = document.body.innerHTML;
      const pos300 = html.indexOf('Airline 300');
      const pos450 = html.indexOf('Airline 450');
      const pos600 = html.indexOf('Airline 600');
      expect(pos300).toBeGreaterThan(-1);
      expect(pos450).toBeGreaterThan(-1);
      expect(pos600).toBeGreaterThan(-1);
      expect(pos300).toBeLessThan(pos450);
      expect(pos450).toBeLessThan(pos600);
    });
  });

  it('REQ-RESULTS-S06: filters out offers above maxPrice', async () => {
    const offers = [
      makeOffer({ id: 'o1', price: { amount: 300, currency: 'USD' }, airline: 'Cheap Air' }),
      makeOffer({ id: 'o2', price: { amount: 600, currency: 'USD' }, airline: 'Expensive Air' }),
      makeOffer({ id: 'o3', price: { amount: 800, currency: 'USD' }, airline: 'Premium Air' }),
    ];
    const store = makeStore();
    store.dispatch(setFilters({ maxPrice: 500 }));
    renderResults(offers, false, false, store);

    await waitFor(() => {
      expect(screen.getByText('Cheap Air')).toBeDefined();
      expect(screen.queryByText('Expensive Air')).toBeNull();
      expect(screen.queryByText('Premium Air')).toBeNull();
    });
  });

  it('REQ-RESULTS-S07: container has aria-live="polite"', () => {
    renderResults([], false, false);
    const container = document.querySelector('[aria-live="polite"]');
    expect(container).not.toBeNull();
  });
});
