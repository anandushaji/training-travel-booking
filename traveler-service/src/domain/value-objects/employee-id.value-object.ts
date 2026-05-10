import { ValueObject } from '@travel/shared';
import { DomainException } from '@travel/shared';

interface EmployeeIdProps {
  value: string;
}

export class EmployeeId extends ValueObject<EmployeeIdProps> {
  constructor(value: string) {
    if (!value || value.trim().length === 0) {
      throw new DomainException(
        'EmployeeId must not be empty',
        'InvalidEmployeeId',
        400,
        { value },
      );
    }
    if (value.length > 50) {
      throw new DomainException(
        `EmployeeId must not exceed 50 characters (got ${value.length})`,
        'InvalidEmployeeId',
        400,
        { value, length: value.length },
      );
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
