import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authApi } from '../authApi';
import { authReducer } from '../authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { logger } from '../../../api/logger';

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

describe('authApi', () => {
  describe('login mutation', () => {
    it('REQ-AUTH-03-S01: returns token pair on success', async () => {
      const store = makeStore();
      const result = await store.dispatch(
        authApi.endpoints.login.initiate({ email: 'test@corp.com', password: 'password123' }),
      );
      expect(result.data?.accessToken).toBe('test-access-token');
      expect(result.data?.user.role).toBe('EMPLOYEE');
    });

    it('REQ-AUTH-03-S02: surfaces 401 as error with no retry', async () => {
      server.use(
        http.post('http://localhost/api/auth/login', () =>
          HttpResponse.json({ error: 'Unauthorized', message: 'Invalid credentials' }, { status: 401 }),
        ),
      );

      const store = makeStore();
      const start = Date.now();
      const result = await store.dispatch(
        authApi.endpoints.login.initiate({ email: 'a@b.com', password: 'wrong' }),
      );
      const elapsed = Date.now() - start;

      expect((result as { error?: { status: number } }).error?.status).toBe(401);
      // POST is not retried — completes quickly without retry back-off delays
      expect(elapsed).toBeLessThan(3000);
    });
  });

  describe('observability', () => {
    it('REQ-AUTH-08-S01: login success does not log password or tokens', async () => {
      const logSpy = vi.spyOn(logger, 'info');
      const store = makeStore();
      await store.dispatch(
        authApi.endpoints.login.initiate({ email: 'test@corp.com', password: 'secret123' }),
      );

      // Check no log call includes sensitive fields
      for (const call of logSpy.mock.calls) {
        const serialised = JSON.stringify(call);
        expect(serialised).not.toContain('secret123');
        expect(serialised).not.toContain('accessToken');
        expect(serialised).not.toContain('refreshToken');
      }
      logSpy.mockRestore();
    });
  });

  describe('refresh mutation', () => {
    it('returns new token pair on success', async () => {
      const store = makeStore();
      const result = await store.dispatch(
        authApi.endpoints.refresh.initiate({ refreshToken: 'test-refresh-token' }),
      );
      expect(result.data?.accessToken).toBe('new-access-token');
    });

    it('surfaces 401 as error when refresh token is invalid', async () => {
      server.use(
        http.post('http://localhost/api/auth/refresh', () =>
          HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        ),
      );
      const store = makeStore();
      const result = await store.dispatch(
        authApi.endpoints.refresh.initiate({ refreshToken: 'expired-token' }),
      );
      expect((result as { error?: { status: number } }).error?.status).toBe(401);
    });
  });

  describe('logoutApi mutation', () => {
    it('returns void on success (204)', async () => {
      const store = makeStore();
      const result = await store.dispatch(
        authApi.endpoints.logoutApi.initiate({ refreshToken: 'test-refresh-token' }),
      );
      // No error on 204
      expect((result as { error?: unknown }).error).toBeUndefined();
    });
  });
});
