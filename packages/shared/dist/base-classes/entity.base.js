"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Entity = void 0;
class Entity {
    constructor(props) {
        this.props = props;
    }
    get id() {
        return this.props.id;
    }
    equals(other) {
        if (other === null || other === undefined)
            return false;
        if (other.constructor !== this.constructor)
            return false;
        return this.id === other.id;
    }
}
exports.Entity = Entity;
//# sourceMappingURL=entity.base.js.map