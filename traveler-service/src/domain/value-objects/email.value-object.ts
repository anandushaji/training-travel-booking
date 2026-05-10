import { ValueObject } from '@travel/shared';
import { InvalidEmailException } from '../exceptions/invalid-email.exception';

interface EmailProps {
  value: string;
}

// RFC-5322 simplified regex for email validation
const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

export class Email extends ValueObject<EmailProps> {
  constructor(value: string) {
    if (!EMAIL_REGEX.test(value)) {
      throw new InvalidEmailException(value);
    }
    super({ value });
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }
}
