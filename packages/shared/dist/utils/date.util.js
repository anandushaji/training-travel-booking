"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toISOString = toISOString;
exports.fromISOString = fromISOString;
exports.isValidDate = isValidDate;
const validation_exception_1 = require("../exceptions/validation.exception");
function toISOString(date) {
    return date.toISOString();
}
function fromISOString(s) {
    const d = new Date(s);
    if (isNaN(d.getTime())) {
        throw new validation_exception_1.ValidationException(`Invalid date string: "${s}"`, 'INVALID_DATE');
    }
    return d;
}
function isValidDate(d) {
    return d instanceof Date && !isNaN(d.getTime());
}
//# sourceMappingURL=date.util.js.map