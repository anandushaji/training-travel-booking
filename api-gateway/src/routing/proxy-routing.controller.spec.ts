import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { ProxyRoutingController } from './proxy-routing.controller';
import { ProxyHttpClient } from './proxy-http.client';

function makeReq(path: string, method = 'GET'): {
  path: string;
  method: string;
  url: string;
  headers: Record<string, string>;
  body: unknown;
  query: Record<string, string>;
  correlationId?: string;
  idempotencyKey?: string;
} {
  return { path, method, url: path, headers: {}, body: {}, query: {} };
}

function makeRes(): { status: jest.Mock; setHeader: jest.Mock; send: jest.Mock; json: jest.Mock; _status?: number } {
  const res = { _status: 200 } as { _status: number; status: jest.Mock; setHeader: jest.Mock; send: jest.Mock; json: jest.Mock };
  res.status = jest.fn(() => res);
  res.setHeader = jest.fn();
  res.send = jest.fn();
  res.json = jest.fn();
  return res;
}

describe('ProxyRoutingController', () => {
  let controller: ProxyRoutingController;
  let proxyClient: jest.Mocked<ProxyHttpClient>;

  beforeEach(async () => {
    process.env['BOOKING_SERVICE_URL'] = 'http://booking:3001';
    process.env['POLICY_SERVICE_URL'] = 'http://policy:3002';
    process.env['TRAVELER_SERVICE_URL'] = 'http://traveler:3003';
    process.env['PAYMENT_SERVICE_URL'] = 'http://payment:3004';
    process.env['INVENTORY_SERVICE_URL'] = 'http://inventory:3005';
    process.env['EXPENSE_SERVICE_URL'] = 'http://expense:3006';

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [ProxyRoutingController],
      providers: [
        { provide: ProxyHttpClient, useValue: { request: jest.fn() } },
      ],
    }).compile();

    controller = module.get(ProxyRoutingController);
    proxyClient = module.get(ProxyHttpClient) as jest.Mocked<ProxyHttpClient>;
  });

  it('should route /api/v1/bookings/** to booking-service URL', async () => {
    (proxyClient.request as jest.Mock).mockResolvedValue({ status: 200, data: {}, headers: {} });
    const res = makeRes();
    await controller.proxy(makeReq('/api/v1/bookings/bkg-001') as never, res as never);
    const calledUrl: string = (proxyClient.request as jest.Mock).mock.calls[0]?.[1]?.url;
    expect(calledUrl).toContain('http://booking:3001');
    expect(calledUrl).toContain('/api/v1/bookings/bkg-001');
  });

  it('should resolve all six service prefixes to correct downstream URLs', async () => {
    const routes = [
      ['/api/v1/bookings', 'http://booking:3001'],
      ['/api/v1/policies', 'http://policy:3002'],
      ['/api/v1/travelers', 'http://traveler:3003'],
      ['/api/v1/payments', 'http://payment:3004'],
      ['/api/v1/inventory', 'http://inventory:3005'],
      ['/api/v1/expenses', 'http://expense:3006'],
      ['/api/v1/receipts', 'http://expense:3006'],
      ['/api/v1/categories', 'http://expense:3006'],
      ['/api/v1/admin/travelers', 'http://traveler:3003'],
    ] as [string, string][];

    for (const [path, expectedBase] of routes) {
      (proxyClient.request as jest.Mock).mockResolvedValue({ status: 200, data: {}, headers: {} });
      const res = makeRes();
      await controller.proxy(makeReq(path) as never, res as never);
      const calledUrl: string = (proxyClient.request as jest.Mock).mock.calls.at(-1)?.[1]?.url;
      expect(calledUrl).toContain(expectedBase);
    }
  });

  it('should return 404 for unrecognised route prefix', async () => {
    const res = makeRes();
    await controller.proxy(makeReq('/api/v1/unknown') as never, res as never);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Not Found' }));
  });

  it('should return downstream response status and body unchanged', async () => {
    (proxyClient.request as jest.Mock).mockResolvedValue({ status: 201, data: { id: 'b-1' }, headers: {} });
    const res = makeRes();
    await controller.proxy(makeReq('/api/v1/bookings') as never, res as never);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.send).toHaveBeenCalledWith({ id: 'b-1' });
  });

  it('should forward query string when URL contains ?', async () => {
    (proxyClient.request as jest.Mock).mockResolvedValue({ status: 200, data: {}, headers: { 'content-type': 'application/json' } });
    const req = { ...makeReq('/api/v1/inventory'), url: '/api/v1/inventory?destination=NYC&date=2026-06-01' };
    const res = makeRes();
    await controller.proxy(req as never, res as never);
    const calledUrl: string = (proxyClient.request as jest.Mock).mock.calls.at(-1)?.[1]?.url;
    expect(calledUrl).toContain('?destination=NYC');
  });

  it('should forward response headers from downstream to client', async () => {
    (proxyClient.request as jest.Mock).mockResolvedValue({
      status: 200,
      data: {},
      headers: { 'x-request-id': 'abc-123', 'content-type': 'application/json' },
    });
    const res = makeRes();
    await controller.proxy(makeReq('/api/v1/bookings') as never, res as never);
    expect(res.setHeader).toHaveBeenCalledWith('x-request-id', 'abc-123');
  });

  it('should inject X-User-Role, X-User-ID, X-User-Email headers when req.user is populated', async () => {
    (proxyClient.request as jest.Mock).mockResolvedValue({ status: 200, data: {}, headers: {} });
    const req = {
      ...makeReq('/api/v1/bookings'),
      user: { role: 'MANAGER', sub: 'user-uuid-123', email: 'mgr@corp.com' },
    };
    const res = makeRes();
    await controller.proxy(req as never, res as never);
    const calledHeaders: Record<string, string> = (proxyClient.request as jest.Mock).mock.calls.at(-1)?.[1]?.headers;
    expect(calledHeaders?.['X-User-Role']).toBe('MANAGER');
    expect(calledHeaders?.['X-User-ID']).toBe('user-uuid-123');
    expect(calledHeaders?.['X-User-Email']).toBe('mgr@corp.com');
  });

  it('should NOT inject identity headers when req.user is absent', async () => {
    (proxyClient.request as jest.Mock).mockResolvedValue({ status: 200, data: {}, headers: {} });
    const res = makeRes();
    await controller.proxy(makeReq('/api/v1/bookings') as never, res as never);
    const calledHeaders: Record<string, string> = (proxyClient.request as jest.Mock).mock.calls.at(-1)?.[1]?.headers;
    expect(calledHeaders?.['X-User-Role']).toBeUndefined();
  });

  it('should return 502 when downstream request throws', async () => {
    (proxyClient.request as jest.Mock).mockRejectedValue(new Error('Network error'));
    const res = makeRes();
    (res as unknown as { headersSent: boolean }).headersSent = false;
    await controller.proxy(makeReq('/api/v1/bookings') as never, res as never);
    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Bad Gateway' }));
  });

  it('should forward X-Correlation-ID and Idempotency-Key headers when set on req', async () => {
    (proxyClient.request as jest.Mock).mockResolvedValue({ status: 200, data: {}, headers: {} });
    const req = {
      ...makeReq('/api/v1/bookings'),
      correlationId: 'corr-123',
      idempotencyKey: 'idem-456',
    };
    const res = makeRes();
    await controller.proxy(req as never, res as never);
    const calledHeaders: Record<string, string> = (proxyClient.request as jest.Mock).mock.calls.at(-1)?.[1]?.headers;
    expect(calledHeaders?.['X-Correlation-ID']).toBe('corr-123');
    expect(calledHeaders?.['Idempotency-Key']).toBe('idem-456');
  });
});
