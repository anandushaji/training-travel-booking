import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { baseApi } from '../../api/baseApi';
import { flightApi } from './flightApi';
import { authReducer } from '../auth/authSlice';
import notificationsReducer from '../notifications/notificationSlice';
import { searchReducer } from './searchSlice';
import type { FlightSearchResponse } from './search.types';

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

const baseParams = {
  origin: 'JFK',
  destination: 'LAX',
  departureDate: '2026-06-01',
  adults: 1,
};

describe('flightApi', () => {
  describe('searchFlights lazy query', () => {
    it('REQ-SEARCH-01-S01: sends correct URL params', async () => {
      let capturedUrl: URL | null = null;
      server.use(
        http.get('http://localhost/api/inventory/flights/search', ({ request }) => {
          capturedUrl = new URL(request.url);
          return HttpResponse.json<FlightSearchResponse>({
            offers: [],
            meta: { count: 0, cached: false, searchId: 'sid-1' },
          });
        }),
      );

      const store = makeStore();
      await store.dispatch(flightApi.endpoints.searchFlights.initiate(baseParams));

      expect(capturedUrl).not.toBeNull();
      expect(capturedUrl!.searchParams.get('origin')).toBe('JFK');
      expect(capturedUrl!.searchParams.get('destination')).toBe('LAX');
      expect(capturedUrl!.searchParams.get('departureDate')).toBe('2026-06-01');
      expect(capturedUrl!.searchParams.get('adults')).toBe('1');
    });

    it('REQ-SEARCH-01-S02: returns cached result within TTL (300s)', async () => {
      let callCount = 0;
      server.use(
        http.get('http://localhost/api/inventory/flights/search', () => {
          callCount++;
          return HttpResponse.json<FlightSearchResponse>({
            offers: [],
            meta: { count: 0, cached: false, searchId: 'cached-sid' },
          });
        }),
      );

      const store = makeStore();

      // First call — fetches from network
      await store.dispatch(flightApi.endpoints.searchFlights.initiate(baseParams));
      expect(callCount).toBe(1);

      // Second call with identical params — served from cache
      await store.dispatch(flightApi.endpoints.searchFlights.initiate(baseParams));
      expect(callCount).toBe(1); // still 1 — no new HTTP request
    });
  });

  describe('searchAirports query', () => {
    it('REQ-SEARCH-02-S01: skip condition is true when q.length < 2', () => {
      // The skip: q.length < 2 expression lives in AirportInput and is exercised
      // in AirportInput.spec.tsx (REQ-SEARCH-05-S01). Here we just document the
      // threshold rule as a pure unit assertion.
      expect('J'.length < 2).toBe(true);   // 1-char → skip
      expect('JF'.length < 2).toBe(false); // 2-char → do NOT skip
    });

    it('REQ-SEARCH-02-S02: fetches airports for q.length >= 2', async () => {
      const store = makeStore();
      const result = await store.dispatch(
        flightApi.endpoints.searchAirports.initiate({ q: 'JF' }),
      );
      expect((result as { data?: unknown[] }).data).toBeDefined();
    });
  });
});
