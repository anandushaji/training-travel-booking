# Design: Shared Domain Foundation

## Pattern Selection Log

| Pattern | Decision | Rationale |
|---|---|---|
| Database-per-service | Not applicable | SM-01 owns no database; it is a pure TypeScript library package. |
| CQRS | Not applicable | No read/write split at this layer; consuming services apply CQRS independently per their own spec. |
| Saga (Choreography) | Not applicable | No business transactions or event-driven workflows in this module. |
| Saga (Orchestration) | Not applicable | No orchestrator or step-management logic; that belongs to Booking Service (SM-07). |
| Outbox | Not applicable | No DB writes and no event publishing in this module; the Outbox pattern is deferred to each service spec. |
| Idempotency | Not applicable | No incoming requests or message consumption in this module. |
| Timeouts | Not applicable | No outbound synchronous calls. |
| Retries | Not applicable | No outbound calls; retry configuration belongs to consuming services. |
| Circuit Breaker | Not applicable | No synchronous calls to external services. |
| Bulkheads | Not applicable | No concurrent resource pools, thread pools, or connection pools managed here. |
| Cache-aside | Not applicable | No external data reads; all operations are purely in-memory computation. |
| Read-through | Not applicable | No external data sources. |
| Write-through | Not applicable | No write operations to any store. |
| Cache Invalidation | Not applicable | No cache to invalidate. |

**Applied patterns**: None

**Architectural assumptions**:
- `@travel/shared` is a zero-infrastructure library; its only npm dependencies are `uuid` (for `generateUuid`) and `kafkajs` + `@nestjs/common` (for `KafkaModule`).
- All base classes are abstract TypeScript; no NestJS decorators except inside `KafkaModule`.
- TypeScript `strict: true`, `exactOptionalPropertyTypes: true`, `noUncheckedIndexedAccess: true`.

---

## Architecture Overview

```
packages/shared/
├── src/
│   ├── base-classes/
│   │   ├── aggregate-root.base.ts    # AggregateRoot<TProps>
│   │   ├── entity.base.ts            # Entity<TProps>
│   │   └── value-object.base.ts      # ValueObject<TProps>
│   │
│   ├── domain-event/
│   │   └── domain-event.base.ts      # DomainEvent (abstract)
│   │
│   ├── value-objects/
│   │   ├── money.vo.ts               # Money
│   │   └── typed-id.vo.ts            # TypedId<T> + BookingId, TravelerId, …
│   │
│   ├── interfaces/
│   │   ├── repository.interface.ts   # IRepository<T, ID>
│   │   └── use-case.interface.ts     # IUseCase<TInput, TOutput>
│   │
│   ├── modules/
│   │   └── kafka/
│   │       ├── kafka.module.ts       # KafkaModule (NestJS DynamicModule)
│   │       └── kafka.constants.ts    # KAFKA_PRODUCER / KAFKA_CONSUMER tokens
│   │
│   ├── exceptions/
│   │   ├── domain.exception.ts
│   │   ├── validation.exception.ts
│   │   ├── not-found.exception.ts
│   │   ├── conflict.exception.ts
│   │   ├── insufficient-funds.exception.ts
│   │   └── currency-mismatch.exception.ts
│   │
│   ├── utils/
│   │   ├── uuid.util.ts              # generateUuid, isValidUuid
│   │   └── date.util.ts              # toISOString, fromISOString, isValidDate
│   │
│   └── index.ts                      # Barrel — re-exports everything above
│
├── test/
│   └── unit/
│       ├── base-classes/
│       │   ├── aggregate-root.base.spec.ts
│       │   ├── entity.base.spec.ts
│       │   └── value-object.base.spec.ts
│       ├── domain-event/
│       │   └── domain-event.base.spec.ts
│       ├── value-objects/
│       │   ├── money.vo.spec.ts
│       │   └── typed-id.vo.spec.ts
│       ├── exceptions/
│       │   └── exceptions.spec.ts
│       └── utils/
│           ├── uuid.util.spec.ts
│           └── date.util.spec.ts
│
├── package.json                       # name: "@travel/shared", main/exports config
├── tsconfig.json                      # extends ../../tsconfig.base.json
└── jest.config.ts
```

