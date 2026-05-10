import { DomainException } from '@travel/shared';

export class Last4 {
  constructor(readonly value: string) {
    if (!/^[0-9]{4}$/.test(value)) {
      throw new DomainException(
        `Invalid last4: "${value}". Must be exactly 4 digits.`,
        'INVALID_LAST4',
        422,
        { value },
      );
    }
  }
}
