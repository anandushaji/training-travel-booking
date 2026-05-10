import { describe, it, expect, vi, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { baseApi } from './baseApi';
import { baseQueryWithReauth, _resetMutexForTesting } from './baseQueryWithReauth';
import { authReducer, setCredentials, logout } from '../features/auth/authSlice';
import notificationsReducer from '../features/notifications/notificationSlice';
import type { TokenPairResponse } from '../features/auth/auth.types';
import type { RootState } from '../app/rootReducer';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const validTokenPair: TokenPairResponse = {
  accessToken: 'valid-access-token',
  refreshToken: 'valid-refresh-token',
  expiresIn: 28800,
  user: { id: 'u1', email: 'a@b.com', role: 'EMPLOYEE', exp: 9999999999, iat: 1 },
};

const newTokenPair: TokenPairResponse = {
  ...validTokenPair,
  accessToken: 'new-access-token',
  refreshToken: 'new-refresh-token',
};

// ─── Store factory ────────────────────────────────────────────────────────────

function makeStore(initialAuth?: Partial<{ accessToken: string | null; refreshToken: string | null }>) {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

  if (initialAuth?.accessToken !== undefined || initialAuth?.refreshToken !== undefined) {
    store.dispatch(
      setCredentials({
        ...validTokenPair,
        accessToken: initialAuth.accessToken ?? 'test-at',
        refreshToken: initialAuth.refreshToken ?? 'test-rt',
      }),
    );
  }

  return store;
}

// ─── Inject a simple GET endpoint for testing ─────────────────────────────────

const testApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    testGet: build.query<{ data: string[] }, void>({ query: () => '/test-protected' }),
  }),
  overrideExisting: true,
});

/**
 * Build a minimal BaseQueryApi compatible object wired to a real Redux store.
 *
 * Used by S05/S06 to call `baseQueryWithReauth` DIRECTLY (bypassing RTK Query's
 * deduplication layer) so we can verify mutex and error-path behaviour in isolation.
 */
