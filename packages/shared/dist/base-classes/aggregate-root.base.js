"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregateRoot = void 0;
const entity_base_1 = require("./entity.base");
class AggregateRoot extends entity_base_1.Entity {
    constructor() {
        super(...arguments);
        this._uncommittedEvents = [];
        this._version = 0;
    }
    get version() {
        return this._version;
    }
    apply(event) {
        this._uncommittedEvents.push(event);
        this._version += 1;
        const handlerName = `on${event.eventName}`;
        if (typeof this[handlerName] === 'function') {
            this[handlerName].call(this, event);
        }
    }
    getUncommittedEvents() {
        return [...this._uncommittedEvents];
    }
    clearEvents() {
        this._uncommittedEvents = [];
    }
    reconstitute(props, version) {
        // Bypass readonly — intentional pattern for reconstitution from persistence
        this.props = props;
        this._version = version;
    }
}
exports.AggregateRoot = AggregateRoot;
//# sourceMappingURL=aggregate-root.base.js.map