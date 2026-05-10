import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { Role } from '../../common/enums/role.enum';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

function makeContext(role: Role | null, requiredRoles?: Role[]): ExecutionContext {
  const user: JwtPayload | undefined =
    role !== null ? { sub: 'u1', email: 'a@b.com', role } : undefined;
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new RolesGuard(reflector);
  });

  it('should allow MANAGER role on a MANAGER-required route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    expect(guard.canActivate(makeContext(Role.MANAGER))).toBe(true);
  });

  it('should allow ADMIN role on a MANAGER-required route', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    expect(guard.canActivate(makeContext(Role.ADMIN))).toBe(true);
  });

  it('should deny EMPLOYEE role on a MANAGER-required route and return 403', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.MANAGER]);
    expect(guard.canActivate(makeContext(Role.EMPLOYEE))).toBe(false);
  });

  it('should allow any authenticated user when no roles metadata is set', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);
    expect(guard.canActivate(makeContext(Role.EMPLOYEE))).toBe(true);
  });
});
