import { Entity } from './entity.base';
import { DomainEvent } from '../domain-event/domain-event.base';
export declare abstract class AggregateRoot<TProps extends {
    id: string;
}> extends Entity<TProps> {
    private _uncommittedEvents;
    private _version;
    get version(): number;
    protected apply(event: DomainEvent): void;
    getUncommittedEvents(): DomainEvent[];
    clearEvents(): void;
    reconstitute(props: TProps, version: number): void;
}
//# sourceMappingURL=aggregate-root.base.d.ts.map