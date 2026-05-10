import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { baseApi } from '../../api/baseApi';
import { authReducer } from '../../features/auth/authSlice';
import notificationsReducer from '../../features/notifications/notificationSlice';
import { useAuth } from './useAuth';
import type { TokenPairResponse } from '../../features/auth/auth.types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tokenPair: TokenPairResponse = {
  accessToken: 'test-at',
  refreshToken: 'test-rt',
  expiresIn: 28800,
  user: { id: 'u1', email: 'a@b.com', role: 'EMPLOYEE', exp: 9999999999, iat: 1 },
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

function makeWrapper(store: ReturnType<typeof makeStore>) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(Provider, { store }, children);
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('useAuth', () => {
  describe('REQ-AUTH-05-S01: login dispatches setCredentials on success', () => {
    it('sets isAuthenticated and user after successful login', async () => {
      const store = makeStore();
      const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(store) });

      await act(async () => {
        await result.current.login({ email: 'a@b.com', password: 'password123' });
      });

      expect(store.getState().auth.isAuthenticated).toBe(true);
      expect(store.getState().auth.user?.email).toBe('test@corp.com');
    });
  });

  describe('REQ-AUTH-05-S02: login rejects on 401', () => {
    it('throws an error when login returns 401', async () => {
      server.use(
        http.post('http://localhost/api/auth/login', () =>
          HttpResponse.json({ error: 'Unauthorized', message: 'Invalid credentials' }, { status: 401 }),
        ),
      );

      const store = makeStore();
      const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(store) });

      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login({ email: 'a@b.com', password: 'wrong' });
        } catch (e) {
          thrownError = e as Error;
        }
      });

      expect(thrownError).not.toBeNull();
      expect(thrownError?.message).toContain('Invalid email or password');
      expect(store.getState().auth.isAuthenticated).toBe(false);
    });
  });

  describe('REQ-AUTH-05-S03: logout does not throw when logoutApi fails', () => {
    it('resolves and clears auth even when logout API returns 500', async () => {
      server.use(
        http.post('http://localhost/api/auth/logout', () =>
          HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
        ),
      );

      const store = makeStore();
      const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(store) });

      // Pre-login
      await act(async () => {
        await result.current.login({ email: 'a@b.com', password: 'password123' });
      });
      expect(store.getState().auth.isAuthenticated).toBe(true);

      let threw = false;
      await act(async () => {
        try {
          result.current.logout();
          // Give the fire-and-forget async logout call a tick to settle
          await new Promise((r) => setTimeout(r, 50));
        } catch {
          threw = true;
        }
      });

      expect(threw).toBe(false);
      expect(store.getState().auth.accessToken).toBeNull();
    });
  });

  describe('initial state', () => {
    it('starts unauthenticated', () => {
      const store = makeStore();
      const { result } = renderHook(() => useAuth(), { wrapper: makeWrapper(store) });
      expect(result.current.isAuthenticated).toBe(false);
      expect(result.current.user).toBeNull();
    });
  });
});

