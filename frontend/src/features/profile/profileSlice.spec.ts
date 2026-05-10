import { describe, it, expect } from 'vitest';
import { profileReducer, setViewingTravelerId, selectViewingTravelerId } from './profileSlice';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../../api/baseApi';
import { authReducer } from '../auth/authSlice';
import notificationsReducer from '../notifications/notificationSlice';

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
      profile: profileReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

describe('profileSlice', () => {
  it('has initial state { viewingTravelerId: null }', () => {
    const state = profileReducer(undefined, { type: '@@INIT' });
    expect(state).toEqual({ viewingTravelerId: null });
  });

  it('setViewingTravelerId updates state', () => {
    const store = makeStore();
    store.dispatch(setViewingTravelerId('uuid-123'));
    const state = store.getState();
    expect(selectViewingTravelerId(state as Parameters<typeof selectViewingTravelerId>[0])).toBe('uuid-123');
  });

  it('setViewingTravelerId can be reset to null', () => {
    const store = makeStore();
    store.dispatch(setViewingTravelerId('uuid-123'));
    store.dispatch(setViewingTravelerId(null));
    const state = store.getState();
    expect(selectViewingTravelerId(state as Parameters<typeof selectViewingTravelerId>[0])).toBeNull();
  });
});
