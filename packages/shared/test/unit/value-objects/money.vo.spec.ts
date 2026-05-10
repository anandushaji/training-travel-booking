import { Money } from '../../../src/value-objects/money.vo';
import { Currency } from '../../../src/value-objects/currency.enum';
import { ValidationException } from '../../../src/exceptions/validation.exception';
import { InsufficientFundsException } from '../../../src/exceptions/insufficient-funds.exception';
import { CurrencyMismatchException } from '../../../src/exceptions/currency-mismatch.exception';

describe('Money', () => {
  describe('construction', () => {
    it('creates a valid Money instance', () => {
      const m = new Money(100, Currency.USD);
      expect(m.amount).toBe(100);
      expect(m.currency).toBe(Currency.USD);
    });

    it('throws INVALID_MONEY_AMOUNT for negative amount', () => {
      expect(() => new Money(-1, Currency.USD)).toThrow(ValidationException);
      try {
        new Money(-1, Currency.USD);
      } catch (e) {
        expect((e as ValidationException).code).toBe('INVALID_MONEY_AMOUNT');
      }
    });

    it('throws INVALID_CURRENCY for value not in Currency enum', () => {
      expect(() => new Money(100, 'INVALID' as any)).toThrow(ValidationException);
      try {
        new Money(100, 'INVALID' as any);
      } catch (e) {
        expect((e as ValidationException).code).toBe('INVALID_CURRENCY');
      }
    });
  });

  describe('add', () => {
    it('returns sum and leaves originals unchanged', () => {
      const a = new Money(100, Currency.USD);
      const b = new Money(50, Currency.USD);
      const result = a.add(b);
      expect(result.amount).toBe(150);
      expect(result.currency).toBe(Currency.USD);
      expect(a.amount).toBe(100);
      expect(b.amount).toBe(50);
    });

    it('throws CurrencyMismatchException for different currencies', () => {
      expect(() =>
        new Money(100, Currency.USD).add(new Money(100, Currency.EUR)),
      ).toThrow(CurrencyMismatchException);
    });
  });

  describe('subtract', () => {
    it('returns difference for sufficient funds', () => {
      const result = new Money(100, Currency.USD).subtract(new Money(30, Currency.USD));
      expect(result.amount).toBe(70);
    });

    it('throws InsufficientFundsException', () => {
      expect(() =>
        new Money(30, Currency.USD).subtract(new Money(50, Currency.USD)),
      ).toThrow(InsufficientFundsException);
    });
  });

  describe('multiply', () => {
    it('rounds to 2 decimal places', () => {
      expect(new Money(10, Currency.USD).multiply(3.333).amount).toBe(33.33);
    });

    it('returns a new Money instance', () => {
      const m = new Money(10, Currency.USD);
      expect(m.multiply(2)).not.toBe(m);
    });
  });

  describe('greaterThan', () => {
    it('returns true when this > other', () => {
      expect(new Money(100, Currency.USD).greaterThan(new Money(50, Currency.USD))).toBe(true);
    });

    it('returns false when this <= other', () => {
      expect(new Money(50, Currency.USD).greaterThan(new Money(100, Currency.USD))).toBe(false);
    });
  });

  describe('equals', () => {
    it('true for same amount and currency', () => {
      expect(new Money(100, Currency.USD).equals(new Money(100, Currency.USD))).toBe(true);
    });

    it('false for same amount but different currency', () => {
      expect(new Money(50, Currency.USD).equals(new Money(50, Currency.EUR))).toBe(false);
    });
  });
});
