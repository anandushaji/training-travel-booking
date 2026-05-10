import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { HealthController } from './health.controller';
import * as prom from 'prom-client';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: { query: jest.Mock };

  beforeEach(async () => {
    prom.register.clear();
    mockDataSource = { query: jest.fn().mockResolvedValue([{ '?column?': 1 }]) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: getDataSourceToken(),
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('GET /health returns 200', () => {
    const result = controller.health();
    expect(result.status).toBe('healthy');
    expect(result.timestamp).toBeDefined();
  });

  it('GET /ready returns ready when DB is connected', async () => {
    const result = await controller.ready();
    expect(result.status).toBe('ready');
    expect(result.database).toBe('connected');
  });

  it('GET /ready returns 503 when DB down', async () => {
    mockDataSource.query.mockRejectedValueOnce(new Error('ECONNREFUSED'));
    await expect(controller.ready()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('GET /metrics returns 200', async () => {
    const result = await controller.metrics();
    expect(typeof result).toBe('string');
  });
});
