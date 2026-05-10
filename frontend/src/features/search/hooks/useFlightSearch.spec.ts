import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer } from '../searchSlice';
import { useFlightSearch } from './useFlightSearch';
import type { FlightSearchResponse } from '../search.types';

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

function makeWrapper() {
  const store = makeStore();
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  }
  return { wrapper: Wrapper, store };
}

const validParams = {
  origin: 'JFK',
  destination: 'LAX',
  departureDate: '2026-06-01',
  adults: 1,
};

describe('useFlightSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('REQ-SEARCH-04-S01: does not fire API call before 400ms', async () => {
    let requestMade = false;
    server.use(
      http.get('http://localhost/api/inventory/flights/search', () => {
        requestMade = true;
        return HttpResponse.json<FlightSearchResponse>({
          offers: [],
          meta: { count: 0, cached: false, searchId: 'test' },
        });
      }),
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFlightSearch(), { wrapper });

    act(() => {
      result.current.trigger(validParams);
    });

    act(() => {
      vi.advanceTimersByTime(399);
    });

    expect(requestMade).toBe(false);
  });

  it('REQ-SEARCH-04-S02: debounces trigger by 400ms — fires exactly at 400ms', async () => {
    let requestMade = false;
    server.use(
      http.get('http://localhost/api/inventory/flights/search', () => {
        requestMade = true;
        return HttpResponse.json<FlightSearchResponse>({
          offers: [],
          meta: { count: 0, cached: false, searchId: 'test' },
        });
      }),
    );

    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFlightSearch(), { wrapper });

    act(() => {
      result.current.trigger(validParams);
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // Switch to real timers so waitFor can poll
    vi.useRealTimers();
    await waitFor(() => expect(requestMade).toBe(true));
  });

  it('returns initial empty offers', () => {
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useFlightSearch(), { wrapper });
    expect(result.current.offers).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isError).toBe(false);
    expect(result.current.searchId).toBeNull();
  });
});
