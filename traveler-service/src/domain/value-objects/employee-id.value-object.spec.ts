import { EmployeeId } from './employee-id.value-object';
import { DomainException } from '@travel/shared';

describe('EmployeeId value object', () => {
  it('should create a valid EmployeeId', () => {
    const id = new EmployeeId('EMP-001');
    expect(id.value).toBe('EMP-001');
    expect(id.toString()).toBe('EMP-001');
  });

  it('should throw DomainException for empty string', () => {
    expect(() => new EmployeeId('')).toThrow(DomainException);
  });

  it('should throw DomainException for whitespace-only string', () => {
    expect(() => new EmployeeId('   ')).toThrow(DomainException);
  });

  it('should throw DomainException when value exceeds 50 characters', () => {
    expect(() => new EmployeeId('E'.repeat(51))).toThrow(DomainException);
  });

  it('should accept exactly 50 characters', () => {
    const id = new EmployeeId('E'.repeat(50));
    expect(id.value).toHaveLength(50);
  });
});
