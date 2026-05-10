import { ValueObject } from '../base-classes/value-object.base';
import { generateUuid, isValidUuid } from '../utils/uuid.util';
import { ValidationException } from '../exceptions/validation.exception';

export abstract class TypedId<T extends string> extends ValueObject<{
  value: string;
}> {
  constructor(value: string) {
    if (!isValidUuid(value)) {
      throw new ValidationException(
        `Invalid UUID: "${value}"`,
        'INVALID_UUID',
        { value },
      );
    }
    super({ value });
  }

  static generate<U extends TypedId<string>>(
    this: new (value: string) => U,
  ): U {
    return new this(generateUuid());
  }

  static from<U extends TypedId<string>>(
    this: new (value: string) => U,
    value: string,
  ): U {
    return new this(value);
  }

  get value(): string {
    return this.props.value;
  }

  toString(): string {
    return this.props.value;
  }

  // phantom type brand — only used at compile time
  protected readonly _brand!: T;
}

export class BookingId extends TypedId<'BookingId'> {}
export class TravelerId extends TypedId<'TravelerId'> {}
export class PolicyId extends TypedId<'PolicyId'> {}
export class HotelId extends TypedId<'HotelId'> {}
export class FlightId extends TypedId<'FlightId'> {}
export class CarId extends TypedId<'CarId'> {}
export class InvoiceId extends TypedId<'InvoiceId'> {}
export class ApprovalId extends TypedId<'ApprovalId'> {}
export class ExpenseId extends TypedId<'ExpenseId'> {}
