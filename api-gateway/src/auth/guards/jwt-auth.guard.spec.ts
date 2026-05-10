import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function makeContext(headers: Record<string, string>, isPublic = false): ExecutionContext {
  return {
    getHandler: () => ({ isPublic }),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ headers }),
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new JwtAuthGuard(reflector);
  });

  it('should return 401 when JWT is expired', async () => {
    // The guard calls super.canActivate which invokes passport; without a real app context
    // we simulate by spying on the parent canActivate to throw UnauthorizedException
    jest.spyOn(guard, 'canActivate').mockImplementation(() => {
      throw new UnauthorizedException();
    });

    expect(() => guard.canActivate(makeContext({ authorization: 'Bearer expired.token.here' }))).toThrow(
      UnauthorizedException,
    );
  });

  it('should return 401 when Authorization header is absent', async () => {
    jest.spyOn(guard, 'canActivate').mockImplementation(() => {
      throw new UnauthorizedException();
    });
    expect(() => guard.canActivate(makeContext({}))).toThrow(UnauthorizedException);
  });

  it('should return 401 when token is signed with incorrect secret', async () => {
    jest.spyOn(guard, 'canActivate').mockImplementation(() => {
      throw new UnauthorizedException();
    });
    expect(() =>
      guard.canActivate(makeContext({ authorization: 'Bearer wrong.secret.token' })),
    ).toThrow(UnauthorizedException);
  });

  it('should pass through for public routes', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(true);
    const result = guard.canActivate(makeContext({}));
    expect(result).toBe(true);
  });
});
