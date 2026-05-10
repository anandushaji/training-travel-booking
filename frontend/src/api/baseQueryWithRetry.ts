import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { baseQueryWithTimeout } from './baseQueryWithTimeout';
import { incrementCounter, METRIC_NAMES } from './metrics';

export const MAX_RETRIES = 3;
export const BASE_DELAY_MS = 200;
export const MAX_DELAY_MS = 5_000;
export const TOTAL_DEADLINE_MS = 30_000;
export const RETRYABLE_STATUSES = [408, 500, 502, 503, 504] as const;
export const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'] as const;

function isSafeMethod(args: string | FetchArgs): boolean {
  if (typeof args === 'string') return true; // RTK default is GET for string args
  const method = (args.method ?? 'GET').toUpperCase();
  return (SAFE_METHODS as readonly string[]).includes(method);
}

function isRetryableStatus(status: unknown): boolean {
  return (RETRYABLE_STATUSES as readonly number[]).includes(status as number);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function backoffDelay(attempt: number): number {
  const jitter = Math.random() * BASE_DELAY_MS;
  return clamp(BASE_DELAY_MS * 2 ** attempt + jitter, BASE_DELAY_MS, MAX_DELAY_MS);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const baseQueryWithRetry: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const startTime = Date.now();
  const allowRetry: boolean =
    isSafeMethod(args) || (extraOptions as { allowRetry?: boolean })?.allowRetry === true;

  let attempt = 0;
  let lastResult: Awaited<ReturnType<typeof baseQueryWithTimeout>>;

  do {
    if (attempt > 0) {
      incrementCounter(METRIC_NAMES.API_RETRY_TOTAL, {
        method: typeof args === 'string' ? 'GET' : (args.method ?? 'GET').toUpperCase(),
        attempt: String(attempt),
      });
      const delay = backoffDelay(attempt - 1);
      await sleep(delay);
    }

    lastResult = await baseQueryWithTimeout(args, api, extraOptions);
    const { error } = lastResult;

    // No error — success
    if (!error) return lastResult;

    // AbortError — never retry
    if (
      error.status === 'FETCH_ERROR' &&
      (error as { error?: string }).error === 'AbortError'
    ) {
      return lastResult;
    }

    // Non-retryable HTTP status
    if (
      typeof error.status === 'number' &&
      !isRetryableStatus(error.status)
    ) {
      return lastResult;
    }

    // Non-GET method with no opt-in
    if (!allowRetry) return lastResult;

    attempt++;

    // Deadline check
    if (Date.now() - startTime >= TOTAL_DEADLINE_MS) break;
  } while (attempt <= MAX_RETRIES);

  return lastResult!;
};
