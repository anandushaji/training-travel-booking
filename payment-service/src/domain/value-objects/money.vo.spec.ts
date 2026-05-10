import { DomainException } from '@travel/shared';
import { Money } from './money.vo';

describe('Money value object', () => {
  it('should create Money with valid amount and currency', () => {
    const money = new Money(350.00, 'USD');
    expect(money.amount).toBe(350.00);
    expect(money.currency).toBe('USD');
  });

  it('should throw DomainException when Money is created with zero or negative amount', () => {
    expect(() => new Money(0, 'USD')).toThrow(DomainException);
    expect(() => new Money(-10, 'USD')).toThrow(
      expect.objectContaining({ code: 'INVALID_MONEY_AMOUNT' }),
    );
  });

  it('should throw DomainException when Money is created with non-3-character currency', () => {
    expect(() => new Money(100, 'US')).toThrow(DomainException);
    expect(() => new Money(100, 'USDD')).toThrow(
      expect.objectContaining({ code: 'INVALID_CURRENCY' }),
    );
    expect(() => new Money(100, 'usd')).toThrow(DomainException);
  });

  it('should round amount to 2 decimal places', () => {
    const money = new Money(350.999, 'USD');
    expect(money.amount).toBe(351.00);
  });

  it('should return true for equals() with same amount and currency', () => {
    const a = new Money(100, 'USD');
    const b = new Money(100, 'USD');
    expect(a.equals(b)).toBe(true);
  });

  it('should return false for equals() with different currencies', () => {
    const a = new Money(100, 'USD');
    const b = new Money(100, 'EUR');
    expect(a.equals(b)).toBe(false);
  });
});
