import { DomainException } from '@travel/shared';

export class HrSystemUnavailableException extends DomainException {
  constructor() {
    super(
      'HR system is currently unavailable',
      'HrSystemUnavailable',
      503,
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
