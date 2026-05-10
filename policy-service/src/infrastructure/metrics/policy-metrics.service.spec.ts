import * as prom from 'prom-client';
import { PolicyMetricsService } from './policy-metrics.service';

describe('PolicyMetricsService', () => {
  let service: PolicyMetricsService;

  beforeEach(() => {
    prom.register.clear();
    service = new PolicyMetricsService();
  });

  it('increments validations_total on valid result', async () => {
    service.incrementValidationsTotal('valid');
    const metrics = await prom.register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'policy_validations_total');
    expect(counter).toBeDefined();
    const sample = (counter as any).values?.find((v: any) =>
      v.labels?.result === 'valid',
    );
    expect(sample?.value).toBe(1);
  });

  it('increments validations_total on invalid result', async () => {
    service.incrementValidationsTotal('invalid');
    const metrics = await prom.register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'policy_validations_total');
    const sample = (counter as any).values?.find((v: any) =>
      v.labels?.result === 'invalid',
    );
    expect(sample?.value).toBe(1);
  });

  it('sets cb_state gauge to 1 on OPEN', async () => {
    service.setTravelerServiceCbState('open');
    const metrics = await prom.register.getMetricsAsJSON();
    const gauge = metrics.find((m) => m.name === 'traveler_service_cb_state');
    expect(gauge).toBeDefined();
    const sample = (gauge as any).values?.find((v: any) =>
      v.labels?.state === 'open',
    );
    expect(sample?.value).toBe(1);
  });

  it('sets cb_state gauge to 0 on CLOSED', async () => {
    service.setTravelerServiceCbState('closed');
    const metrics = await prom.register.getMetricsAsJSON();
    const gauge = metrics.find((m) => m.name === 'traveler_service_cb_state');
    const sample = (gauge as any).values?.find((v: any) =>
      v.labels?.state === 'closed',
    );
    expect(sample?.value).toBe(0);
  });

  it('increments hits counter on cache hit', async () => {
    service.incrementCacheHits('policy');
    const metrics = await prom.register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'redis_cache_hits_total');
    const sample = (counter as any).values?.find((v: any) =>
      v.labels?.key_type === 'policy',
    );
    expect(sample?.value).toBe(1);
  });

  it('increments misses counter on cache miss', async () => {
    service.incrementCacheMisses('policy');
    const metrics = await prom.register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'redis_cache_misses_total');
    const sample = (counter as any).values?.find((v: any) =>
      v.labels?.key_type === 'policy',
    );
    expect(sample?.value).toBe(1);
  });

  it('increments traveler retries counter', async () => {
    service.incrementTravelerServiceRetries();
    const metrics = await prom.register.getMetricsAsJSON();
    const counter = metrics.find((m) => m.name === 'traveler_service_retries_total');
    expect(counter).toBeDefined();
    expect((counter as any).values?.[0]?.value).toBe(1);
  });
});
