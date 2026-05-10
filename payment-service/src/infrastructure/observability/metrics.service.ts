import { Injectable } from '@nestjs/common';
import * as prom from 'prom-client';

@Injectable()
export class MetricsService {
  // HTTP metrics
  readonly httpRequestsTotal: prom.Counter<string>;
  readonly httpRequestDurationSeconds: prom.Histogram<string>;

  // Stripe metrics
  readonly stripeApiCallsTotal: prom.Counter<string>;
  readonly stripeApiErrorsTotal: prom.Counter<string>;
  readonly circuitState: prom.Gauge<string>;
  readonly circuitBreakerErrorsTotal: prom.Counter<string>;
  readonly retryCount: prom.Counter<string>;

  // Business metrics
  readonly paymentsCreatedTotal: prom.Counter<string>;
  readonly paymentsCapturedTotal: prom.Counter<string>;
  readonly paymentsRefundedTotal: prom.Counter<string>;

  // Kafka metrics
  readonly kafkaEventsPublishedTotal: prom.Counter<string>;

  // DB metrics
  readonly dbQueryDurationSeconds: prom.Histogram<string>;

  constructor() {
    const register = prom.register;

    this.httpRequestsTotal = new prom.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [register],
    });

    this.httpRequestDurationSeconds = new prom.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [register],
    });

    this.stripeApiCallsTotal = new prom.Counter({
      name: 'stripe_api_calls_total',
      help: 'Total Stripe API calls',
      labelNames: ['operation', 'outcome'],
      registers: [register],
    });

    this.stripeApiErrorsTotal = new prom.Counter({
      name: 'stripe_api_errors_total',
      help: 'Total Stripe API errors',
      labelNames: ['operation', 'error_type'],
      registers: [register],
    });

    this.paymentsCreatedTotal = new prom.Counter({
      name: 'payments_created_total',
      help: 'Total payments created',
      labelNames: ['currency'],
      registers: [register],
    });

    this.paymentsCapturedTotal = new prom.Counter({
      name: 'payments_captured_total',
      help: 'Total payments captured',
      labelNames: ['currency'],
      registers: [register],
    });

    this.paymentsRefundedTotal = new prom.Counter({
      name: 'payments_refunded_total',
      help: 'Total payments refunded',
      labelNames: ['currency'],
      registers: [register],
    });

    this.circuitState = new prom.Gauge({
      name: 'circuit_state',
      help: 'Circuit breaker state (1=open, 0=closed)',
      labelNames: ['service'],
      registers: [register],
    });

    this.circuitBreakerErrorsTotal = new prom.Counter({
      name: 'circuit_breaker_errors_total',
      help: 'Total circuit breaker errors',
      labelNames: ['service'],
      registers: [register],
    });

    this.retryCount = new prom.Counter({
      name: 'retry_count',
      help: 'Total retry attempts',
      labelNames: ['operation', 'outcome'],
      registers: [register],
    });

    this.kafkaEventsPublishedTotal = new prom.Counter({
      name: 'kafka_events_published_total',
      help: 'Total Kafka events published',
      labelNames: ['topic', 'event_type'],
      registers: [register],
    });

    this.dbQueryDurationSeconds = new prom.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
      registers: [register],
    });
  }

  incrementHttpRequests(method: string, route: string, statusCode: string): void {
    this.httpRequestsTotal.inc({ method, route, status_code: statusCode });
  }

  incrementStripeApiCalls(operation: string, outcome: string): void {
    this.stripeApiCallsTotal.inc({ operation, outcome });
  }

  incrementStripeApiErrors(operation: string, errorType: string): void {
    this.stripeApiErrorsTotal.inc({ operation, error_type: errorType });
    this.circuitBreakerErrorsTotal.inc({ service: 'stripe' });
  }

  setCircuitState(service: string, state: number): void {
    this.circuitState.set({ service }, state);
  }

  incrementRetryCount(operation: string, outcome: string): void {
    this.retryCount.inc({ operation, outcome });
  }

  incrementPaymentsCreated(currency: string): void {
    this.paymentsCreatedTotal.inc({ currency });
  }

  incrementPaymentsCaptured(currency: string): void {
    this.paymentsCapturedTotal.inc({ currency });
  }

  incrementPaymentsRefunded(currency: string): void {
    this.paymentsRefundedTotal.inc({ currency });
  }

  incrementKafkaEventsPublished(topic: string, eventType: string): void {
    this.kafkaEventsPublishedTotal.inc({ topic, event_type: eventType });
  }

  async getMetrics(): Promise<string> {
    return prom.register.metrics();
  }
}
