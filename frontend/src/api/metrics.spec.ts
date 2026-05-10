import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  incrementCounter,
  recordHistogram,
  getCounter,
  getHistogramObservations,
  resetMetrics,
  METRIC_NAMES,
} from './metrics';

beforeEach(() => resetMetrics());

describe('metrics', () => {
  it('should increment retry counter on each retry attempt', () => {
    incrementCounter(METRIC_NAMES.API_RETRY_TOTAL, { method: 'GET', attempt: '1' });
    incrementCounter(METRIC_NAMES.API_RETRY_TOTAL, { method: 'GET', attempt: '2' });
    expect(getCounter(METRIC_NAMES.API_RETRY_TOTAL, { method: 'GET', attempt: '1' })).toBe(1);
    expect(getCounter(METRIC_NAMES.API_RETRY_TOTAL, { method: 'GET', attempt: '2' })).toBe(1);
  });

  it('should increment requests total once per call', () => {
    incrementCounter(METRIC_NAMES.API_REQUESTS_TOTAL, { method: 'GET', status: '200' });
    expect(getCounter(METRIC_NAMES.API_REQUESTS_TOTAL, { method: 'GET', status: '200' })).toBe(1);
  });

  it('should record duration for each request', () => {
    recordHistogram(METRIC_NAMES.API_REQUEST_DURATION_MS, 42, { method: 'GET' });
    recordHistogram(METRIC_NAMES.API_REQUEST_DURATION_MS, 58, { method: 'GET' });
    const obs = getHistogramObservations(METRIC_NAMES.API_REQUEST_DURATION_MS, { method: 'GET' });
    expect(obs).toHaveLength(2);
    expect(obs).toContain(42);
    expect(obs).toContain(58);
  });

  it('should separate counters by label values', () => {
    incrementCounter(METRIC_NAMES.API_REQUESTS_TOTAL, { method: 'GET', status: '200' });
    incrementCounter(METRIC_NAMES.API_REQUESTS_TOTAL, { method: 'POST', status: '201' });
    expect(getCounter(METRIC_NAMES.API_REQUESTS_TOTAL, { method: 'GET', status: '200' })).toBe(1);
    expect(getCounter(METRIC_NAMES.API_REQUESTS_TOTAL, { method: 'POST', status: '201' })).toBe(1);
  });
});
