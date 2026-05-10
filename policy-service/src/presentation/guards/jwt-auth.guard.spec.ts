import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeToken(payloadObj: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
  return `${header}.${payload}.fakesig`;
}

function makeContext(authHeader: string | undefined): ExecutionContext {
  const headers: Record<string, string | undefined> = {};
  if (authHeader !== undefined) headers['authorization'] = authHeader;
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('throws UnauthorizedException when Authorization header is missing', () => {
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when header does not start with Bearer', () => {
    expect(() => guard.canActivate(makeContext('Basic abc123'))).toThrow(UnauthorizedException);
  });

  it('decodes valid JWT and attaches user to request', () => {
    const payload = { sub: 'user-1', role: 'ADMIN', department: 'Eng', email: 'a@b.com', iat: 0, exp: 9999999 };
    const token = makeToken(payload);
    const req: Record<string, unknown> = { headers: { authorization: `Bearer ${token}` } };
    const ctx = { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;

    const result = guard.canActivate(ctx);
    expect(result).toBe(true);
    expect((req as any).user.sub).toBe('user-1');
    expect((req as any).user.role).toBe('ADMIN');
  });

  it('throws UnauthorizedException when token does not have 3 parts', () => {
    const ctx = makeContext('Bearer onlyone.parts');
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when payload segment is empty', () => {
    // Construct a token with empty middle segment: "header..sig"
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const ctx = makeContext(`Bearer ${header}..fakesig`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when payload base64 is invalid JSON', () => {
    // A base64url string that decodes to invalid JSON
    const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
    const badPayload = Buffer.from('not-json-{{{').toString('base64url');
    const ctx = makeContext(`Bearer ${header}.${badPayload}.fakesig`);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
