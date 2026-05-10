"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseId = exports.ApprovalId = exports.InvoiceId = exports.CarId = exports.FlightId = exports.HotelId = exports.PolicyId = exports.TravelerId = exports.BookingId = exports.TypedId = void 0;
const value_object_base_1 = require("../base-classes/value-object.base");
const uuid_util_1 = require("../utils/uuid.util");
const validation_exception_1 = require("../exceptions/validation.exception");
class TypedId extends value_object_base_1.ValueObject {
    constructor(value) {
        if (!(0, uuid_util_1.isValidUuid)(value)) {
            throw new validation_exception_1.ValidationException(`Invalid UUID: "${value}"`, 'INVALID_UUID', { value });
        }
        super({ value });
    }
    static generate() {
        return new this((0, uuid_util_1.generateUuid)());
    }
    static from(value) {
        return new this(value);
    }
    get value() {
        return this.props.value;
    }
    toString() {
        return this.props.value;
    }
}
exports.TypedId = TypedId;
class BookingId extends TypedId {
}
exports.BookingId = BookingId;
class TravelerId extends TypedId {
}
exports.TravelerId = TravelerId;
class PolicyId extends TypedId {
}
exports.PolicyId = PolicyId;
class HotelId extends TypedId {
}
exports.HotelId = HotelId;
class FlightId extends TypedId {
}
exports.FlightId = FlightId;
class CarId extends TypedId {
}
exports.CarId = CarId;
class InvoiceId extends TypedId {
}
exports.InvoiceId = InvoiceId;
class ApprovalId extends TypedId {
}
exports.ApprovalId = ApprovalId;
class ExpenseId extends TypedId {
}
exports.ExpenseId = ExpenseId;
//# sourceMappingURL=typed-id.vo.js.map