import { Entity } from './entity.base';
import { DomainEvent } from '../domain-event/domain-event.base';

export abstract class AggregateRoot<
  TProps extends { id: string },
> extends Entity<TProps> {
  private _uncommittedEvents: DomainEvent[] = [];
  private _version = 0;

  get version(): number {
    return this._version;
  }

  protected apply(event: DomainEvent): void {
    this._uncommittedEvents.push(event);
    this._version += 1;
    const handlerName = `on${event.eventName}` as keyof this;
    if (typeof this[handlerName] === 'function') {
      (this[handlerName] as (e: DomainEvent) => void).call(this, event);
    }
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  clearEvents(): void {
    this._uncommittedEvents = [];
  }

  reconstitute(props: TProps, version: number): void {
    // Bypass readonly — intentional pattern for reconstitution from persistence
    (this as any).props = props;
    this._version = version;
  }
}
