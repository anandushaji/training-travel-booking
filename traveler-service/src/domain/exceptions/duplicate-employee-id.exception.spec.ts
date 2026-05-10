import { DuplicateEmployeeIdException } from './duplicate-employee-id.exception';
import { DomainException } from '@travel/shared';

describe('DuplicateEmployeeIdException', () => {
  it('should be instance of DomainException with statusCode 409', () => {
    const ex = new DuplicateEmployeeIdException('EMP-001');
    expect(ex).toBeInstanceOf(DomainException);
    expect(ex.statusCode).toBe(409);
    expect(ex.code).toBe('DuplicateEmployeeId');
    expect(ex.message).toContain('EMP-001');
  });
});
