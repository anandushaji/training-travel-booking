import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(() => {
    service = new MetricsService();
  });

  it('should increment cache_hit_total on cache hit', () => {
    const counter = (service as any).cacheHitTotal;
    const spy = jest.spyOn(counter, 'inc');
    service.incrementCacheHit('traveler');
    expect(spy).toHaveBeenCalledWith({ entity: 'traveler' });
  });

  it('should increment cache_miss_total on cache miss', () => {
    const counter = (service as any).cacheMissTotal;
    const spy = jest.spyOn(counter, 'inc');
    service.incrementCacheMiss('traveler');
    expect(spy).toHaveBeenCalledWith({ entity: 'traveler' });
  });

  it('should increment kafka_events_published_total with correct topic and status', () => {
    const counter = (service as any).kafkaEventsPublishedTotal;
    const spy = jest.spyOn(counter, 'inc');
    service.incrementKafkaPublished('traveler.created', 'success');
    expect(spy).toHaveBeenCalledWith({ topic: 'traveler.created', status: 'success' });
  });

  it('should set circuit_state gauge to 1 on circuit open', () => {
    const gauge = (service as any).circuitState;
    const spy = jest.spyOn(gauge, 'set');
    service.setCircuitState('hr-soap', 'open');
    expect(spy).toHaveBeenCalledWith({ service: 'hr-soap' }, 1);
  });

  it('should set circuit_state gauge to 0.5 on circuit half-open', () => {
    const gauge = (service as any).circuitState;
    const spy = jest.spyOn(gauge, 'set');
    service.setCircuitState('hr-soap', 'half-open');
    expect(spy).toHaveBeenCalledWith({ service: 'hr-soap' }, 0.5);
  });

  it('should set circuit_state gauge to 0 on circuit closed', () => {
    const gauge = (service as any).circuitState;
    const spy = jest.spyOn(gauge, 'set');
    service.setCircuitState('hr-soap', 'closed');
    expect(spy).toHaveBeenCalledWith({ service: 'hr-soap' }, 0);
  });

  it('should increment retry_count with operation and outcome labels', () => {
    const counter = (service as any).retryCount;
    const spy = jest.spyOn(counter, 'inc');
    service.incrementRetryCount('kafka-publish', 'failure');
    expect(spy).toHaveBeenCalledWith({ operation: 'kafka-publish', outcome: 'failure' });
  });

  it('should record http_requests_total and http_request_duration_seconds per request', () => {
    const counterSpy = jest.spyOn((service as any).httpRequestsTotal, 'inc');
    const histSpy = jest.spyOn((service as any).httpRequestDuration, 'observe');
    service.recordHttpRequest('GET', '/travelers', 200, 0.05);
    expect(counterSpy).toHaveBeenCalledWith({ method: 'GET', route: '/travelers', status_code: 200 });
    expect(histSpy).toHaveBeenCalledWith({ method: 'GET', route: '/travelers' }, 0.05);
  });

  it('should expose metrics registry via getMetrics()', async () => {
    const metrics = await service.getMetrics();
    expect(typeof metrics).toBe('string');
    expect(metrics).toContain('cache_hit_total');
  });
});
