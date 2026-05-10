import { DuplicateEmailException } from './duplicate-email.exception';
import { DomainException } from '@travel/shared';

describe('DuplicateEmailException', () => {
  it('should be instance of DomainException with statusCode 409', () => {
    const ex = new DuplicateEmailException('alice@corp.com');
    expect(ex).toBeInstanceOf(DomainException);
    expect(ex.statusCode).toBe(409);
    expect(ex.code).toBe('DuplicateEmail');
    expect(ex.message).toContain('alice@corp.com');
  });
});
