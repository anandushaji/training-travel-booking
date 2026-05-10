"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationException = void 0;
const domain_exception_1 = require("./domain.exception");
class ValidationException extends domain_exception_1.DomainException {
    constructor(message, code, context) {
        super(message, code, 422, context);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.ValidationException = ValidationException;
//# sourceMappingURL=validation.exception.js.map