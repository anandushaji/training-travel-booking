"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUuid = generateUuid;
exports.isValidUuid = isValidUuid;
const uuid_1 = require("uuid");
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function generateUuid() {
    return (0, uuid_1.v4)();
}
function isValidUuid(value) {
    return UUID_V4_REGEX.test(value);
}
//# sourceMappingURL=uuid.util.js.map