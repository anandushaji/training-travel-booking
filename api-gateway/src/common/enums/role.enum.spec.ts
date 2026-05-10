import { Role } from './role.enum';

describe('Role enum', () => {
  it('should define EMPLOYEE, MANAGER, ADMIN roles', () => {
    expect(Role.EMPLOYEE).toBe('EMPLOYEE');
    expect(Role.MANAGER).toBe('MANAGER');
    expect(Role.ADMIN).toBe('ADMIN');
  });

  it('should contain exactly three roles', () => {
    const values = Object.values(Role);
    expect(values).toHaveLength(3);
    expect(values).toContain('EMPLOYEE');
    expect(values).toContain('MANAGER');
    expect(values).toContain('ADMIN');
  });
});
