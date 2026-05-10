import { ValueObject } from '../base-classes/value-object.base';
import { Currency } from './currency.enum';
import { ValidationException } from '../exceptions/validation.exception';
import { InsufficientFundsException } from '../exceptions/insufficient-funds.exception';
import { CurrencyMismatchException } from '../exceptions/currency-mismatch.exception';

interface MoneyProps {
  amount: number;
  currency: Currency;
}

export class Money extends ValueObject<MoneyProps> {
  private static readonly VALID_CURRENCIES = new Set<string>(
    Object.values(Currency),
  );

  constructor(amount: number, currency: Currency) {
    if (!Money.VALID_CURRENCIES.has(currency as string)) {
      throw new ValidationException(
        `Invalid currency: "${currency}"`,
        'INVALID_CURRENCY',
        { currency },
      );
    }
    if (!isFinite(amount) || amount < 0) {
      throw new ValidationException(
        `Invalid money amount: ${amount}`,
        'INVALID_MONEY_AMOUNT',
        { amount },
      );
    }
    super({ amount, currency });
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): Currency {
    return this.props.currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.amount > this.amount) {
      throw new InsufficientFundsException(
        { amount: this.amount, currency: this.currency },
        { amount: other.amount, currency: other.currency },
      );
    }
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    const result = Math.round(this.amount * factor * 100) / 100;
    return new Money(result, this.currency);
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchException(this.currency, other.currency);
    }
  }
}
