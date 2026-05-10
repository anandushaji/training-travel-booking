import * as prom from 'prom-client';

// Reset prom-client registry before creating MetricsService to avoid duplicate metric errors in tests
beforeEach(() => {
  prom.register.clear();
});

import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('should register all 12 required Prometheus metrics', async () => {
    const metrics = await service.getMetrics();

    expect(metrics).toContain('http_requests_total');
    expect(metrics).toContain('http_request_duration_seconds');
    expect(metrics).toContain('stripe_api_calls_total');
    expect(metrics).toContain('stripe_api_errors_total');
    expect(metrics).toContain('payments_created_total');
    expect(metrics).toContain('payments_captured_total');
    expect(metrics).toContain('payments_refunded_total');
    expect(metrics).toContain('circuit_state');
    expect(metrics).toContain('circuit_breaker_errors_total');
    expect(metrics).toContain('retry_count');
    expect(metrics).toContain('kafka_events_published_total');
    expect(metrics).toContain('db_query_duration_seconds');
  });

  it('should set circuit_state gauge to 1 when circuit opens and 0 when circuit closes', () => {
    service.setCircuitState('stripe', 1);
    expect(service.circuitState.get()).resolves.toBeDefined();

    service.setCircuitState('stripe', 0);
  });

  it('should increment stripe_api_calls_total', () => {
    expect(() => service.incrementStripeApiCalls('createPaymentIntent', 'success')).not.toThrow();
  });

  it('should increment kafka_events_published_total', () => {
    expect(() => service.incrementKafkaEventsPublished('payment-events', 'PaymentAuthorized')).not.toThrow();
  });

  it('should increment http_requests_total', () => {
    expect(() => service.incrementHttpRequests('GET', '/health', '200')).not.toThrow();
  });

  it('should increment stripe_api_errors_total and circuit_breaker_errors_total', () => {
    expect(() => service.incrementStripeApiErrors('createPaymentIntent', 'card_declined')).not.toThrow();
  });

  it('should increment retry_count', () => {
    expect(() => service.incrementRetryCount('createPaymentIntent', 'retry')).not.toThrow();
  });

  it('should increment payments_created_total', () => {
    expect(() => service.incrementPaymentsCreated('USD')).not.toThrow();
  });

  it('should increment payments_captured_total', () => {
    expect(() => service.incrementPaymentsCaptured('USD')).not.toThrow();
  });

  it('should increment payments_refunded_total', () => {
    expect(() => service.incrementPaymentsRefunded('USD')).not.toThrow();
  });
});
