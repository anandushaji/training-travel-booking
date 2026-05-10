// @ts-nocheck
import { JwtAuthGuard } from './jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

const makeContext = (headers: Record<string, string>) => ({
  switchToHttp: () => ({
    getRequest: () => ({ headers }),
  }),
});

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('throws UnauthorizedException when authorization header is missing', () => {
    const ctx = makeContext({}) as any;
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when header does not start with Bearer ', () => {
    const ctx = makeContext({ authorization: 'Basic abc123' }) as any;
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('attaches payload and returns true for a valid JWT', () => {
    const payload = Buffer.from(
      JSON.stringify({ sub: 'user-1', role: 'EMPLOYEE' }),
    ).toString('base64url');
    const token = `header.${payload}.signature`;
    const req: any = { headers: { authorization: `Bearer ${token}` } };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as any;

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(req.user.sub).toBe('user-1');
    expect(req.user.role).toBe('EMPLOYEE');
  });

  it('throws UnauthorizedException for JWT with fewer than 3 parts', () => {
    const ctx = makeContext({ authorization: 'Bearer only.twoparts' }) as any;
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when payload is not valid JSON', () => {
    const notJson = Buffer.from('not-valid-json').toString('base64url');
    const token = `header.${notJson}.signature`;
    const ctx = makeContext({ authorization: `Bearer ${token}` }) as any;
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
