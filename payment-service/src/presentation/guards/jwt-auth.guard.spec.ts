import { JwtAuthGuard } from './jwt-auth.guard';
import { UnauthorizedException } from '@nestjs/common';

function makeContext(headers: Record<string, string | undefined>): any {
  const request: any = { headers };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    _request: request,
  };
}

function makeJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('should throw UnauthorizedException when Authorization header is missing', () => {
    const ctx = makeContext({});
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when header does not start with "Bearer "', () => {
    const ctx = makeContext({ authorization: 'Basic abc123' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException for a JWT that is not 3 parts', () => {
    const ctx = makeContext({ authorization: 'Bearer onlytwoparts.here' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it('should decode a valid JWT, set request.user, and return true', () => {
    const payload = {
      sub: '00000000-0000-4000-8000-000000000001',
      email: 'alice@corp.com',
      role: 'Employee',
      iat: 1000000,
      exp: 9999999,
    };
    const token = makeJwt(payload);
    const ctx = makeContext({ authorization: `Bearer ${token}` });

    const result = guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(ctx._request.user).toMatchObject({ sub: payload.sub, role: 'Employee' });
  });

  it('should throw UnauthorizedException for a JWT with malformed base64url payload', () => {
    // Construct a token whose middle segment is not valid base64url JSON
    const ctx = makeContext({ authorization: 'Bearer header.!!!invalid!!!.sig' });
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });
});
