import { DomainException } from './domain.exception';

export class CurrencyMismatchException extends DomainException {
  constructor(expected: string, actual: string) {
    super(
      `Currency mismatch: expected ${expected}, got ${actual}`,
      'CURRENCY_MISMATCH',
      422,
      { expected, actual },
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
