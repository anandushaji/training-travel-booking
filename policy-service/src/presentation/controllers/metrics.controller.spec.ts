import { MetricsController } from './metrics.controller';
import { Response } from 'express';

// Mock prom-client so the test does not depend on registered metrics state
jest.mock('prom-client', () => ({
  register: {
    metrics: jest.fn().mockResolvedValue('# HELP test\n# TYPE test counter\ntest 0\n'),
    clear: jest.fn(),
  },
}));

import * as prom from 'prom-client';

describe('MetricsController', () => {
  let controller: MetricsController;
  let mockRes: jest.Mocked<Pick<Response, 'status' | 'send'>>;

  beforeEach(() => {
    controller = new MetricsController();
    const sendFn = jest.fn();
    mockRes = {
      status: jest.fn().mockReturnValue({ send: sendFn }),
      send: sendFn,
    } as any;
  });

  it('GET /metrics returns prometheus plaintext', async () => {
    const sendFn = jest.fn();
    const mockResponse = {
      status: jest.fn().mockReturnValue({ send: sendFn }),
    } as unknown as Response;

    await controller.metrics(mockResponse);

    expect(mockResponse.status).toHaveBeenCalledWith(200);
    expect(sendFn).toHaveBeenCalledWith(expect.stringContaining('test'));
    expect(prom.register.metrics).toHaveBeenCalled();
  });
});
