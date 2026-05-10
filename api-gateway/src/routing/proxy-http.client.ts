import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
} from '@nestjs/common';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { CircuitBreakerService } from '../circuit-breaker/circuit-breaker.service';

export interface MetricsServiceInterface {
  incrementRetryCount(service: string, outcome: string): void;
}

const RETRYABLE_STATUS_CODES = new Set([500, 502, 503, 504, 408]);
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 200;
const BACKOFF_MAX_MS = 5000;

function computeDelay(attempt: number): number {
  const base = Math.min(BACKOFF_BASE_MS * Math.pow(2, attempt), BACKOFF_MAX_MS);
  return base * (0.5 + Math.random());
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

@Injectable()
export class ProxyHttpClient {
  private readonly logger = new Logger(ProxyHttpClient.name);
  private metricsService: MetricsServiceInterface | null = null;

  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  setMetricsService(metrics: MetricsServiceInterface): void {
    this.metricsService = metrics;
  }

  async request<T = unknown>(
    serviceName: string,
    config: AxiosRequestConfig & {
      correlationId?: string;
      idempotencyKey?: string;
    },
  ): Promise<AxiosResponse<T>> {
    const { correlationId, idempotencyKey, ...axiosConfig } = config;

    const headers: Record<string, string> = {
      ...(axiosConfig.headers as Record<string, string> | undefined),
    };
    if (correlationId) headers['X-Correlation-ID'] = correlationId;
    if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

    const requestConfig: AxiosRequestConfig = {
      ...axiosConfig,
      headers,
      timeout: 10000,
      validateStatus: () => true, // never throw on any HTTP status — proxy forwards all codes
    };

    return this.circuitBreaker.execute(serviceName, () =>
      this.executeWithRetry<T>(serviceName, requestConfig),
    );
  }

  private async executeWithRetry<T>(
    serviceName: string,
    config: AxiosRequestConfig,
  ): Promise<AxiosResponse<T>> {
    let lastResponse: AxiosResponse<T> | undefined;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await axios.request<T>(config);
        lastResponse = response;

        // Timeout sentinel (shouldn't fire with validateStatus, but guard anyway)
        if (axios.isAxiosError(response) && (response as unknown as { code: string }).code === 'ECONNABORTED') {
          throw new GatewayTimeoutException('Downstream request timed out');
        }

        // Non-retryable: forward immediately (4xx or non-error 2xx/3xx)
        if (!RETRYABLE_STATUS_CODES.has(response.status)) {
          return response;
        }

        // Retryable 5xx — retry if attempts remain
        if (attempt < MAX_RETRIES) {
          this.metricsService?.incrementRetryCount(serviceName, 'retry');
          await sleep(computeDelay(attempt));
          continue;
        }

        // Retries exhausted — return the last response rather than crashing
        this.metricsService?.incrementRetryCount(serviceName, 'exhausted');
        return response;
      } catch (err: unknown) {
        // Network-level errors (ECONNREFUSED, ECONNABORTED, etc.)
        if (axios.isAxiosError(err) && err.code === 'ECONNABORTED') {
          throw new GatewayTimeoutException('Downstream request timed out');
        }
        if (attempt < MAX_RETRIES) {
          await sleep(computeDelay(attempt));
          continue;
        }
        throw new BadGatewayException('Downstream service unreachable');
      }
    }

    // Should be unreachable, but satisfy TypeScript
    if (lastResponse) return lastResponse;
    throw new BadGatewayException('All retries exhausted for downstream service');
  }
}
