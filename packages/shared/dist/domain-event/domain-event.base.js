"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainEvent = void 0;
const uuid_util_1 = require("../utils/uuid.util");
class DomainEvent {
    constructor(props) {
        this.eventId = (0, uuid_util_1.generateUuid)();
        this.aggregateId = props.aggregateId;
        this.occurredOn = new Date();
        this.correlationId = props.correlationId ?? (0, uuid_util_1.generateUuid)();
        this.causationId = props.causationId ?? this.eventId;
    }
}
exports.DomainEvent = DomainEvent;
//# sourceMappingURL=domain-event.base.js.map