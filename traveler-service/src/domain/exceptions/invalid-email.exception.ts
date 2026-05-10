import { DomainException } from '@travel/shared';

export class InvalidEmailException extends DomainException {
  constructor(email: string) {
    super(
      `Invalid email format: "${email}"`,
      'InvalidEmail',
      400,
      { email },
    );
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
