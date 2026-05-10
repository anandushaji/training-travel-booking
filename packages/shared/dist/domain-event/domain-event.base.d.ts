export interface DomainEventProps {
    aggregateId: string;
    correlationId?: string;
    causationId?: string;
}
export declare abstract class DomainEvent {
    readonly eventId: string;
    readonly aggregateId: string;
    readonly occurredOn: Date;
    readonly correlationId: string;
    readonly causationId: string;
    abstract get eventName(): string;
    constructor(props: DomainEventProps);
}
//# sourceMappingURL=domain-event.base.d.ts.map