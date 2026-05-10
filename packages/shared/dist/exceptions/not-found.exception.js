"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotFoundException = void 0;
const domain_exception_1 = require("./domain.exception");
class NotFoundException extends domain_exception_1.DomainException {
    constructor(message, context) {
        super(message, 'NOT_FOUND', 404, context);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.NotFoundException = NotFoundException;
//# sourceMappingURL=not-found.exception.js.map