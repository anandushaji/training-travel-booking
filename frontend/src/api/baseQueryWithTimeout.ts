import { fetchBaseQuery, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import type { BaseQueryFn, FetchArgs } from '@reduxjs/toolkit/query';
import { incrementCounter, recordHistogram, METRIC_NAMES } from './metrics';

export const REQUEST_TIMEOUT_MS = 10_000;

const rawBaseQuery = fetchBaseQuery({
  baseUrl: typeof window !== 'undefined'
    ? (window as Window & { __ENV__?: { REACT_APP_API_URL?: string } }).__ENV__?.REACT_APP_API_URL ?? '/api'
    : '/api',
  prepareHeaders: (headers) => {
    headers.set('Content-Type', 'application/json');
    return headers;
  },
});

export const baseQueryWithTimeout: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const startTime = performance.now();

  const mergedOptions = {
    ...extraOptions,
    signal: controller.signal,
  };

  try {
    const result = await rawBaseQuery(args, api, mergedOptions);

    const duration = performance.now() - startTime;
    const status = result.error
      ? String((result.error as FetchBaseQueryError).status ?? 'FETCH_ERROR')
      : '200';
    const method = typeof args === 'string' ? 'GET' : (args.method ?? 'GET').toUpperCase();

    incrementCounter(METRIC_NAMES.API_REQUESTS_TOTAL, { method, status });
    recordHistogram(METRIC_NAMES.API_REQUEST_DURATION_MS, duration, { method });

    return result;
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      incrementCounter(METRIC_NAMES.API_REQUESTS_TOTAL, { method: 'UNKNOWN', status: 'TIMEOUT' });
      return {
        error: {
          status: 'FETCH_ERROR',
          error: 'AbortError',
        } as FetchBaseQueryError,
      };
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
};
