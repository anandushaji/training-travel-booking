import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('should increment http_requests_total with method, route, and status_code labels', async () => {
    service.incrementHttpRequests('GET', '/api/v1/bookings', 200);
    const metrics = await service.registry.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'http_requests_total');
    expect(counter).toBeDefined();
    const value = (counter?.values as Array<{ labels: Record<string, string>; value: number }>)?.find(
      (v) => v.labels.method === 'GET' && v.labels.route === '/api/v1/bookings',
    );
    expect(value?.value).toBeGreaterThan(0);
  });

  it('should set circuit_state gauge to 1 when setCircuitState(service, 1) is called', async () => {
    service.setCircuitState('booking', 1);
    const metrics = await service.registry.getMetricsAsJSON();
    const gauge = metrics.find((m) => m.name === 'circuit_state');
    const value = (gauge?.values as Array<{ labels: Record<string, string>; value: number }>)?.find(
      (v) => v.labels.service === 'booking',
    );
    expect(value?.value).toBe(1);
  });

  it('should increment retry_count with correct service and outcome labels', async () => {
    service.incrementRetryCount('booking', 'retry');
    const metrics = await service.registry.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'retry_count');
    const value = (counter?.values as Array<{ labels: Record<string, string>; value: number }>)?.find(
      (v) => v.labels.service === 'booking' && v.labels.outcome === 'retry',
    );
    expect(value?.value).toBe(1);
  });

  it('should increment cache_hit_total and cache_miss_total with type label', async () => {
    service.incrementCacheHit('rate_limit');
    service.incrementCacheMiss('rate_limit');
    const metrics = await service.registry.getMetricsAsJSON();

    const hit = metrics.find((m) => m.name === 'cache_hit_total');
    const hitVal = (hit?.values as Array<{ labels: Record<string, string>; value: number }>)?.find(
      (v) => v.labels.type === 'rate_limit',
    );
    expect(hitVal?.value).toBe(1);

    const miss = metrics.find((m) => m.name === 'cache_miss_total');
    const missVal = (miss?.values as Array<{ labels: Record<string, string>; value: number }>)?.find(
      (v) => v.labels.type === 'rate_limit',
    );
    expect(missVal?.value).toBe(1);
  });

  it('should increment circuit_breaker_errors_total with service label', async () => {
    service.incrementCircuitBreakerErrors('policy');
    const metrics = await service.registry.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'circuit_breaker_errors_total');
    const val = (counter?.values as Array<{ labels: Record<string, string>; value: number }>)?.find(
      (v) => v.labels.service === 'policy',
    );
    expect(val?.value).toBe(1);
  });
});
