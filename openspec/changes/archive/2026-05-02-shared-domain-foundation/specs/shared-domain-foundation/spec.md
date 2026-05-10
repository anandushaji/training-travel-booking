# Delta for shared-domain-foundation — Shared Domain Foundation

## ADDED Requirements

---

### Requirement: ValueObject Structural Equality

The system SHALL treat two `ValueObject` instances as equal if and only if they are the same concrete class **and** all their properties are deeply equal (value semantics), regardless of object identity.

#### Scenario: Equal value objects
- GIVEN two `Money` instances created with `amount=100` and `currency="USD"`
- WHEN `a.equals(b)` is called
- THEN the result is `true`

#### Scenario: Unequal value objects — different amount
- GIVEN `Money(100, "USD")` and `Money(200, "USD")`
- WHEN `a.equals(b)` is called
- THEN the result is `false`

#### Scenario: Unequal value objects — different type
- GIVEN a `Money` and a `TypedId` both wrapping structurally identical props
- WHEN `a.equals(b)` is called
- THEN the result is `false`

#### Scenario: ValueObject props are immutable
- GIVEN a constructed `Money` instance
- WHEN code attempts to mutate `money.props.amount` directly at runtime
- THEN the object remains unchanged (props are frozen)

---

### Requirement: Entity Identity Equality

The system SHALL treat two `Entity` instances as equal if and only if they are the same concrete class **and** their `id` properties are identical strings, regardless of any other property values.

#### Scenario: Same id equals
- GIVEN two `Entity` subclass instances with `id = "abc-123"`
- WHEN `a.equals(b)` is called
- THEN the result is `true`

#### Scenario: Different id not equal
- GIVEN two `Entity` subclass instances with different `id` values
- WHEN `a.equals(b)` is called
- THEN the result is `false`

---

### Requirement: AggregateRoot Domain Event Management

The system SHALL buffer domain events applied via `apply(event)` in an uncommitted events list, expose them via `getUncommittedEvents()`, and clear the buffer upon `clearEvents()` — enabling infrastructure repositories to publish events transactionally after a successful database save.

#### Scenario: Events collected after apply
- GIVEN a new `AggregateRoot` subclass instance
- WHEN `apply(eventA)` and `apply(eventB)` are called
- THEN `getUncommittedEvents()` returns `[eventA, eventB]` in order

#### Scenario: Events cleared after commit
- GIVEN an aggregate with two uncommitted events
- WHEN `clearEvents()` is called
- THEN `getUncommittedEvents()` returns an empty array

#### Scenario: Events not exposed by reference
- GIVEN an aggregate with one uncommitted event
- WHEN `getUncommittedEvents()` is called and the returned array is mutated externally
- THEN the aggregate's internal buffer is not affected

---

### Requirement: AggregateRoot Event Handler Dispatch

The system SHALL automatically invoke a method named `on<EventName>` on the aggregate root whenever `apply(event)` is called, if such a method exists, so that state transitions are co-located with event definition.

#### Scenario: Handler invoked on apply
- GIVEN an `AggregateRoot` subclass that defines `onBookingCreated(event)`
- WHEN `apply(new BookingCreated(...))` is called
- THEN `onBookingCreated` is invoked with the event as its argument

#### Scenario: No error when handler absent
- GIVEN an `AggregateRoot` subclass that does NOT define `onSomeEvent`
- WHEN `apply(new SomeEvent(...))` is called
- THEN no exception is thrown, and the event is still buffered

---

### Requirement: AggregateRoot Optimistic Locking Version

The system SHALL maintain a monotonically incrementing `version` counter on every `AggregateRoot` — incremented by one on each `apply()` call — to enable infrastructure repositories to detect concurrent modification (optimistic lock conflict).

#### Scenario: Version starts at zero
- GIVEN a freshly constructed `AggregateRoot` subclass instance
- WHEN `version` is read before any `apply()` call
- THEN the value is `0`

#### Scenario: Version increments on each apply
- GIVEN an aggregate at version 0
- WHEN `apply(event1)` and `apply(event2)` are called
- THEN `version` equals `2`

#### Scenario: Reconstitute sets version from persistence
- GIVEN a persisted aggregate with `version = 5`
- WHEN `reconstitute(props, 5)` is called
- THEN `version` equals `5` and `getUncommittedEvents()` is empty

---

### Requirement: DomainEvent Required Fields

The system SHALL ensure every `DomainEvent` instance carries a unique `eventId` (UUID v4), the `aggregateId` it originated from, an `occurredOn` timestamp, a `correlationId` for distributed tracing, and a `causationId` for causal chaining — populated automatically at construction if not supplied by the caller.

#### Scenario: Auto-generated fields on construction
- GIVEN a concrete `DomainEvent` subclass constructed with only `aggregateId`
- WHEN `eventId`, `correlationId`, and `causationId` are read
- THEN all three are valid RFC-4122 v4 UUIDs
- AND `causationId` equals `eventId` (self-causation default)
- AND `occurredOn` is a valid `Date` within 1 second of construction

