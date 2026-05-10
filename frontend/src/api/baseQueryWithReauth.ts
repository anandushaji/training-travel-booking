import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { baseQueryWithRetry } from './baseQueryWithRetry';
import type { RootState } from '../app/rootReducer';
import type { TokenPairResponse } from '../features/auth/auth.types';
import { setCredentials, logout } from '../features/auth/authSlice';

/**
 * Mutex that serialises concurrent token refresh requests.
 *
 * When two requests both get a 401 simultaneously, only the first caller
 * issues the refresh POST; the second awaits the same Promise and then
 * retries with the newly stored access token.
 *
 * The Promise resolves to `true` if refresh succeeded, `false` otherwise.
 */
let mutexPromise: Promise<boolean> | null = null;

/** Exposed only for test isolation — resets the module-level mutex. */
export function _resetMutexForTesting(): void {
  mutexPromise = null;
}

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // ── 1. Attach Authorization header ─────────────────────────────────────────
  const accessToken = (api.getState() as RootState).auth.accessToken;
  const argsWithAuth: string | FetchArgs =
    accessToken
      ? typeof args === 'string'
        ? { url: args, headers: { Authorization: `Bearer ${accessToken}` } }
        : {
            ...args,
            headers: {
              ...(args.headers as Record<string, string> | undefined),
              Authorization: `Bearer ${accessToken}`,
            },
          }
      : args;

  // ── 2. Execute the underlying query ────────────────────────────────────────
  let result = await baseQueryWithRetry(argsWithAuth, api, extraOptions);

  // ── 3. Structured error logging for monitored endpoints ────────────────────
  const LOGGED_ENDPOINTS = [
    '/inventory/flights/search',
    '/inventory/airports/search',
    '/policies/validate',
    '/api/bookings',
    '/bookings',
  ] as const;
  if (result.error) {
    const urlStr = typeof args === 'string' ? args : (args as { url: string }).url ?? '';
    if (LOGGED_ENDPOINTS.some((ep) => urlStr.includes(ep))) {
      const isBooking = urlStr.includes('/bookings');
      console.error({
        level: 'error',
        service: 'frontend',
        correlationId:
          (result.meta as { response?: { headers?: { get?: (k: string) => string | null } } })
            ?.response?.headers?.get?.('x-correlation-id') ?? 'unknown',
        endpoint: urlStr,
        status: result.error.status,
        message: isBooking ? 'Booking API error' : undefined,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // ── 4. If not a 401 — return immediately ───────────────────────────────────
  if (!result.error || result.error.status !== 401) {
    return result;
  }

  // ── 4. 401 received — attempt token refresh (mutex-protected) ──────────────
  if (!mutexPromise) {
    mutexPromise = (async (): Promise<boolean> => {
      try {
        const refreshToken = (api.getState() as RootState).auth.refreshToken;

        // No refresh token available — log out immediately
        if (!refreshToken) {
          api.dispatch(logout());
          return false;
        }

        // Call the refresh endpoint directly (bypass RTK Query to avoid reauth loop)
        const baseUrl =
          typeof window !== 'undefined'
            ? (
                window as Window & {
                  __ENV__?: { REACT_APP_API_URL?: string };
                }
              ).__ENV__?.REACT_APP_API_URL ?? 'http://localhost/api'
            : 'http://localhost/api';

        let refreshOk = false;
        let refreshData: TokenPairResponse | null = null;

        try {
          const response = await fetch(`${baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (response.ok) {
            refreshData = (await response.json()) as TokenPairResponse;
            refreshOk = true;
          }
        } catch {
          // Network error during refresh
        }

        if (refreshOk && refreshData) {
          api.dispatch(setCredentials(refreshData));
          return true;
        }

        api.dispatch(logout());
        return false;
      } finally {
        mutexPromise = null;
      }
    })();
  }

  const refreshed = await mutexPromise;

  if (refreshed) {
    // Retry the original request once with the new access token
    const newAccessToken = (api.getState() as RootState).auth.accessToken;
    const retryArgs: string | FetchArgs =
      newAccessToken
        ? typeof args === 'string'
          ? { url: args, headers: { Authorization: `Bearer ${newAccessToken}` } }
          : {
              ...args,
              headers: {
                ...(args.headers as Record<string, string> | undefined),
                Authorization: `Bearer ${newAccessToken}`,
              },
            }
        : args;

    result = await baseQueryWithRetry(retryArgs, api, extraOptions);
  }

  return result;
};
