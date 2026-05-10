"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainException = void 0;
class DomainException extends Error {
    constructor(message, code, statusCode, context) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.context = context;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.DomainException = DomainException;
//# sourceMappingURL=domain.exception.js.map