#### Scenario: Correlation ID propagated from caller
- GIVEN a parent correlation ID `"corr-123"`
- WHEN a `DomainEvent` is constructed with `correlationId = "corr-123"`
- THEN `event.correlationId` equals `"corr-123"`

#### Scenario: eventName reflects concrete type
- GIVEN a concrete event class `BookingCreated` with `get eventName() { return 'BookingCreated'; }`
- WHEN `event.eventName` is accessed
- THEN the value is `"BookingCreated"`

---

### Requirement: Money Arithmetic Invariants

The system SHALL enforce monetary arithmetic correctness: `add` and `subtract` return new immutable `Money` instances; `subtract` throws `InsufficientFundsException` if the result would be negative; `multiply` rounds to 2 decimal places; all operations throw `CurrencyMismatchException` when currencies differ.

#### Scenario: Add two same-currency amounts
- GIVEN `Money(100, "USD")` and `Money(50, "USD")`
- WHEN `add` is called
- THEN the result is `Money(150, "USD")`
- AND the original instances are unchanged

#### Scenario: Subtract — result is zero
- GIVEN `Money(50, "USD")` and `Money(50, "USD")`
- WHEN `subtract` is called
- THEN the result is `Money(0, "USD")`

#### Scenario: Subtract — insufficient funds
- GIVEN `Money(30, "USD")` and `Money(50, "USD")`
- WHEN `subtract` is called
- THEN `InsufficientFundsException` is thrown

#### Scenario: Currency mismatch on add
- GIVEN `Money(100, "USD")` and `Money(100, "EUR")`
- WHEN `add` is called
- THEN `CurrencyMismatchException` is thrown

#### Scenario: Multiply rounds to 2 decimal places
- GIVEN `Money(10, "USD")` and factor `3.333`
- WHEN `multiply` is called
- THEN the result amount equals `33.33`

#### Scenario: Multiply with negative factor throws ValidationException
- GIVEN `Money(10, "USD")` and a negative factor `-1`
- WHEN `multiply` is called
- THEN `ValidationException` is thrown with code `INVALID_FACTOR`

#### Scenario: Multiply with non-finite factor throws ValidationException
- GIVEN `Money(10, "USD")` and factor `Infinity` (or `NaN`)
- WHEN `multiply` is called
- THEN `ValidationException` is thrown with code `INVALID_FACTOR`

#### Scenario: Construction with invalid currency
- GIVEN an attempt to construct `Money(100, "INVALID")`
- WHEN the constructor runs
- THEN `ValidationException` is thrown with code `INVALID_CURRENCY`

#### Scenario: Construction with valid-ISO-but-not-in-enum currency code
- GIVEN an attempt to construct `Money(100, "CNY" as any)` where `"CNY"` is a valid ISO 4217 code but is absent from the `Currency` enum
- WHEN the constructor runs
- THEN `ValidationException` is thrown with code `INVALID_CURRENCY`

#### Scenario: Construction with negative amount
- GIVEN an attempt to construct `Money(-1, "USD")`
- WHEN the constructor runs
- THEN `ValidationException` is thrown with code `INVALID_MONEY_AMOUNT`

---

### Requirement: TypedId Type-Safe UUID Wrapping

The system SHALL provide a `TypedId<T>` base class whose concrete subclasses (`BookingId`, `TravelerId`, etc.) wrap RFC-4122 v4 UUIDs, validate the UUID at construction, expose the raw value via `.value`, and render via `.toString()` — preventing cross-domain ID confusion at compile time.

#### Scenario: Generate produces a valid UUID
- GIVEN `BookingId.generate()` is called
- WHEN the returned `BookingId.value` is inspected
- THEN the value is a valid RFC-4122 v4 UUID string

#### Scenario: From wraps a valid UUID
- GIVEN a valid UUID string `"550e8400-e29b-41d4-a716-446655440000"`
- WHEN `BookingId.from("550e8400-e29b-41d4-a716-446655440000")` is called
- THEN the returned instance `.value` equals the input string

#### Scenario: From throws on invalid UUID
- GIVEN an invalid string `"not-a-uuid"`
- WHEN `BookingId.from("not-a-uuid")` is called
- THEN `ValidationException` is thrown with code `INVALID_UUID`

#### Scenario: From throws on empty string
- GIVEN an empty string `""`
- WHEN `BookingId.from("")` is called
- THEN `ValidationException` is thrown with code `INVALID_UUID`

#### Scenario: Equals by value
- GIVEN two `BookingId` instances wrapping the same UUID string
- WHEN `a.equals(b)` is called
- THEN the result is `true`

#### Scenario: Different concrete ID types not equal despite same UUID
- GIVEN `BookingId.from(uuid)` and `TravelerId.from(uuid)` with the same UUID
- WHEN `bookingId.equals(travelerId)` is called
- THEN the result is `false`

---

### Requirement: IRepository and IUseCase Interface Contracts

