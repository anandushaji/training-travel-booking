import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest') as typeof import('supertest');
import { MetricsController } from './metrics.controller';
import { MetricsService } from '../../infrastructure/observability/metrics.service';

describe('MetricsController', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [MetricsService],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should expose /metrics endpoint with all required metric names', async () => {
    const resp = await request(app.getHttpServer()).get('/metrics');
    expect(resp.status).toBe(200);
    expect(resp.text).toContain('http_requests_total');
    expect(resp.text).toContain('cache_hit_total');
    expect(resp.text).toContain('kafka_events_published_total');
    expect(resp.text).toContain('circuit_state');
    expect(resp.text).toContain('reservations_expired_total');
  });
});
