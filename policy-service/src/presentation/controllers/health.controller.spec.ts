import { Test, TestingModule } from '@nestjs/testing';
import { ServiceUnavailableException } from '@nestjs/common';
import { HealthController } from './health.controller';
import { DataSource } from 'typeorm';
import * as prom from 'prom-client';

describe('HealthController', () => {
  let controller: HealthController;
  let mockDataSource: jest.Mocked<Partial<DataSource>>;

  beforeEach(async () => {
    prom.register.clear();

    mockDataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('GET /health returns 200 without auth', async () => {
    const result = controller.health();
    expect(result.status).toBe('healthy');
    expect(result.timestamp).toBeDefined();
  });

  it('GET /ready returns ready when DB connected', async () => {
    const result = await controller.ready();
    expect(result.status).toBe('ready');
    expect(result.database).toBe('connected');
  });

  it('GET /ready returns 503 when DB down', async () => {
    (mockDataSource.query as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

    let threw = false;
    try {
      await controller.ready();
    } catch (err) {
      threw = true;
      expect(err).toBeInstanceOf(ServiceUnavailableException);
    }
    expect(threw).toBe(true);
  });
});