The system SHALL define `IRepository<T, ID>` with `save`, `findById`, and `delete` methods, and `IUseCase<TInput, TOutput>` with an `execute` method, so that every service's domain layer depends only on these interfaces — not on concrete infrastructure implementations — enabling mock-based unit testing.

#### Scenario: Repository interface satisfied by mock
- GIVEN a Jest mock that implements `IRepository<Booking, BookingId>`
- WHEN `findById` is called with a `BookingId`
- THEN TypeScript compiles without error and the mock returns `null`

#### Scenario: UseCase interface satisfied by implementation
- GIVEN a class implementing `IUseCase<CreateBookingCommand, BookingDto>`
- WHEN `execute` is called
- THEN TypeScript enforces the return type as `Promise<BookingDto>`

---

### Requirement: KafkaModule Connected Injection

The system SHALL provide a NestJS `KafkaModule.register(options)` dynamic module that creates a `kafkajs` `Producer` and `Consumer`, calls `.connect()` on each during module initialization, and exports them under the `KAFKA_PRODUCER` and `KAFKA_CONSUMER` injection tokens — so every consuming service can `@Inject(KAFKA_PRODUCER)` without repeating the factory boilerplate.

#### Scenario: Producer and consumer injected successfully
- GIVEN `KafkaModule.register({ clientId, brokers, groupId })` is imported in a NestJS test module with a mock Kafka factory
- WHEN the module is compiled and `KAFKA_PRODUCER` is resolved
- THEN the injected value is the connected mock Producer instance

#### Scenario: Register options not mutated
- GIVEN a `KafkaModuleOptions` object passed to `register`
- WHEN `register` returns the `DynamicModule`
- THEN the original options object is not mutated

#### Scenario: Producer connect failure propagates
- GIVEN `KafkaModule.register(options)` is imported and `producer.connect()` is configured to throw an `Error`
- WHEN the NestJS module initialises
- THEN the error is not swallowed; it propagates out of the factory causing NestJS module compilation to fail

#### Scenario: Consumer connect failure propagates
- GIVEN `KafkaModule.register(options)` is imported and `consumer.connect()` is configured to throw an `Error`
- WHEN the NestJS module initialises
- THEN the error is not swallowed; it propagates out of the factory causing NestJS module compilation to fail

---

### Requirement: Shared Exception Hierarchy

The system SHALL provide a `DomainException` base class (extending `Error`) and typed subclasses — `ValidationException`, `NotFoundException`, `ConflictException`, `InsufficientFundsException`, `CurrencyMismatchException` — each carrying a machine-readable `code: string` and optional `context: Record<string, unknown>`, so consuming service HTTP filters can map them to HTTP status codes deterministically.

#### Scenario: Exception carries code and message
- GIVEN `new ValidationException("Currency must be 3 letters", "INVALID_CURRENCY")`
- WHEN `.code` and `.message` are read
- THEN `code` equals `"INVALID_CURRENCY"` and `message` equals `"Currency must be 3 letters"`

#### Scenario: Exception is instanceof DomainException
- GIVEN a `ValidationException` instance
- WHEN `instanceof DomainException` is tested
- THEN the result is `true`

---

### Requirement: UUID and Date Utilities

The system SHALL provide `generateUuid(): string` returning a valid RFC-4122 v4 UUID, `isValidUuid(value: string): boolean` validating the format, `toISOString(date: Date): string` returning ISO 8601, `fromISOString(s: string): Date` parsing ISO 8601, and `isValidDate(d: unknown): boolean` — all pure functions with no side effects, importable by any layer.

#### Scenario: generateUuid produces unique values
- GIVEN two calls to `generateUuid()`
- WHEN the results are compared
- THEN they are different strings
- AND `isValidUuid` returns `true` for each

#### Scenario: isValidUuid rejects malformed input
- GIVEN `"not-a-uuid"` and `""` as inputs
- WHEN `isValidUuid` is called for each
- THEN both return `false`

#### Scenario: Round-trip date serialization
- GIVEN `new Date("2026-05-02T00:00:00.000Z")`
- WHEN `toISOString` is called and the result passed to `fromISOString`
- THEN the resulting `Date` has the same `getTime()` as the original

---

### Requirement: Barrel Export Package Integrity

The system SHALL compile `@travel/shared` as a valid npm workspace package with a complete barrel export so that all public symbols are accessible from a single `import ... from '@travel/shared'` statement — with no missing exports, no circular dependencies, and TypeScript declaration files (`.d.ts`) emitted.

#### Scenario: All public symbols importable from barrel
- GIVEN a TypeScript file that imports every expected symbol from `'@travel/shared'`
- WHEN `tsc --noEmit` is run against that file
- THEN compilation succeeds with zero errors

#### Scenario: Package builds without circular dependency warnings
- GIVEN `npm run build` is executed in `packages/shared/`
- WHEN the build completes
- THEN exit code is `0` and no circular-dependency warnings are emitted
