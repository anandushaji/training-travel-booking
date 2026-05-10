import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import {
  MAX_RETRIES,
  baseQueryWithRetry,
} from './baseQueryWithRetry';

// ─── Mock baseQueryWithTimeout ────────────────────────────────────────────────
// We replace baseQueryWithTimeout inside the module by mocking the import.
// Vitest's module mocking lets us control what it returns per-test.

vi.mock('./baseQueryWithTimeout', () => ({
  REQUEST_TIMEOUT_MS: 10_000,
  baseQueryWithTimeout: vi.fn(),
}));

import { baseQueryWithTimeout } from './baseQueryWithTimeout';
const mockBaseQuery = baseQueryWithTimeout as ReturnType<typeof vi.fn>;

// Stub api / extraOptions
const fakeApi = {} as Parameters<typeof baseQueryWithRetry>[1];
const fakeOptions = {};

// Helper: create a mock that returns `result` on call index
function sequentialMock(results: Array<{ data?: unknown; error?: Partial<FetchBaseQueryError> }>) {
  let i = 0;
  return vi.fn().mockImplementation(async () => {
    const r = results[Math.min(i, results.length - 1)];
    i++;
    return r;
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  mockBaseQuery.mockReset();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('baseQueryWithRetry', () => {
  it('should succeed after one retry on GET 503', async () => {
    mockBaseQuery
      .mockResolvedValueOnce({ error: { status: 503 } as FetchBaseQueryError })
      .mockResolvedValueOnce({ data: { ok: true } });

    const promise = baseQueryWithRetry({ url: '/test', method: 'GET' }, fakeApi, fakeOptions);
    // advance timers for the backoff delay
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toEqual({ data: { ok: true } });
    expect(mockBaseQuery).toHaveBeenCalledTimes(2);
  });

  it('should return error after MAX_RETRIES exhausted on GET', async () => {
    mockBaseQuery.mockResolvedValue({ error: { status: 503 } as FetchBaseQueryError });

    const promise = baseQueryWithRetry({ url: '/test', method: 'GET' }, fakeApi, fakeOptions);
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result.error).toBeDefined();
    // 1 initial + MAX_RETRIES
    expect(mockBaseQuery).toHaveBeenCalledTimes(MAX_RETRIES + 1);
  });

  it('should not retry on 400', async () => {
    mockBaseQuery.mockResolvedValue({ error: { status: 400 } as FetchBaseQueryError });

    const result = await baseQueryWithRetry({ url: '/test', method: 'GET' }, fakeApi, fakeOptions);
    expect(result.error).toBeDefined();
    expect(mockBaseQuery).toHaveBeenCalledTimes(1);
  });

  it('should not retry on AbortError', async () => {
    mockBaseQuery.mockResolvedValue({
      error: { status: 'FETCH_ERROR', error: 'AbortError' } as FetchBaseQueryError,
    });

    const result = await baseQueryWithRetry({ url: '/test', method: 'GET' }, fakeApi, fakeOptions);
    expect(result.error).toBeDefined();
    expect(mockBaseQuery).toHaveBeenCalledTimes(1);
  });

  it('should not retry POST on 503', async () => {
    mockBaseQuery.mockResolvedValue({ error: { status: 503 } as FetchBaseQueryError });

    const result = await baseQueryWithRetry(
      { url: '/bookings', method: 'POST' },
      fakeApi,
      fakeOptions,
    );
    expect(result.error).toBeDefined();
    expect(mockBaseQuery).toHaveBeenCalledTimes(1);
  });

  it('should retry POST when allowRetry=true', async () => {
    mockBaseQuery
      .mockResolvedValueOnce({ error: { status: 503 } as FetchBaseQueryError })
      .mockResolvedValueOnce({ data: { id: '1' } });

    const promise = baseQueryWithRetry(
      { url: '/bookings', method: 'POST' },
      fakeApi,
      { allowRetry: true },
    );
    await vi.runAllTimersAsync();
    const result = await promise;
    expect(result).toEqual({ data: { id: '1' } });
    expect(mockBaseQuery).toHaveBeenCalledTimes(2);
  });
});