Consuming services import from the barrel:

```typescript
import {
  AggregateRoot, Entity, ValueObject,
  DomainEvent,
  Money, TypedId, BookingId, TravelerId,
  IRepository, IUseCase,
  KafkaModule,
  DomainException, ValidationException, NotFoundException,
  generateUuid, isValidUuid,
} from '@travel/shared';
```

`KafkaModule` is registered once per consuming service root module:

```typescript
// booking.module.ts
@Module({
  imports: [
    KafkaModule.register({
      clientId: configService.get('KAFKA_CLIENT_ID'),
      brokers: configService.get('KAFKA_BROKERS').split(','),
      groupId: configService.get('KAFKA_GROUP_ID'),
    }),
  ],
})
export class BookingModule {}
// Injects KAFKA_PRODUCER (connected Producer) and KAFKA_CONSUMER (connected Consumer)
```

---

## Data Model / Schema Changes

No database tables, TypeORM entities, or Mongoose schemas. All types are pure in-memory TypeScript objects.

---

## API / Interface Contracts

### `ValueObject<TProps>`

```typescript
export abstract class ValueObject<TProps extends Record<string, unknown>> {
  protected readonly props: Readonly<TProps>;

  constructor(props: TProps) {
    this.props = Object.freeze({ ...props });
  }

  equals(other: ValueObject<TProps>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }
}
```

### `Entity<TProps>`

```typescript
export abstract class Entity<TProps extends { id: string }> {
  protected readonly props: TProps;

  constructor(props: TProps) {
    this.props = props;
  }

  get id(): string {
    return this.props.id;
  }

  equals(other: Entity<TProps>): boolean {
    if (other === null || other === undefined) return false;
    if (other.constructor !== this.constructor) return false;
    return this.id === other.id;
  }
}
```

### `AggregateRoot<TProps>`

```typescript
export abstract class AggregateRoot<TProps extends { id: string }> extends Entity<TProps> {
  private _version = 0;
  private _uncommittedEvents: DomainEvent[] = [];

  get version(): number { return this._version; }

  protected apply(event: DomainEvent): void {
    this._uncommittedEvents.push(event);
    this._version += 1;
    const handler = `on${event.eventName}`;
    if (typeof (this as any)[handler] === 'function') {
      (this as any)[handler](event);
    }
  }

  getUncommittedEvents(): DomainEvent[] {
    return [...this._uncommittedEvents];
  }

  clearEvents(): void {
    this._uncommittedEvents = [];
  }

  reconstitute(props: TProps, version = 0): void {
    (this as any).props = props;
    this._version = version;
  }
}
```

### `DomainEvent`

```typescript
export abstract class DomainEvent {
  readonly eventId: string;
  readonly aggregateId: string;
  readonly occurredOn: Date;
  readonly correlationId: string;
  readonly causationId: string;

  constructor(aggregateId: string, correlationId?: string, causationId?: string) {
    this.aggregateId = aggregateId;
    this.occurredOn = new Date();
    this.eventId = generateUuid();
    this.correlationId = correlationId ?? generateUuid();
    this.causationId = causationId ?? this.eventId;
  }

  abstract get eventName(): string;
}
```

### `Currency` enum

```typescript
// Decided (Q2): TypeScript enum of known ISO 4217 codes.
// Adding a new currency requires updating @travel/shared.
export enum Currency {
  USD = 'USD',
  EUR = 'EUR',
  GBP = 'GBP',
  CAD = 'CAD',
  AUD = 'AUD',
  JPY = 'JPY',
  CHF = 'CHF',
  INR = 'INR',
  // Extend here when new currencies are required
}
```

### `Money`

