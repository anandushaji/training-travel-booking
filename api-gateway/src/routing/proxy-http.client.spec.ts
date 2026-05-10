import {
  BadGatewayException,
  GatewayTimeoutException,
  ServiceUnavailableException,
} from '@nestjs/common';
import axios from 'axios';
import { ProxyHttpClient } from './proxy-http.client';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ProxyHttpClient', () => {
  let client: ProxyHttpClient;
  let circuitBreaker: CircuitBreakerService;

  beforeEach(() => {
    jest.clearAllMocks();
    circuitBreaker = new CircuitBreakerService();
    // Bypass circuit breaker in unit tests — just execute the fn directly
    jest.spyOn(circuitBreaker, 'execute').mockImplementation((_service, fn) => fn());
    client = new ProxyHttpClient(circuitBreaker);
    // Mock axios.isAxiosError
    (axios.isAxiosError as unknown as jest.Mock).mockImplementation(
      (err: unknown) => !!(err && typeof err === 'object' && 'isAxiosError' in (err as Record<string, unknown>)),
    );
  });

  it('should return downstream response on success', async () => {
    mockedAxios.request.mockResolvedValueOnce({ status: 200, data: { ok: true }, headers: {}, config: {}, statusText: 'OK' } as never);
    const response = await client.request('booking', { method: 'GET', url: 'http://booking/api/v1/bookings' });
    expect(response.status).toBe(200);
    expect(response.data).toEqual({ ok: true });
  });

  it('should retry up to 3 times on 503 response and increment retry_count', async () => {
    const err503 = Object.assign(new Error('503'), { isAxiosError: true, response: { status: 503 }, code: undefined });
    const successResponse = { status: 200, data: {}, headers: {}, config: {}, statusText: 'OK' };
    mockedAxios.request
      .mockRejectedValueOnce(err503)
      .mockRejectedValueOnce(err503)
      .mockRejectedValueOnce(err503)
      .mockResolvedValueOnce(successResponse as never);

    const retryMock = jest.fn();
    client.setMetricsService({ incrementRetryCount: retryMock });

    const response = await client.request('booking', { method: 'GET', url: 'http://booking' });
    expect(response.status).toBe(200);
    expect(retryMock).toHaveBeenCalledTimes(3);
    expect(retryMock).toHaveBeenCalledWith('booking', 'retry');
  }, 15000);

  it('should not retry on 404 and return error immediately', async () => {
    const err404 = Object.assign(new Error('404'), { isAxiosError: true, response: { status: 404 }, code: undefined });
    mockedAxios.request.mockRejectedValueOnce(err404);

    const retryMock = jest.fn();
    client.setMetricsService({ incrementRetryCount: retryMock });

    await expect(client.request('booking', { method: 'GET', url: 'http://booking/missing' })).rejects.toBeDefined();
    expect(retryMock).not.toHaveBeenCalledWith('booking', 'retry');
  });

  it('should throw GatewayTimeoutException when downstream read timeout is exceeded', async () => {
    const timeoutErr = Object.assign(new Error('timeout'), { isAxiosError: true, code: 'ECONNABORTED', response: undefined });
    mockedAxios.request.mockRejectedValueOnce(timeoutErr);
    (axios.isAxiosError as unknown as jest.Mock).mockImplementation(() => true);

    await expect(
      client.request('booking', { method: 'GET', url: 'http://booking' }),
    ).rejects.toThrow(GatewayTimeoutException);
  });

  it('should forward X-Correlation-ID and Idempotency-Key headers to downstream', async () => {
    mockedAxios.request.mockResolvedValueOnce({ status: 200, data: {}, headers: {}, config: {}, statusText: 'OK' } as never);
    await client.request('booking', {
      method: 'GET',
      url: 'http://booking',
      correlationId: 'corr-123',
      idempotencyKey: 'idem-456',
    });
    const calledConfig = mockedAxios.request.mock.calls[0]?.[0] as { headers: Record<string, string> };
    expect(calledConfig?.headers?.['X-Correlation-ID']).toBe('corr-123');
    expect(calledConfig?.headers?.['Idempotency-Key']).toBe('idem-456');
  });
});
