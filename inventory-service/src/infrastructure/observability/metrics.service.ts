import { Injectable } from '@nestjs/common';
import {
  Counter,
  Histogram,
  Gauge,
  Registry,
  collectDefaultMetrics,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry: Registry;

  private readonly httpRequestsTotal: Counter;
  private readonly httpRequestDuration: Histogram;
  private readonly cacheHitTotal: Counter;
  private readonly cacheMissTotal: Counter;
  private readonly amadeusApiCallsTotal: Counter;
  private readonly amadeusApiErrorsTotal: Counter;
  private readonly circuitState: Gauge;
  private readonly circuitBreakerErrorsTotal: Counter;
  private readonly retryCount: Counter;
  private readonly kafkaEventsPublishedTotal: Counter;
  private readonly reservationsExpiredTotal: Counter;
  private readonly dbQueryDuration: Histogram;

  constructor() {
    this.registry = new Registry();
    collectDefaultMetrics({ register: this.registry });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
      registers: [this.registry],
    });

    this.cacheHitTotal = new Counter({
      name: 'cache_hit_total',
      help: 'Cache hits',
      labelNames: ['cache', 'operation'],
      registers: [this.registry],
    });

    this.cacheMissTotal = new Counter({
      name: 'cache_miss_total',
      help: 'Cache misses',
      labelNames: ['cache', 'operation'],
      registers: [this.registry],
    });

    this.amadeusApiCallsTotal = new Counter({
      name: 'amadeus_api_calls_total',
      help: 'Amadeus API calls',
      labelNames: ['endpoint', 'status'],
      registers: [this.registry],
    });

    this.amadeusApiErrorsTotal = new Counter({
      name: 'amadeus_api_errors_total',
      help: 'Amadeus API errors',
      labelNames: ['endpoint', 'error_type'],
      registers: [this.registry],
    });

    this.circuitState = new Gauge({
      name: 'circuit_state',
      help: 'Circuit breaker state (0=closed, 0.5=half-open, 1=open)',
      labelNames: ['service'],
      registers: [this.registry],
    });

    this.circuitBreakerErrorsTotal = new Counter({
      name: 'circuit_breaker_errors_total',
      help: 'Circuit breaker error count',
      labelNames: ['service'],
      registers: [this.registry],
    });

    this.retryCount = new Counter({
      name: 'retry_count',
      help: 'Retry attempts',
      labelNames: ['operation', 'outcome'],
      registers: [this.registry],
    });

    this.kafkaEventsPublishedTotal = new Counter({
      name: 'kafka_events_published_total',
      help: 'Kafka events published',
      labelNames: ['topic', 'eventType', 'status'],
      registers: [this.registry],
    });

    this.reservationsExpiredTotal = new Counter({
      name: 'reservations_expired_total',
      help: 'Reservations expired by job',
      registers: [this.registry],
    });

    this.dbQueryDuration = new Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [this.registry],
    });
  }

  recordHttpRequest(method: string, route: string, statusCode: number, durationSeconds: number): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route }, durationSeconds);
  }

  incrementCacheHit(cache: string): void {
    this.cacheHitTotal.inc({ cache, operation: 'get' });
  }

  incrementCacheMiss(cache: string): void {
    this.cacheMissTotal.inc({ cache, operation: 'get' });
  }

  incrementAmadeusCall(endpoint: string, status: string): void {
    this.amadeusApiCallsTotal.inc({ endpoint, status });
  }

  incrementAmadeusError(endpoint: string, errorType: string): void {
    this.amadeusApiErrorsTotal.inc({ endpoint, error_type: errorType });
  }

  setCircuitState(service: string, state: 'open' | 'half-open' | 'closed'): void {
    const value = state === 'open' ? 1 : state === 'half-open' ? 0.5 : 0;
    this.circuitState.set({ service }, value);
  }

  incrementCircuitBreakerError(service: string): void {
    this.circuitBreakerErrorsTotal.inc({ service });
  }

  incrementRetryCount(operation: string, outcome: 'success' | 'exhausted'): void {
    this.retryCount.inc({ operation, outcome });
  }

  incrementKafkaPublished(topic: string, eventType: string, status: 'success' | 'failure'): void {
    this.kafkaEventsPublishedTotal.inc({ topic, eventType, status });
  }

  incrementReservationsExpired(): void {
    this.reservationsExpiredTotal.inc();
  }

  observeDbQuery(operation: string, durationSeconds: number): void {
    this.dbQueryDuration.observe({ operation }, durationSeconds);
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }
}