```typescript
export class Money extends ValueObject<{ amount: number; currency: Currency }> {
  constructor(amount: number, currency: Currency);
  get amount(): number;
  get currency(): Currency;
  add(other: Money): Money;
  subtract(other: Money): Money;      // throws InsufficientFundsException if result < 0
  multiply(factor: number): Money;
  greaterThan(other: Money): boolean; // throws CurrencyMismatchException if currencies differ
  equals(other: Money): boolean;      // same amount AND same currency
}

  get amount(): number { return this.props.amount; }
  get currency(): Currency { return this.props.currency; }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    if (other.amount > this.amount)
      throw new InsufficientFundsException(this, other);
    return new Money(this.amount - other.amount, this.currency);
  }

  multiply(factor: number): Money {
    if (!Number.isFinite(factor) || factor < 0)
      throw new ValidationException('Multiply factor must be a non-negative finite number', 'INVALID_FACTOR');
    return new Money(Math.round(this.amount * factor * 100) / 100, this.currency);
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency)
      throw new CurrencyMismatchException(this.currency, other.currency);
  }
}
```

### `TypedId<T>`

```typescript
// Decided (Q1): .value is the canonical accessor for all domain code.
// .toString() is provided as a convenience alias for JSON serialization only.
export abstract class TypedId<T extends string> extends ValueObject<{ value: string }> {
  static generate<U extends TypedId<string>>(ctor: new(v: string) => U): U;
  static from<U extends TypedId<string>>(ctor: new(v: string) => U, value: string): U;
  /** Canonical domain accessor — use this in all business logic and repository mappings. */
  get value(): string;
  /** Serialization alias — equivalent to .value; use when passing to JSON.stringify or template strings. */
  toString(): string;
}

  static generate<U extends TypedId<string>>(
    this: new (v: string) => U
  ): U {
    return new this(generateUuid());
  }

  static from<U extends TypedId<string>>(
    this: new (v: string) => U,
    value: string
  ): U {
    return new this(value);
  }

  get value(): string { return this.props.value; }
  toString(): string { return this.props.value; }
}

// Concrete ID types
export class BookingId extends TypedId<'BookingId'> {}
export class TravelerId extends TypedId<'TravelerId'> {}
export class OfferId extends TypedId<'OfferId'> {}
export class PaymentId extends TypedId<'PaymentId'> {}
export class ReservationId extends TypedId<'ReservationId'> {}
export class PolicyId extends TypedId<'PolicyId'> {}
export class PolicyValidationId extends TypedId<'PolicyValidationId'> {}
export class ReceiptId extends TypedId<'ReceiptId'> {}
export class ExpenseId extends TypedId<'ExpenseId'> {}
```

### Interfaces

```typescript
// Decided (Q4): findAll included in base interface with optional filter.
export interface IRepository<T, ID> {
  save(entity: T): Promise<void>;
  findById(id: ID): Promise<T | null>;
  findAll(filter?: Partial<T>): Promise<T[]>;
  delete(id: ID): Promise<void>;
}

export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}
```

### `KafkaModule`

```typescript
// kafka.constants.ts
export const KAFKA_PRODUCER = 'KAFKA_PRODUCER';
export const KAFKA_CONSUMER = 'KAFKA_CONSUMER';

// kafka.module.ts
export interface KafkaModuleOptions {
  clientId: string;
  brokers: string[];
  groupId: string;
}

@Module({})
export class KafkaModule {
  static register(options: KafkaModuleOptions): DynamicModule {
    return {
      module: KafkaModule,
      providers: [
        {
          provide: KAFKA_PRODUCER,
          useFactory: async (): Promise<Producer> => {
            const kafka = new Kafka({ clientId: options.clientId, brokers: options.brokers });
            const producer = kafka.producer();
            await producer.connect();
            return producer;
          },
        },
        {
          provide: KAFKA_CONSUMER,
          useFactory: async (): Promise<Consumer> => {
            const kafka = new Kafka({ clientId: options.clientId, brokers: options.brokers });
            const consumer = kafka.consumer({ groupId: options.groupId });
            await consumer.connect();
            return consumer;
          },
        },
      ],
      exports: [KAFKA_PRODUCER, KAFKA_CONSUMER],
    };
  }
}
```

