// @ts-nocheck
import 'reflect-metadata';
import * as prom from 'prom-client';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: any;

  beforeEach(() => {
    prom.register.clear();
    mockDataSource = { query: jest.fn().mockResolvedValue([]) };
    controller = new HealthController(mockDataSource);
  });

  it('GET /health returns 200', () => {
    const result = controller.health();
    expect(result.status).toBe('healthy');
    expect(result.timestamp).toBeDefined();
  });

  it('GET /ready returns 503 when DB down', async () => {
    mockDataSource.query.mockRejectedValue(new Error('DB down'));
    const { ServiceUnavailableException } = require('@nestjs/common');
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('GET /metrics returns 200', async () => {
    const result = await controller.metrics();
    expect(typeof result).toBe('string');
  });
});
