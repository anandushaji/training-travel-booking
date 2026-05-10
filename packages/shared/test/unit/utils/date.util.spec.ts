import { toISOString, fromISOString, isValidDate } from '../../../src/utils/date.util';
import { ValidationException } from '../../../src/exceptions/validation.exception';

describe('date round-trip', () => {
  it('toISOString(fromISOString(s)) equals original string', () => {
    const s = '2024-06-15T12:00:00.000Z';
    expect(toISOString(fromISOString(s))).toBe(s);
  });
});

describe('fromISOString', () => {
  it('throws INVALID_DATE for unparseable input', () => {
    expect(() => fromISOString('not-a-date')).toThrow(ValidationException);
    try {
      fromISOString('not-a-date');
    } catch (e) {
      expect((e as ValidationException).code).toBe('INVALID_DATE');
    }
  });

  it('returns a valid Date for a well-formed ISO string', () => {
    const d = fromISOString('2024-01-01T00:00:00.000Z');
    expect(isValidDate(d)).toBe(true);
  });
});

describe('isValidDate', () => {
  it('returns false for invalid inputs', () => {
    expect(isValidDate(null)).toBe(false);
    expect(isValidDate(undefined)).toBe(false);
    expect(isValidDate(NaN)).toBe(false);
    expect(isValidDate(42)).toBe(false);
    expect(isValidDate('not-a-date')).toBe(false);
    expect(isValidDate(new Date('invalid'))).toBe(false);
  });

  it('returns true for a valid Date instance', () => {
    expect(isValidDate(new Date())).toBe(true);
    expect(isValidDate(new Date('2024-06-15'))).toBe(true);
  });
});
