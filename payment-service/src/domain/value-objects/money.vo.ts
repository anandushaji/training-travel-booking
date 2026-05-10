import { DomainException } from '@travel/shared';

export class Money {
  constructor(
    readonly amount: number,
    readonly currency: string,
  ) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new DomainException(
        `Invalid money amount: ${amount}. Must be greater than 0.`,
        'INVALID_MONEY_AMOUNT',
        422,
        { amount },
      );
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      throw new DomainException(
        `Invalid currency: "${currency}". Must be a 3-character ISO 4217 code.`,
        'INVALID_CURRENCY',
        422,
        { currency },
      );
    }
    // Round to 2 decimal places
    this.amount = Math.round(amount * 100) / 100;
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }
}
