// @ts-nocheck
import * as prom from 'prom-client';
import { MetricsController } from './metrics.controller';

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(() => {
    prom.register.clear();
    controller = new MetricsController();
  });

  it('GET /metrics sets Content-Type and sends metrics', async () => {
    const res: any = { set: jest.fn(), send: jest.fn() };
    await controller.metrics(res);
    expect(res.set).toHaveBeenCalledWith('Content-Type', prom.register.contentType);
    expect(res.send).toHaveBeenCalled();
  });
});
