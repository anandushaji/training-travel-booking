"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrencyMismatchException = void 0;
const domain_exception_1 = require("./domain.exception");
class CurrencyMismatchException extends domain_exception_1.DomainException {
    constructor(expected, actual) {
        super(`Currency mismatch: expected ${expected}, got ${actual}`, 'CURRENCY_MISMATCH', 422, { expected, actual });
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.CurrencyMismatchException = CurrencyMismatchException;
//# sourceMappingURL=currency-mismatch.exception.js.map