---

## Resilience Design

Not applicable — SM-01 makes no outbound calls and owns no retry/timeout configuration.

---

## Transaction & Consistency Design

Not applicable — SM-01 owns no database and performs no distributed transactions.

---

## Caching Design

Not applicable — SM-01 reads from no cache and writes to no cache.

---

## Error Handling

Custom exception hierarchy (all extend the native `Error`):

```
DomainException (base, code: string, statusCode: number, context?: Record<string, unknown>)
├── ValidationException         code: e.g. 'INVALID_MONEY_AMOUNT'   statusCode: 422
├── NotFoundException           code: 'NOT_FOUND'                    statusCode: 404
├── ConflictException           code: e.g. 'OPTIMISTIC_LOCK_CONFLICT' statusCode: 409
├── InsufficientFundsException  code: 'INSUFFICIENT_FUNDS'           statusCode: 422  (carries attempted and available Money)
└── CurrencyMismatchException   code: 'CURRENCY_MISMATCH'            statusCode: 422  (carries expected and actual currency strings)
```

Each exception exposes:
- `message: string` — human-readable description
- `code: string` — machine-readable error code for switch-case handling in controllers
- `statusCode: number` — HTTP status code carried by the exception itself (per PROJECT.md §9); consuming exception filters read this field directly instead of performing a subclass switch
- `context?: Record<string, unknown>` — structured diagnostic data (amounts, currencies, IDs)

Consuming services catch `DomainException` in their HTTP exception filters and use `exception.statusCode` to set the HTTP response status — no subclass switch required.

---

## Security Considerations

- No secrets, credentials, or tokens stored in this package.
- `KafkaModule` receives `clientId` and `brokers` at registration time via the consuming service's `ConfigService` — never hardcoded.
- `generateUuid()` uses the `uuid` npm package (RFC-4122 v4 with `crypto.randomUUID` fallback) — no custom entropy.
- `Money` construction validates that `amount` is non-negative and finite; `currency` must be a valid member of the `Currency` enum — prevents construction with unsupported currency codes.

---

## Observability

SM-01 itself emits no Prometheus metrics, Jaeger traces, or log lines (no runtime infrastructure). The `KafkaModule` factory logs two INFO-level messages via the NestJS `Logger` when the producer and consumer successfully connect; these appear in the consuming service's log stream.

**Guidance for consuming services** (enforced in each service's own spec, not here):
- After calling `aggregate.getUncommittedEvents()`, the infrastructure repository must increment a metric counter per event type (e.g., `domain_events_published_total{eventType="BookingConfirmed"}`).
- When saving an aggregate, the repository must log the `version` field at DEBUG level to surface optimistic-lock contention.

---

## Dependencies on Other Changes

None — SM-01 is Wave 1 with no prerequisites.

---

## Decision Log

| Question | Decision | Design Impact |
|----------|----------|---------------|
| `TypedId` access pattern | `.value` is canonical for domain code; `.toString()` is a serialization alias | Updated `TypedId` interface contract with JSDoc distinguishing the two accessors. |
| `Money` currency type | TypeScript `Currency` enum of known ISO 4217 codes | Added `Currency` enum definition; `Money` constructor and props type updated from `string` to `Currency`; Security Considerations updated to reference enum validation instead of regex. |
| `KafkaModule` scope | Explicit import per consuming module; no `@Global()` | No structural change — design already specified explicit import. Confirmed in `KafkaModule` section. |
| `IRepository` signature | Include `findAll(filter?: Partial<T>): Promise<T[]>` in base interface | `IRepository` interface updated to add `findAll`; T10 task updated with new AC and verification artifact. |
