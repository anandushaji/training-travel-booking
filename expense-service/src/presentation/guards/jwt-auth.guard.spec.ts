import { JwtAuthGuard } from './jwt-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

function makeContext(authHeader?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        headers: authHeader ? { authorization: authHeader } : {},
      }),
    }),
  } as unknown as ExecutionContext;
}

function makeJwt(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.signature`;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(() => {
    guard = new JwtAuthGuard();
  });

  it('throws UnauthorizedException when Authorization header is missing', () => {
    expect(() => guard.canActivate(makeContext())).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when Authorization header does not start with Bearer', () => {
    expect(() => guard.canActivate(makeContext('Basic token'))).toThrow(UnauthorizedException);
  });

  it('throws UnauthorizedException when token is malformed (not 3 parts)', () => {
    expect(() => guard.canActivate(makeContext('Bearer notavalidjwt'))).toThrow(
      UnauthorizedException,
    );
  });

  it('throws UnauthorizedException when JWT second segment is empty', () => {
    // Three parts but middle is empty → payloadBase64 is '' (falsy)
    expect(() => guard.canActivate(makeContext('Bearer header..signature'))).toThrow(
      UnauthorizedException,
    );
  });
});
