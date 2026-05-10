import { DomainException } from '@travel/shared';
import { Last4 } from './last4.vo';

describe('Last4 value object', () => {
  it('should create Last4 with valid 4-digit string', () => {
    const last4 = new Last4('4242');
    expect(last4.value).toBe('4242');
  });

  it('should throw DomainException when Last4 is not exactly 4 digits', () => {
    expect(() => new Last4('123')).toThrow(DomainException);
    expect(() => new Last4('12345')).toThrow(
      expect.objectContaining({ code: 'INVALID_LAST4' }),
    );
    expect(() => new Last4('abcd')).toThrow(DomainException);
    expect(() => new Last4('')).toThrow(DomainException);
  });
});
