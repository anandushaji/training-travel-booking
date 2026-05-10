import { Email } from './email.value-object';
import { InvalidEmailException } from '../exceptions/invalid-email.exception';

describe('Email value object', () => {
  it('should create a valid email value object', () => {
    const email = new Email('alice@corp.com');
    expect(email.value).toBe('alice@corp.com');
  });

  it('should throw InvalidEmailException for invalid email format', () => {
    expect(() => new Email('not-an-email')).toThrow(InvalidEmailException);
  });

  it('should throw InvalidEmailException for email without domain', () => {
    expect(() => new Email('alice@')).toThrow(InvalidEmailException);
  });

  it('should throw InvalidEmailException for empty string', () => {
    expect(() => new Email('')).toThrow(InvalidEmailException);
  });

  it('should accept email with subdomains', () => {
    expect(() => new Email('alice@mail.corp.com')).not.toThrow();
  });
});
