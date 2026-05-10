import { Injectable } from '@nestjs/common';
import {
  Counter,
  Gauge,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry: Registry;

  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly retryCount: Counter;
  private readonly circuitState: Gauge;
  private readonly circuitBreakerErrors: Counter;
  private readonly cacheHitTotal: Counter;
  private readonly cacheMissTotal: Counter;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.retryCount = new Counter({
      name: 'retry_count',
      help: 'Retry count by service and outcome',
      labelNames: ['service', 'outcome'],
      registers: [this.registry],
    });

    this.circuitState = new Gauge({
      name: 'circuit_state',
      help: 'Circuit breaker state: 0=CLOSED, 0.5=HALF_OPEN, 1=OPEN',
      labelNames: ['service'],
      registers: [this.registry],
    });

    this.circuitBreakerErrors = new Counter({
      name: 'circuit_breaker_errors_total',
      help: 'Total circuit breaker errors',
      labelNames: ['service'],
      registers: [this.registry],
    });

    this.cacheHitTotal = new Counter({
      name: 'cache_hit_total',
      help: 'Cache hits',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.cacheMissTotal = new Counter({
      name: 'cache_miss_total',
      help: 'Cache misses',
      labelNames: ['type'],
      registers: [this.registry],
    });
  }

  incrementHttpRequests(method: string, route: string, statusCode: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: String(statusCode) });
  }

  recordHttpDuration(method: string, route: string, durationSeconds: number): void {
    this.httpRequestDuration.observe({ method, route }, durationSeconds);
  }

  incrementRetryCount(service: string, outcome: string): void {
    this.retryCount.inc({ service, outcome });
  }

  setCircuitState(service: string, state: 0 | 0.5 | 1): void {
    this.circuitState.set({ service }, state);
  }

  incrementCircuitBreakerErrors(service: string): void {
    this.circuitBreakerErrors.inc({ service });
  }

  incrementCacheHit(type: string): void {
    this.cacheHitTotal.inc({ type });
  }

  incrementCacheMiss(type: string): void {
    this.cacheMissTotal.inc({ type });
  }
}
