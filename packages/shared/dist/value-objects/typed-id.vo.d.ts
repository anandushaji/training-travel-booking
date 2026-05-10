import { ValueObject } from '../base-classes/value-object.base';
export declare abstract class TypedId<T extends string> extends ValueObject<{
    value: string;
}> {
    constructor(value: string);
    static generate<U extends TypedId<string>>(this: new (value: string) => U): U;
    static from<U extends TypedId<string>>(this: new (value: string) => U, value: string): U;
    get value(): string;
    toString(): string;
    protected readonly _brand: T;
}
export declare class BookingId extends TypedId<'BookingId'> {
}
export declare class TravelerId extends TypedId<'TravelerId'> {
}
export declare class PolicyId extends TypedId<'PolicyId'> {
}
export declare class HotelId extends TypedId<'HotelId'> {
}
export declare class FlightId extends TypedId<'FlightId'> {
}
export declare class CarId extends TypedId<'CarId'> {
}
export declare class InvoiceId extends TypedId<'InvoiceId'> {
}
export declare class ApprovalId extends TypedId<'ApprovalId'> {
}
export declare class ExpenseId extends TypedId<'ExpenseId'> {
}
//# sourceMappingURL=typed-id.vo.d.ts.map