import { Injectable } from '@nestjs/common';
import * as prom from 'prom-client';

@Injectable()
export class PolicyMetricsService {
  readonly httpRequestsTotal: prom.Counter<string>;
  readonly httpRequestDurationSeconds: prom.Histogram<string>;
  readonly policyValidationsTotal: prom.Counter<string>;
  readonly travelerServiceRetriesTotal: prom.Counter<string>;
  readonly travelerServiceCbState: prom.Gauge<string>;
  readonly redisCacheHitsTotal: prom.Counter<string>;
  readonly redisCacheMissesTotal: prom.Counter<string>;

  constructor() {
    this.httpRequestsTotal = new prom.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestDurationSeconds = new prom.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'route'],
      buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
    });

    this.policyValidationsTotal = new prom.Counter({
      name: 'policy_validations_total',
      help: 'Total policy validations',
      labelNames: ['result'],
    });

    this.travelerServiceRetriesTotal = new prom.Counter({
      name: 'traveler_service_retries_total',
      help: 'Total retries to traveler service',
    });

    this.travelerServiceCbState = new prom.Gauge({
      name: 'traveler_service_cb_state',
      help: 'Traveler service circuit breaker state (1=open/half-open, 0=closed)',
      labelNames: ['state'],
    });

    this.redisCacheHitsTotal = new prom.Counter({
      name: 'redis_cache_hits_total',
      help: 'Total Redis cache hits',
      labelNames: ['key_type'],
    });

    this.redisCacheMissesTotal = new prom.Counter({
      name: 'redis_cache_misses_total',
      help: 'Total Redis cache misses',
      labelNames: ['key_type'],
    });
  }

  incrementValidationsTotal(result: 'valid' | 'invalid'): void {
    this.policyValidationsTotal.inc({ result });
  }

  incrementTravelerServiceRetries(): void {
    this.travelerServiceRetriesTotal.inc();
  }

  setTravelerServiceCbState(state: 'open' | 'half-open' | 'closed'): void {
    this.travelerServiceCbState.set({ state }, state === 'closed' ? 0 : 1);
  }

  incrementCacheHits(keyType: string): void {
    this.redisCacheHitsTotal.inc({ key_type: keyType });
  }

  incrementCacheMisses(keyType: string): void {
    this.redisCacheMissesTotal.inc({ key_type: keyType });
  }

  incrementKafkaEventsPublished(topic: string, eventType: string): void {
    // Not tracked with a separate counter here but available for extension
    void topic;
    void eventType;
  }
}