function makeApi(store: ReturnType<typeof makeStore>) {
  return {
    getState: () => store.getState() as RootState,
    dispatch: (action: unknown) => store.dispatch(action as Parameters<typeof store.dispatch>[0]),
    signal: new AbortController().signal,
    abort: () => {},
    endpoint: 'testGet',
    type: 'query' as const,
    forced: false,
    extra: undefined,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('baseQueryWithReauth', () => {
  beforeEach(() => {
    _resetMutexForTesting();
  });

  describe('REQ-AUTH-04-S01: Bearer token injection', () => {
    it('attaches Authorization header to every request', async () => {
      let capturedAuth: string | null = null;
      server.use(
        http.get('http://localhost/api/test-protected', ({ request }) => {
          capturedAuth = request.headers.get('Authorization');
          return HttpResponse.json({ data: [] });
        }),
      );

      const store = makeStore({ accessToken: 'valid-access-token' });
      await store.dispatch(testApi.endpoints.testGet.initiate());
      expect(capturedAuth).toBe('Bearer valid-access-token');
    });

    it('omits Authorization header when not authenticated', async () => {
      let capturedAuth: string | null | undefined = undefined;
      server.use(
        http.get('http://localhost/api/test-protected', ({ request }) => {
          capturedAuth = request.headers.get('Authorization');
          return HttpResponse.json({ data: [] });
        }),
      );

      const store = makeStore(); // no auth
      await store.dispatch(testApi.endpoints.testGet.initiate());
      expect(capturedAuth).toBeNull();
    });
  });

  describe('REQ-AUTH-04-S02: 401 → refresh → retry succeeds', () => {
    it('retries original request after successful token refresh', async () => {
      let callCount = 0;
      server.use(
        http.get('http://localhost/api/test-protected', () => {
          callCount++;
          if (callCount === 1) {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          return HttpResponse.json({ data: ['item1'] });
        }),
        http.post('http://localhost/api/auth/refresh', () => HttpResponse.json(newTokenPair)),
      );

      const store = makeStore({ accessToken: 'expired-at', refreshToken: 'valid-rt' });
      const result = await store.dispatch(testApi.endpoints.testGet.initiate(undefined, { forceRefetch: true }));

      expect((result as { data?: { data: string[] } }).data?.data).toEqual(['item1']);
      expect(store.getState().auth.accessToken).toBe('new-access-token');
      expect(callCount).toBe(2); // original + retry
    });
  });

  describe('REQ-AUTH-04-S03: Failed refresh dispatches logout', () => {
    it('dispatches logout when refresh returns 401', async () => {
      server.use(
        http.get('http://localhost/api/test-protected', () =>
          HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        ),
        http.post('http://localhost/api/auth/refresh', () =>
          HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        ),
      );

      const store = makeStore({ accessToken: 'expired-at', refreshToken: 'expired-rt' });
      await store.dispatch(testApi.endpoints.testGet.initiate(undefined, { forceRefetch: true }));

      // logout action must have been dispatched — confirmed by auth state being cleared
      expect(store.getState().auth.accessToken).toBeNull();
    });
  });

  describe('REQ-AUTH-04-S04-A: Null refreshToken skips refresh', () => {
    it('dispatches logout immediately without calling refresh endpoint when refreshToken is null', async () => {
      const refreshSpy = vi.fn(() => HttpResponse.json({ error: 'Should not be called' }, { status: 500 }));
      server.use(
        http.get('http://localhost/api/test-protected', () =>
          HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        ),
        http.post('http://localhost/api/auth/refresh', refreshSpy),
      );

      // Store with accessToken but NO refreshToken
      const store = configureStore({
        reducer: {
          [baseApi.reducerPath]: baseApi.reducer,
          notifications: notificationsReducer,
          auth: authReducer,
        },
        middleware: (getDefault) => getDefault().concat(baseApi.middleware),
        preloadedState: {
          auth: { accessToken: 'expired-at', refreshToken: null, user: null, isAuthenticated: false },
        },
      });

      await store.dispatch(testApi.endpoints.testGet.initiate(undefined, { forceRefetch: true }));

      expect(refreshSpy).not.toHaveBeenCalled();
      expect(store.getState().auth.accessToken).toBeNull();
    });
  });

  describe('REQ-AUTH-04-S05: Mutex prevents concurrent refresh storms', () => {
    it('calls refresh exactly once when two requests 401 simultaneously', async () => {
      let refreshCallCount = 0;

      // Call baseQueryWithReauth directly (not via RTK `initiate`) so we bypass
      // RTK Query's request-deduplication layer and test the mutex in isolation.
      server.use(
        http.get('http://localhost/api/test-protected', ({ request }) => {
          const auth = request.headers.get('Authorization') ?? '';
          // Return 401 only while the old (expired) token is used; 200 after refresh.
          if (auth.includes('expired-at')) {
            return HttpResponse.json({ error: 'Unauthorized' }, { status: 401 });
          }
          return HttpResponse.json({ data: ['ok'] });
        }),
        http.post('http://localhost/api/auth/refresh', async () => {
          refreshCallCount++;
          // Small delay so the two concurrent callers actually overlap in the mutex.
          await new Promise((r) => setTimeout(r, 20));
          return HttpResponse.json(newTokenPair);
        }),
      );

      const store = makeStore({ accessToken: 'expired-at', refreshToken: 'valid-rt' });
      const api = makeApi(store);

      // Two concurrent calls — only one should trigger the refresh endpoint.
      await Promise.all([
        baseQueryWithReauth('/test-protected', api as Parameters<typeof baseQueryWithReauth>[1], {}),
        baseQueryWithReauth('/test-protected', api as Parameters<typeof baseQueryWithReauth>[1], {}),
      ]);

      expect(refreshCallCount).toBe(1);
      expect(store.getState().auth.accessToken).toBe('new-access-token');
    });
  });

  describe('REQ-AUTH-04-S06: Refresh failure dispatches logout', () => {
    it('dispatches logout when refresh returns a server error (non-ok response)', async () => {
      // Tests the same code path as a network error: response.ok === false → logout.
      // Called directly to bypass RTK Query deduplication (same rationale as S05).
      server.use(
        http.get('http://localhost/api/test-protected', () =>
          HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }),
        ),
        http.post('http://localhost/api/auth/refresh', () =>
          HttpResponse.json({ error: 'Internal Server Error' }, { status: 500 }),
        ),
      );

      const store = makeStore({ accessToken: 'expired-at', refreshToken: 'valid-rt' });
      const api = makeApi(store);

      await baseQueryWithReauth('/test-protected', api as Parameters<typeof baseQueryWithReauth>[1], {});

      expect(store.getState().auth.accessToken).toBeNull();
    });
  });

  describe('REQ-AUTH-08-S01: Structured error logging for search endpoints', () => {
    it('logs structured error on non-2xx from /inventory/flights/search', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      server.use(
        http.get('http://localhost/api/inventory/flights/search', () =>
          HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 }),
        ),
      );

      const store = makeStore({ accessToken: 'valid-at' });
      const api = makeApi(store);

      await baseQueryWithReauth(
        '/inventory/flights/search?origin=JFK&destination=LAX',
        api as Parameters<typeof baseQueryWithReauth>[1],
        {},
      );

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          service: 'frontend',
          endpoint: expect.stringContaining('/inventory/flights/search'),
          status: 503,
        }),
      );

      errorSpy.mockRestore();
    });

    it('does NOT log structured error for non-search endpoints', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      server.use(
        http.get('http://localhost/api/test-protected', () =>
          HttpResponse.json({ error: 'Server Error' }, { status: 500 }),
        ),
      );

      const store = makeStore({ accessToken: 'valid-at' });
      const api = makeApi(store);

      await baseQueryWithReauth(
        '/test-protected',
        api as Parameters<typeof baseQueryWithReauth>[1],
        {},
      );

      // Should not have been called with our structured format for this endpoint
      const searchErrorCalls = errorSpy.mock.calls.filter(
        (args) =>
          typeof args[0] === 'object' &&
          args[0] !== null &&
          'service' in (args[0] as object) &&
          (args[0] as { service: string }).service === 'frontend',
      );
      expect(searchErrorCalls).toHaveLength(0);

      errorSpy.mockRestore();
    });
  });
});
