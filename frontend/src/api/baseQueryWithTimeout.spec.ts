import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';
import { REQUEST_TIMEOUT_MS } from './baseQueryWithTimeout';

describe('baseQueryWithTimeout', () => {
  it('REQUEST_TIMEOUT_MS should equal 10000', () => {
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
  });

  // Note: Full integration tests for AbortController behaviour are covered by
  // baseQueryWithRetry.spec.ts which uses baseQueryWithTimeout as its base query.
  // Here we just verify the exported constant and that the module loads cleanly.
  it('should export baseQueryWithTimeout as a function', async () => {
    const { baseQueryWithTimeout } = await import('./baseQueryWithTimeout');
    expect(typeof baseQueryWithTimeout).toBe('function');
  });
});
