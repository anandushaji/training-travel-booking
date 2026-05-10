import { DomainException } from '@travel/shared';

export class DuplicateEmailException extends DomainException {
  constructor(email: string) {
    super(
      `Traveler with email "${email}" already exists`,
      'DuplicateEmail',
      409,
      { email },
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
