import { DomainException } from './domain.exception';

export class InsufficientFundsException extends DomainException {
  constructor(
    available: { amount: number; currency: string },
    attempted: { amount: number; currency: string },
  ) {
    super(
      `Insufficient funds: available ${available.amount} ${available.currency}, attempted ${attempted.amount} ${attempted.currency}`,
      'INSUFFICIENT_FUNDS',
      422,
      { available, attempted },
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
