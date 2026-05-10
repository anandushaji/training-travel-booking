"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValueObject = void 0;
class ValueObject {
    constructor(props) {
        this.props = Object.freeze({ ...props });
    }
    equals(other) {
        if (other === null || other === undefined)
            return false;
        if (other.constructor !== this.constructor)
            return false;
        return JSON.stringify(this.props) === JSON.stringify(other.props);
    }
}
exports.ValueObject = ValueObject;
//# sourceMappingURL=value-object.base.js.map