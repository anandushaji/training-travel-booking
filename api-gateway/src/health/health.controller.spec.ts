import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();
    controller = module.get(HealthController);
  });

  it('should return 200 with health status without authentication', () => {
    const result = controller.getHealth();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('api-gateway');
    expect(result.timestamp).toBeDefined();
  });

  it('should return 200 with text/plain Prometheus metrics format', async () => {
    const res = {
      setHeader: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    await controller.getMetrics(res as never);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/plain; version=0.0.4');
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalled();
  });
});
