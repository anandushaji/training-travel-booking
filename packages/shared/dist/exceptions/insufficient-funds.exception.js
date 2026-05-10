"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsufficientFundsException = void 0;
const domain_exception_1 = require("./domain.exception");
class InsufficientFundsException extends domain_exception_1.DomainException {
    constructor(available, attempted) {
        super(`Insufficient funds: available ${available.amount} ${available.currency}, attempted ${attempted.amount} ${attempted.currency}`, 'INSUFFICIENT_FUNDS', 422, { available, attempted });
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.InsufficientFundsException = InsufficientFundsException;
//# sourceMappingURL=insufficient-funds.exception.js.map