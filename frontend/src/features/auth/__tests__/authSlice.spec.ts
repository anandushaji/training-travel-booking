import { describe, it, expect, vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer, setCredentials, logout } from '../authSlice';
import { logoutAction } from '../logoutAction';
import { baseApi } from '../../../api/baseApi';
import notificationsReducer from '../../notifications/notificationSlice';
import type { TokenPairResponse } from '../auth.types';

// ─── Fixture ──────────────────────────────────────────────────────────────────
const tokenPair: TokenPairResponse = {
  accessToken: 'access-token-abc',
  refreshToken: 'refresh-token-xyz',
  expiresIn: 28800,
  user: { id: 'u1', email: 'a@b.com', role: 'EMPLOYEE', exp: 9999999999, iat: 1000000000 },
};

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('authSlice', () => {
  describe('initial state', () => {
    it('starts unauthenticated with null tokens and user', () => {
      const state = authReducer(undefined, { type: '@@INIT' });
      expect(state.accessToken).toBeNull();
      expect(state.refreshToken).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isAuthenticated).toBe(false);
    });
  });

  describe('setCredentials', () => {
    it('REQ-AUTH-01-S01: stores token pair and sets isAuthenticated', () => {
      const store = makeStore();
      store.dispatch(setCredentials(tokenPair));
      const { auth } = store.getState();
      expect(auth.accessToken).toBe('access-token-abc');
      expect(auth.refreshToken).toBe('refresh-token-xyz');
      expect(auth.user?.id).toBe('u1');
      expect(auth.user?.email).toBe('a@b.com');
      expect(auth.user?.role).toBe('EMPLOYEE');
      expect(auth.isAuthenticated).toBe(true);
    });
  });

  describe('logout', () => {
    it('REQ-AUTH-01-S02: clears all auth state', () => {
      const store = makeStore();
      store.dispatch(setCredentials(tokenPair));
      store.dispatch(logout());
      const { auth } = store.getState();
      expect(auth.accessToken).toBeNull();
      expect(auth.refreshToken).toBeNull();
      expect(auth.user).toBeNull();
      expect(auth.isAuthenticated).toBe(false);
    });
  });

  describe('logoutAction thunk', () => {
    it('REQ-AUTH-01-S03: resets RTK Query cache on logout', () => {
      // Call the thunk directly with a mock dispatch so we capture every
      // inner dispatch regardless of Redux middleware's closure reference.
      const mockDispatch = vi.fn();
      logoutAction()(mockDispatch);

      const dispatchedTypes = mockDispatch.mock.calls.map(
        (call) => (call[0] as { type?: string }).type ?? '',
      );
      expect(dispatchedTypes.some((t) => t.includes('resetApiState'))).toBe(true);

      // Also verify the real store reflects cleared auth
      const store = makeStore();
      store.dispatch(setCredentials(tokenPair));
      store.dispatch(logoutAction());
      expect(store.getState().auth.accessToken).toBeNull();
    });

    it('clears auth state as part of logoutAction', () => {
      const store = makeStore();
      store.dispatch(setCredentials(tokenPair));
      store.dispatch(logoutAction());
      expect(store.getState().auth.isAuthenticated).toBe(false);
    });
  });
});
