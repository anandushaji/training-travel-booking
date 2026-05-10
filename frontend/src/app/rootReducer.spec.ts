import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './rootReducer';
import { baseApi } from '../api/baseApi';

describe('rootReducer', () => {
  it('REQ-REDUX-S01: includes search slice with correct initial state after store creation', () => {
    const store = configureStore({
      reducer: rootReducer,
      middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    });
    const state = store.getState();
    expect(state.search).toEqual({
      filters: { sortBy: 'price', maxPrice: null },
      selectedOffer: null,
      lastCabinClass: 'ECONOMY',
    });
  });

  it('includes all expected slices', () => {
    const store = configureStore({
      reducer: rootReducer,
      middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    });
    const state = store.getState();
    expect(state).toHaveProperty('api');
    expect(state).toHaveProperty('notifications');
    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('search');
    expect(state).toHaveProperty('booking');
    expect(state).toHaveProperty('profile');
  });

  it('REQ-BOOKING-SLICE-S01: includes booking slice with correct initial state', () => {
    const store = configureStore({
      reducer: rootReducer,
      middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    });
    const state = store.getState();
    expect(state.booking).toEqual({
      activeBooking: null,
      isPolling: false,
    });
  });

  it('REQ-PROFILE-SLICE-S01: includes profile slice with correct initial state', () => {
    const store = configureStore({
      reducer: rootReducer,
      middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    });
    const state = store.getState();
    expect(state.profile).toEqual({
      viewingTravelerId: null,
    });
  });
});
