import { SelfOrAdminGuard } from './self-or-admin.guard';
import { ExecutionContext } from '@nestjs/common';

const makeContext = (
  role: string,
  sub: string,
  paramId: string,
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => ({
        user: { sub, role },
        params: { id: paramId },
      }),
    }),
  }) as unknown as ExecutionContext;

describe('SelfOrAdminGuard', () => {
  const guard = new SelfOrAdminGuard();

  it('should allow ADMIN to access any travelerId', () => {
    expect(guard.canActivate(makeContext('ADMIN', 'admin-id', 'T2'))).toBe(true);
  });

  it('should allow MANAGER to access any travelerId', () => {
    expect(guard.canActivate(makeContext('MANAGER', 'mgr-id', 'T3'))).toBe(true);
  });

  it('should allow EMPLOYEE to access their own travelerId', () => {
    expect(guard.canActivate(makeContext('EMPLOYEE', 'T1', 'T1'))).toBe(true);
  });

  it('should deny EMPLOYEE accessing a different travelerId', () => {
    expect(guard.canActivate(makeContext('EMPLOYEE', 'T1', 'T2'))).toBe(false);
  });

  it('should deny when no user is attached', () => {
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: undefined, params: { id: 'T1' } }),
      }),
    } as unknown as ExecutionContext;
    expect(guard.canActivate(ctx)).toBe(false);
  });
});
