import { IdempotencyMiddleware } from './idempotency.middleware';

describe('IdempotencyMiddleware', () => {
  const middleware = new IdempotencyMiddleware();
  const noopNext = jest.fn();
  const res = {} as never;

  it('should preserve provided Idempotency-Key header on request context', () => {
    const req = { headers: { 'idempotency-key': 'my-key-123' } } as never;
    middleware.use(req, res, noopNext);
    expect((req as { idempotencyKey?: string }).idempotencyKey).toBe('my-key-123');
  });

  it('should generate UUID v4 when Idempotency-Key header is absent', () => {
    const req = { headers: {} } as never;
    middleware.use(req, res, noopNext);
    const key = (req as { idempotencyKey?: string }).idempotencyKey;
    expect(key).toBeDefined();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(key).toMatch(uuidRegex);
  });

  it('should call next()', () => {
    const req = { headers: {} } as never;
    middleware.use(req, res, noopNext);
    expect(noopNext).toHaveBeenCalled();
  });
});
