import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../../api/baseApi';
import { authReducer } from '../auth/authSlice';
import notificationsReducer from '../notifications/notificationSlice';
import {
  searchReducer,
  setFilters,
  setSelectedOffer,
  clearSelectedOffer,
  selectFilters,
  selectSelectedOffer,
} from './searchSlice';
import type { FlightOffer } from './search.types';

const mockOffer: FlightOffer = {
  id: 'offer-1',
  airline: 'American Airlines',
  origin: 'JFK',
  destination: 'LAX',
  departureTime: '2026-06-01T10:00:00Z',
  arrivalTime: '2026-06-01T15:30:00Z',
  price: { amount: 450, currency: 'USD' },
  stops: 0,
  duration: '5h 30m',
};

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

describe('searchSlice', () => {
  describe('initial state', () => {
    it('starts with correct default values', () => {
      const state = searchReducer(undefined, { type: '@@INIT' });
      expect(state.filters.sortBy).toBe('price');
      expect(state.filters.maxPrice).toBeNull();
      expect(state.selectedOffer).toBeNull();
    });
  });

  describe('setSelectedOffer', () => {
    it('REQ-SEARCH-03-S01: updates selectedOffer in state', () => {
      const store = makeStore();
      store.dispatch(setSelectedOffer(mockOffer));
      expect(selectSelectedOffer(store.getState())).toEqual(mockOffer);
      expect(selectSelectedOffer(store.getState())?.id).toBe('offer-1');
    });
  });

  describe('clearSelectedOffer', () => {
    it('REQ-SEARCH-03-S02: resets selectedOffer to null', () => {
      const store = makeStore();
      store.dispatch(setSelectedOffer(mockOffer));
      store.dispatch(clearSelectedOffer());
      expect(selectSelectedOffer(store.getState())).toBeNull();
    });
  });

  describe('setFilters', () => {
    it('REQ-SEARCH-03-S03: updates sortBy and maxPrice', () => {
      const store = makeStore();
      store.dispatch(setFilters({ sortBy: 'duration', maxPrice: 500 }));
      const filters = selectFilters(store.getState());
      expect(filters.sortBy).toBe('duration');
      expect(filters.maxPrice).toBe(500);
    });

    it('partially updates filters (only sortBy)', () => {
      const store = makeStore();
      store.dispatch(setFilters({ sortBy: 'duration' }));
      const filters = selectFilters(store.getState());
      expect(filters.sortBy).toBe('duration');
      expect(filters.maxPrice).toBeNull(); // unchanged
    });
  });
});
