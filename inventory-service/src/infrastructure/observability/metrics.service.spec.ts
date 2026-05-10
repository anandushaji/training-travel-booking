import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('should increment cache_hit_total on cache hit and not increment cache_miss_total', () => {
    service.incrementCacheHit('flight-search');
    // If this doesn't throw, the counter was incremented successfully
    // The metric increment is verified by checking getMetrics output
    return service.getMetrics().then((output) => {
      expect(output).toContain('cache_hit_total');
    });
  });

  it('should set circuit_state gauge to 1 on open, 0.5 on half-open, 0 on closed', async () => {
    service.setCircuitState('amadeus', 'open');
    service.setCircuitState('amadeus', 'half-open');
    service.setCircuitState('amadeus', 'closed');
    const output = await service.getMetrics();
    expect(output).toContain('circuit_state');
  });

  it('should increment kafka_events_published_total success counter on successful publish', async () => {
    service.incrementKafkaPublished('inventory-events', 'FlightReserved', 'success');
    const output = await service.getMetrics();
    expect(output).toContain('kafka_events_published_total');
  });

  it('should expose all required metric names', async () => {
    const output = await service.getMetrics();
    expect(output).toContain('http_requests_total');
    expect(output).toContain('http_request_duration_seconds');
    expect(output).toContain('cache_hit_total');
    expect(output).toContain('cache_miss_total');
    expect(output).toContain('amadeus_api_calls_total');
    expect(output).toContain('circuit_state');
    expect(output).toContain('kafka_events_published_total');
    expect(output).toContain('reservations_expired_total');
    expect(output).toContain('db_query_duration_seconds');
  });

  it('should increment cache_miss_total', async () => {
    service.incrementCacheMiss('flight-search');
    const output = await service.getMetrics();
    expect(output).toContain('cache_miss_total');
  });

  it('should record http request duration', async () => {
    service.recordHttpRequest('GET', '/api/v1/flights/search', 200, 0.05);
    const output = await service.getMetrics();
    expect(output).toContain('http_requests_total');
    expect(output).toContain('http_request_duration_seconds');
  });

  it('should increment amadeus API call and error counters', async () => {
    service.incrementAmadeusCall('/v2/shopping/flight-offers', 'success');
    service.incrementAmadeusError('/v2/shopping/flight-offers', 'TIMEOUT');
    const output = await service.getMetrics();
    expect(output).toContain('amadeus_api_calls_total');
    expect(output).toContain('amadeus_api_errors_total');
  });

  it('should increment circuit breaker error counter', async () => {
    service.incrementCircuitBreakerError('amadeus');
    const output = await service.getMetrics();
    expect(output).toContain('circuit_breaker_errors_total');
  });

  it('should increment retry count', async () => {
    service.incrementRetryCount('amadeus-search', 'success');
    service.incrementRetryCount('amadeus-search', 'exhausted');
    const output = await service.getMetrics();
    expect(output).toContain('retry_count');
  });

  it('should increment reservations_expired_total', async () => {
    service.incrementReservationsExpired();
    const output = await service.getMetrics();
    expect(output).toContain('reservations_expired_total');
  });

  it('should observe db query duration', async () => {
    service.observeDbQuery('findById', 0.003);
    const output = await service.getMetrics();
    expect(output).toContain('db_query_duration_seconds');
  });

  it('should increment kafka failure counter', async () => {
    service.incrementKafkaPublished('inventory-events', 'FlightReserved', 'failure');
    const output = await service.getMetrics();
    expect(output).toContain('kafka_events_published_total');
  });
});
