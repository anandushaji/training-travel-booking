# Tasks: Shared Domain Foundation

## Implementation Checklist

- [x] T01: Create workspace package scaffold (`packages/shared/`)
- [x] T02: Implement `ValueObject<T>` base class
- [x] T03: Implement `Entity<T>` base class
- [x] T06: Implement shared exception hierarchy
- [x] T07: Implement `uuid.util.ts` utility
- [x] T07b: Implement `date.util.ts` utility
- [x] T04: Implement `DomainEvent` abstract base class
- [x] T05: Implement `AggregateRoot<T>` base class (event management + version)
- [x] T08: Implement `Money` value object
- [x] T09: Implement `TypedId<T>` base class and concrete ID types
- [x] T10: Implement `IRepository<T, ID>` (with `findAll`) and `IUseCase<TInput, TOutput>` interfaces
- [x] T11: Implement `KafkaModule` dynamic NestJS module
- [x] T12: Wire barrel export (`index.ts`) and verify package build
- [x] T13: Observability — KafkaModule connection logging

---

## Task Details

> Every task below follows the AC Verification Policy
> (`docs/workflow/acceptance-criteria.md`): every Acceptance Criterion
> is paired with a named, automatically executable verification artifact
> with a "Must fail if" note describing the THEN mutation it would detect.

---

### T01: Create Workspace Package Scaffold

**Files affected**:
- `package.json` ← add `"workspaces": ["packages/*", "services/*", "api-gateway"]`
- `tsconfig.base.json` ← root strict TypeScript config
- `packages/shared/package.json`
- `packages/shared/tsconfig.json`
- `packages/shared/jest.config.ts`
- `packages/shared/src/index.ts` ← empty barrel (populated by later tasks)

**Description**: Initialise the npm workspace at the repository root so that `packages/shared` is recognised as `@travel/shared`. Create `packages/shared/package.json` with:

```json
{
  "name": "@travel/shared",
  "version": "0.1.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc --project tsconfig.json",
    "test": "jest",
    "lint": "madge --circular src"
  },
  "dependencies": {
    "uuid": "^9.0.0"
  },
  "peerDependencies": {
    "@nestjs/common": "^10.0.0",
    "kafkajs": "^2.0.0"
  },
  "devDependencies": {
    "@nestjs/common": "^10.0.0",
    "@nestjs/testing": "^10.0.0",
    "@types/jest": "^29.0.0",
    "@types/node": "^20.0.0",
    "@types/uuid": "^9.0.0",
    "jest": "^29.0.0",
    "kafkajs": "^2.0.0",
    "madge": "^6.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

Create `tsconfig.json` extending `../../tsconfig.base.json` with `strict: true`. Wire Jest (`jest.config.ts`) with `ts-jest` preset, `testMatch: ["<rootDir>/test/**/*.spec.ts"]`, `collectCoverage: true`, `coverageThreshold: { global: { branches: 90 } }`.

> **Test directory convention**: Tests for `@travel/shared` are placed in `packages/shared/test/unit/` (mirroring the `src/` tree) rather than co-located in `src/`. This is a documented exception to the PROJECT.md §9 "co-located `*.spec.ts`" rule, which applies to NestJS services. A library package with no runtime context benefits from a clean separation between source and test trees. All service specs (SM-02 onwards) follow the co-located convention.

**Acceptance criteria**:
- AC-01: Running `npm install` from the repository root resolves `@travel/shared` as a workspace package (no network fetch required).
- AC-02: Running `npm run build` inside `packages/shared/` exits with code `0` and emits `dist/index.js` and `dist/index.d.ts`.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/package-scaffold.spec.ts::should resolve @travel/shared from workspace` (layer: integration — uses `require.resolve('@travel/shared')` from a sibling service directory)
  - Must fail if: `packages/shared` is not listed in root `package.json` `"workspaces"`, causing `require.resolve` to throw `MODULE_NOT_FOUND`.
- AC-02 → CI step `packages/shared/test/unit/build-output.spec.ts::dist/index.js and dist/index.d.ts exist after build` (layer: integration — checks `fs.existsSync` on output files after `tsc` runs in build step)
  - Must fail if: `tsconfig.json` `"outDir"` is misconfigured or `"declaration": true` is absent.

---

### T02: Implement `ValueObject<T>` Base Class

**Files affected**:
- `packages/shared/src/base-classes/value-object.base.ts`
- `packages/shared/test/unit/base-classes/value-object.base.spec.ts`

**Description**: Implement `abstract class ValueObject<TProps extends Record<string, unknown>>` with a frozen `props` object (via `Object.freeze`) assigned in the constructor, and an `equals(other)` method that returns `true` only when the other instance is the same concrete class (checked via `this.constructor === other.constructor`) and JSON-serialised props are identical.

**Acceptance criteria**:
- AC-01: Two instances of the same `ValueObject` subclass with identical props are `equals`.
- AC-02: Two instances with different props are not `equals`.
- AC-03: Two instances of different `ValueObject` subclasses with identical props are not `equals`.
- AC-04: `props` object is frozen; attempting to assign to a property at runtime does not change the value.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/base-classes/value-object.base.spec.ts::ValueObject > equals > returns true for same subclass and same props` (layer: unit)
  - spec scenario: "ValueObject Structural Equality > Equal value objects"
  - Must fail if: `equals` always returns `false` or does not compare props.
- AC-02 → `packages/shared/test/unit/base-classes/value-object.base.spec.ts::ValueObject > equals > returns false for different props` (layer: unit)
  - spec scenario: "ValueObject Structural Equality > Unequal value objects — different amount"
  - Must fail if: `equals` compares by reference instead of by value.
- AC-03 → `packages/shared/test/unit/base-classes/value-object.base.spec.ts::ValueObject > equals > returns false for different subclass with same props` (layer: unit)
  - spec scenario: "ValueObject Structural Equality > Unequal value objects — different type"
  - Must fail if: constructor check is removed from `equals`.
- AC-04 → `packages/shared/test/unit/base-classes/value-object.base.spec.ts::ValueObject > props > are frozen` (layer: unit)
  - spec scenario: "ValueObject Structural Equality > ValueObject props are immutable"
  - Must fail if: `Object.freeze` is not applied to props in the constructor.

---

### T03: Implement `Entity<T>` Base Class

**Files affected**:
- `packages/shared/src/base-classes/entity.base.ts`
- `packages/shared/test/unit/base-classes/entity.base.spec.ts`

**Description**: Implement `abstract class Entity<TProps extends { id: string }>` with `protected readonly props: TProps`, a concrete `get id(): string` getter, and `equals(other)` that returns `true` only when the other instance is the same concrete class **and** both `id` strings are identical.

**Acceptance criteria**:
- AC-01: Two `Entity` subclass instances with the same `id` are `equals`.
- AC-02: Two `Entity` subclass instances with different `id` values are not `equals`.
- AC-03: `entity.id` returns the value from `props.id`.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/base-classes/entity.base.spec.ts::Entity > equals > returns true when same concrete class and same id` (layer: unit)
  - spec scenario: "Entity Identity Equality > Same id equals"
  - Must fail if: `equals` compares props deeply instead of by `id` only.
- AC-02 → `packages/shared/test/unit/base-classes/entity.base.spec.ts::Entity > equals > returns false when ids differ` (layer: unit)
  - spec scenario: "Entity Identity Equality > Different id not equal"
  - Must fail if: `equals` returns `true` unconditionally.
- AC-03 → `packages/shared/test/unit/base-classes/entity.base.spec.ts::Entity > id > returns props.id value` (layer: unit)
  - Must fail if: `id` getter returns `undefined` or a different field.

---

### T06: Implement Shared Exception Hierarchy

**Files affected**:
- `packages/shared/src/exceptions/domain.exception.ts`
- `packages/shared/src/exceptions/validation.exception.ts`
- `packages/shared/src/exceptions/not-found.exception.ts`
- `packages/shared/src/exceptions/conflict.exception.ts`
- `packages/shared/src/exceptions/insufficient-funds.exception.ts`
- `packages/shared/src/exceptions/currency-mismatch.exception.ts`
- `packages/shared/test/unit/exceptions/exceptions.spec.ts`

**Description**: Implement `DomainException extends Error` with `readonly code: string`, `readonly statusCode: number`, and optional `readonly context?: Record<string, unknown>`. Each subclass calls `super(message)`, assigns `this.code`, and assigns its fixed `this.statusCode`: `ValidationException` → 422, `NotFoundException` → 404, `ConflictException` → 409, `InsufficientFundsException` → 422, `CurrencyMismatchException` → 422. `InsufficientFundsException` and `CurrencyMismatchException` extend `DomainException` directly and populate `context` with relevant monetary values. Ensure `Object.setPrototypeOf(this, new.target.prototype)` is called for correct `instanceof` behaviour in TypeScript when targeting ES5/CommonJS.

**Acceptance criteria**:
- AC-01: Each exception class is `instanceof DomainException`.
- AC-02: `exception.code` returns the value supplied at construction.
- AC-03: `exception.message` returns the supplied message string.
- AC-04: `InsufficientFundsException` and `CurrencyMismatchException` carry meaningful `context` objects.
- AC-05: Each subclass exposes the correct fixed `statusCode` (`ValidationException` → 422, `NotFoundException` → 404, `ConflictException` → 409, `InsufficientFundsException` → 422, `CurrencyMismatchException` → 422).

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/exceptions/exceptions.spec.ts::Exceptions > all exceptions are instanceof DomainException` (layer: unit)
  - spec scenario: "Shared Exception Hierarchy > Exception is instanceof DomainException"
  - Must fail if: `Object.setPrototypeOf` is absent and `instanceof` fails under CommonJS transpilation.
- AC-02 → `packages/shared/test/unit/exceptions/exceptions.spec.ts::ValidationException > code is set correctly` (layer: unit)
  - spec scenario: "Shared Exception Hierarchy > Exception carries code and message"
  - Must fail if: `code` is not stored on the instance.
- AC-03 → `packages/shared/test/unit/exceptions/exceptions.spec.ts::DomainException > message is preserved` (layer: unit)
  - spec scenario: "Shared Exception Hierarchy > Exception carries code and message"
  - Must fail if: `super(message)` is not called and `message` is empty.
- AC-04 → `packages/shared/test/unit/exceptions/exceptions.spec.ts::InsufficientFundsException > context includes attempted and available amounts` (layer: unit)
  - Must fail if: `context` is `undefined` on monetary exceptions.
- AC-05 → `packages/shared/test/unit/exceptions/exceptions.spec.ts::Exceptions > statusCode > each subclass carries the correct HTTP status code` (layer: unit)
  - Must fail if: `statusCode` is absent on `DomainException` or any subclass returns the wrong value.

---

### T07: Implement `uuid.util.ts` Utility

**Files affected**:
- `packages/shared/src/utils/uuid.util.ts`
- `packages/shared/test/unit/utils/uuid.util.spec.ts`

**Description**: Export `generateUuid(): string` using `import { v4 as uuidv4 } from 'uuid'`; export `isValidUuid(value: string): boolean` using the RFC-4122 v4 regex `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`. Both functions are pure with no side effects. `generateUuid` is consumed by `DomainEvent` (T04), `TypedId` (T09), and `AggregateRoot` (T05) — it must be available before those tasks.

**Acceptance criteria**:
- AC-01: `generateUuid()` returns a string where `isValidUuid` returns `true`.
- AC-02: Two calls to `generateUuid()` return different strings.
- AC-03: `isValidUuid` returns `false` for non-UUID strings (e.g. `""`, `"not-a-uuid"`, `"123"`).

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/utils/uuid.util.spec.ts::generateUuid > produces a valid UUID v4` (layer: unit)
  - spec scenario: "UUID and Date Utilities > generateUuid produces unique values"
  - Must fail if: `generateUuid` returns a hardcoded string or an empty string.
- AC-02 → `packages/shared/test/unit/utils/uuid.util.spec.ts::generateUuid > each call returns a unique value` (layer: unit)
  - spec scenario: "UUID and Date Utilities > generateUuid produces unique values"
  - Must fail if: `generateUuid` always returns the same UUID (e.g. hardcoded constant).
- AC-03 → `packages/shared/test/unit/utils/uuid.util.spec.ts::isValidUuid > returns false for invalid inputs` (layer: unit)
  - spec scenario: "UUID and Date Utilities > isValidUuid rejects malformed input"
  - Must fail if: `isValidUuid` always returns `true`.

---

### T07b: Implement `date.util.ts` Utility

**Files affected**:
- `packages/shared/src/utils/date.util.ts`
- `packages/shared/test/unit/utils/date.util.spec.ts`

**Description**: Export three pure functions: `toISOString(date: Date): string` returning `date.toISOString()`; `fromISOString(s: string): Date` returning `new Date(s)` and throwing a `ValidationException` with code `INVALID_DATE` when the resulting `Date` is invalid (i.e. `isNaN(getTime())`); `isValidDate(d: unknown): boolean` returning `true` only when `d instanceof Date && !isNaN(d.getTime())`. These utilities are consumed by `DomainEvent.occurredOn` serialization and by any service mapping date columns to/from JSON.

**Acceptance criteria**:
- AC-01: `toISOString(fromISOString(s))` round-trips to the same string for a valid ISO 8601 input.
- AC-02: `fromISOString("not-a-date")` throws `ValidationException` with code `INVALID_DATE`.
- AC-03: `isValidDate` returns `false` for `null`, `undefined`, `NaN`, plain numbers, and `"not-a-date"`.
- AC-04: `isValidDate` returns `true` for a freshly constructed `new Date()`.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/utils/date.util.spec.ts::date round-trip > toISOString(fromISOString(s)) equals original string` (layer: unit)
  - spec scenario: "UUID and Date Utilities > Round-trip date serialization"
  - Must fail if: `fromISOString` does not parse the ISO string correctly (e.g. returns `Invalid Date`).
- AC-02 → `packages/shared/test/unit/utils/date.util.spec.ts::fromISOString > throws INVALID_DATE for unparseable input` (layer: unit)
  - Must fail if: `fromISOString` silently returns `Invalid Date` instead of throwing.
- AC-03 → `packages/shared/test/unit/utils/date.util.spec.ts::isValidDate > returns false for invalid inputs` (layer: unit)
  - Must fail if: `isValidDate` does not check `isNaN(d.getTime())` or skips the `instanceof Date` guard.
- AC-04 → `packages/shared/test/unit/utils/date.util.spec.ts::isValidDate > returns true for a valid Date instance` (layer: unit)
  - Must fail if: `isValidDate` always returns `false`.

---

### T04: Implement `DomainEvent` Abstract Base Class

**Files affected**:
- `packages/shared/src/domain-event/domain-event.base.ts`
- `packages/shared/test/unit/domain-event/domain-event.base.spec.ts`

**Description**: Implement `abstract class DomainEvent` with readonly fields `eventId`, `aggregateId`, `occurredOn`, `correlationId`, `causationId` populated in the constructor. `eventId` is always `generateUuid()`. `correlationId` defaults to a new UUID if not provided. `causationId` defaults to `eventId` if not provided. Declare `abstract get eventName(): string`.

**Acceptance criteria**:
- AC-01: Constructed event has all five required fields populated as non-empty strings (or `Date`).
- AC-02: `causationId` equals `eventId` when no `causationId` is supplied.
- AC-03: Supplied `correlationId` is preserved on the event instance.
- AC-04: `eventName` returns the value defined on the concrete subclass.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/domain-event/domain-event.base.spec.ts::DomainEvent > construction > populates all required fields` (layer: unit)
  - spec scenario: "DomainEvent Required Fields > Auto-generated fields on construction"
  - Must fail if: any field is `undefined` or an empty string.
- AC-02 → `packages/shared/test/unit/domain-event/domain-event.base.spec.ts::DomainEvent > causationId > defaults to eventId when not provided` (layer: unit)
  - spec scenario: "DomainEvent Required Fields > Auto-generated fields on construction"
  - Must fail if: `causationId` is always a fresh UUID ignoring the default rule.
- AC-03 → `packages/shared/test/unit/domain-event/domain-event.base.spec.ts::DomainEvent > correlationId > uses provided value` (layer: unit)
  - spec scenario: "DomainEvent Required Fields > Correlation ID propagated from caller"
  - Must fail if: `correlationId` always generates a new UUID ignoring the provided value.
- AC-04 → `packages/shared/test/unit/domain-event/domain-event.base.spec.ts::DomainEvent > eventName > returns concrete subclass value` (layer: unit)
  - spec scenario: "DomainEvent Required Fields > eventName reflects concrete type"
  - Must fail if: `eventName` is not abstract or returns a hardcoded value.

---

### T05: Implement `AggregateRoot<T>` Base Class

**Files affected**:
- `packages/shared/src/base-classes/aggregate-root.base.ts`
- `packages/shared/test/unit/base-classes/aggregate-root.base.spec.ts`

**Description**: Implement `abstract class AggregateRoot<TProps extends { id: string }> extends Entity<TProps>` with:
- `private _uncommittedEvents: DomainEvent[] = []` and `private _version = 0`.
- `protected apply(event: DomainEvent)`: pushes event to buffer, increments `_version`, and dispatches to `this['on' + event.eventName](event)` if the handler exists.
- `getUncommittedEvents(): DomainEvent[]`: returns a shallow copy of the buffer.
- `clearEvents(): void`: empties the buffer.
- `reconstitute(props, version)`: assigns props and sets `_version` without touching the events buffer.

**Acceptance criteria**:
- AC-01: `getUncommittedEvents()` contains events in the order `apply()` was called.
- AC-02: `clearEvents()` empties the buffer; subsequent `getUncommittedEvents()` returns `[]`.
- AC-03: `version` increments by 1 per `apply()` call.
- AC-04: `reconstitute(props, 5)` sets `version` to `5` and leaves `getUncommittedEvents()` empty.
- AC-05: `apply()` invokes `this.on<EventName>(event)` when the handler method exists on the subclass.
- AC-06: `apply()` does not throw when no handler exists for the event.
- AC-07: Mutation of the array returned by `getUncommittedEvents()` does not affect the internal buffer.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/base-classes/aggregate-root.base.spec.ts::AggregateRoot > events > collects events in apply order` (layer: unit)
  - spec scenario: "AggregateRoot Domain Event Management > Events collected after apply"
  - Must fail if: events are stored in reverse order or deduplicated.
- AC-02 → `packages/shared/test/unit/base-classes/aggregate-root.base.spec.ts::AggregateRoot > events > clearEvents empties buffer` (layer: unit)
  - spec scenario: "AggregateRoot Domain Event Management > Events cleared after commit"
  - Must fail if: `clearEvents` creates a new empty array but the old reference is still returned.
- AC-03 → `packages/shared/test/unit/base-classes/aggregate-root.base.spec.ts::AggregateRoot > version > increments on each apply` (layer: unit)
  - spec scenario: "AggregateRoot Optimistic Locking Version > Version increments on each apply"
  - Must fail if: `_version` is never incremented.
- AC-04 → `packages/shared/test/unit/base-classes/aggregate-root.base.spec.ts::AggregateRoot > reconstitute > sets version and leaves events empty` (layer: unit)
  - spec scenario: "AggregateRoot Optimistic Locking Version > Reconstitute sets version from persistence"
  - Must fail if: `reconstitute` also increments `_version` or populates `_uncommittedEvents`.
- AC-05 → `packages/shared/test/unit/base-classes/aggregate-root.base.spec.ts::AggregateRoot > handler dispatch > invokes onEventName handler` (layer: unit)
  - spec scenario: "AggregateRoot Event Handler Dispatch > Handler invoked on apply"
  - Must fail if: handler is never dispatched.
- AC-06 → `packages/shared/test/unit/base-classes/aggregate-root.base.spec.ts::AggregateRoot > handler dispatch > does not throw when handler absent` (layer: unit)
  - spec scenario: "AggregateRoot Event Handler Dispatch > No error when handler absent"
  - Must fail if: `apply()` throws when the handler method is missing.
- AC-07 → `packages/shared/test/unit/base-classes/aggregate-root.base.spec.ts::AggregateRoot > events > external mutation of returned array does not affect buffer` (layer: unit)
  - spec scenario: "AggregateRoot Domain Event Management > Events not exposed by reference"
  - Must fail if: `getUncommittedEvents()` returns the internal array by reference.

---

### T08: Implement `Money` Value Object

**Files affected**:
- `packages/shared/src/value-objects/money.vo.ts`
- `packages/shared/test/unit/value-objects/money.vo.spec.ts`

**Description**: Implement `Money extends ValueObject<{ amount: number; currency: Currency }>` per the design's interface contract. Constructor accepts a `Currency` enum value (throws `ValidationException` with code `INVALID_CURRENCY` for any value not in the `Currency` enum) and validates non-negative finite `amount` (throws `ValidationException` with code `INVALID_MONEY_AMOUNT`). `multiply` rounds to 2 decimal places using `Math.round(x * 100) / 100`. `subtract` throws `InsufficientFundsException` if `other.amount > this.amount`. `greaterThan` and arithmetic methods throw `CurrencyMismatchException` for mixed currencies. All operations return new `Money` instances (immutability).

**Acceptance criteria**:
- AC-01: `Money(100, "USD").add(Money(50, "USD"))` returns `Money(150, "USD")` and originals are unchanged.
- AC-02: `Money(30, "USD").subtract(Money(50, "USD"))` throws `InsufficientFundsException`.
- AC-03: `Money(100, "USD").add(Money(100, "EUR"))` throws `CurrencyMismatchException`.
- AC-04: `Money(10, "USD").multiply(3.333)` returns amount `33.33`.
- AC-05: `Money(-1, "USD")` throws `ValidationException` with code `INVALID_MONEY_AMOUNT`.
- AC-06: `new Money(100, "INVALID" as any)` throws `ValidationException` with code `INVALID_CURRENCY`.
- AC-07: `Money(100, "USD").equals(Money(100, "USD"))` returns `true`.
- AC-08: `Money(50, "USD").equals(Money(50, "EUR"))` returns `false`.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/value-objects/money.vo.spec.ts::Money > add > returns sum and leaves originals unchanged` (layer: unit)
  - spec scenario: "Money Arithmetic Invariants > Add two same-currency amounts"
  - Must fail if: `add` mutates `this` instead of returning a new instance.
- AC-02 → `packages/shared/test/unit/value-objects/money.vo.spec.ts::Money > subtract > throws InsufficientFundsException` (layer: unit)
  - spec scenario: "Money Arithmetic Invariants > Subtract — insufficient funds"
  - Must fail if: `subtract` returns a negative `Money` instead of throwing.
- AC-03 → `packages/shared/test/unit/value-objects/money.vo.spec.ts::Money > add > throws CurrencyMismatchException for different currencies` (layer: unit)
  - spec scenario: "Money Arithmetic Invariants > Currency mismatch on add"
  - Must fail if: currency check is absent in `assertSameCurrency`.
- AC-04 → `packages/shared/test/unit/value-objects/money.vo.spec.ts::Money > multiply > rounds to 2 decimal places` (layer: unit)
  - spec scenario: "Money Arithmetic Invariants > Multiply rounds to 2 decimal places"
  - Must fail if: rounding is absent and floating-point noise is returned.
- AC-05 → `packages/shared/test/unit/value-objects/money.vo.spec.ts::Money > construction > throws INVALID_MONEY_AMOUNT for negative amount` (layer: unit)
  - spec scenario: "Money Arithmetic Invariants > Construction with negative amount"
  - Must fail if: constructor accepts negative values.
- AC-06 → `packages/shared/test/unit/value-objects/money.vo.spec.ts::Money > construction > throws INVALID_CURRENCY for value not in Currency enum` (layer: unit)
  - spec scenario: "Money Arithmetic Invariants > Construction with invalid currency"
  - Must fail if: constructor accepts arbitrary strings cast to the `Currency` type.
- AC-07 → `packages/shared/test/unit/value-objects/money.vo.spec.ts::Money > equals > true for same amount and currency` (layer: unit)
  - Must fail if: `equals` always returns `false` (uses reference comparison from base class).
- AC-08 → `packages/shared/test/unit/value-objects/money.vo.spec.ts::Money > equals > false for same amount but different currency` (layer: unit)
  - Must fail if: `equals` ignores currency in comparison.

---

### T09: Implement `TypedId<T>` and Concrete ID Types

**Files affected**:
- `packages/shared/src/value-objects/typed-id.vo.ts`
- `packages/shared/test/unit/value-objects/typed-id.vo.spec.ts`

**Description**: Implement `abstract class TypedId<T extends string> extends ValueObject<{ value: string }>`. Constructor calls `isValidUuid(value)` and throws `ValidationException` with code `INVALID_UUID` if invalid. Add static `generate<U>()` using `new this(generateUuid())` and `from<U>(value)` using `new this(value)`. Expose `get value(): string` and `toString(): string`. Declare nine concrete subclasses (each a one-liner `extends TypedId<'BookingId'>` etc.) in the same file or as named exports.

**Acceptance criteria**:
- AC-01: `BookingId.generate().value` is a valid UUID v4.
- AC-02: `BookingId.from("not-a-uuid")` throws `ValidationException` with code `INVALID_UUID`.
- AC-03: `BookingId.from(uuid).equals(BookingId.from(uuid))` is `true`.
- AC-04: `BookingId.from(uuid).equals(TravelerId.from(uuid))` is `false`.
- AC-05: `bookingId.toString()` returns the same string as `bookingId.value`.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/value-objects/typed-id.vo.spec.ts::TypedId > generate > produces a valid UUID` (layer: unit)
  - spec scenario: "TypedId Type-Safe UUID Wrapping > Generate produces a valid UUID"
  - Must fail if: `generate` does not call `generateUuid()` (e.g., returns a fixed value).
- AC-02 → `packages/shared/test/unit/value-objects/typed-id.vo.spec.ts::TypedId > from > throws INVALID_UUID for non-UUID input` (layer: unit)
  - spec scenario: "TypedId Type-Safe UUID Wrapping > From throws on invalid UUID"
  - Must fail if: constructor skips UUID validation.
- AC-03 → `packages/shared/test/unit/value-objects/typed-id.vo.spec.ts::TypedId > equals > true for same concrete class and same UUID` (layer: unit)
  - spec scenario: "TypedId Type-Safe UUID Wrapping > Equals by value"
  - Must fail if: equality check does not use `ValueObject.equals` logic.
- AC-04 → `packages/shared/test/unit/value-objects/typed-id.vo.spec.ts::TypedId > equals > false for different concrete classes with same UUID` (layer: unit)
  - spec scenario: "TypedId Type-Safe UUID Wrapping > Different concrete ID types not equal despite same UUID"
  - Must fail if: constructor check is missing in `ValueObject.equals`.
- AC-05 → `packages/shared/test/unit/value-objects/typed-id.vo.spec.ts::TypedId > toString > returns same as .value` (layer: unit)
  - Must fail if: `toString` returns `"[object Object]"` (missing override).

---

### T10: Implement `IRepository` and `IUseCase` Interfaces

**Files affected**:
- `packages/shared/src/interfaces/repository.interface.ts`
- `packages/shared/src/interfaces/use-case.interface.ts`
- `packages/shared/test/unit/interfaces/interfaces.spec.ts`

**Description**: Define `export interface IRepository<T, ID> { save(entity: T): Promise<void>; findById(id: ID): Promise<T | null>; findAll(filter?: Partial<T>): Promise<T[]>; delete(id: ID): Promise<void>; }` and `export interface IUseCase<TInput, TOutput> { execute(input: TInput): Promise<TOutput>; }`. Verify TypeScript structural typing via compile-time tests (type-check-only tests using `satisfies` or casting to the interface type, checked via `tsc --noEmit`).

**Acceptance criteria**:
- AC-01: A class implementing `IRepository<Booking, BookingId>` compiles without error when it provides `save`, `findById`, `findAll`, and `delete` with correct signatures.
- AC-02: A class implementing `IUseCase<CreateCommand, ResultDto>` compiles without error when `execute` is implemented.
- AC-03: A class missing `findById` on `IRepository` produces a TypeScript compile error.
- AC-04: `findAll()` called with no argument compiles (filter is optional); `findAll({ status: 'CONFIRMED' })` also compiles with a partial filter argument.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/interfaces/interfaces.spec.ts::IRepository > valid implementation with findAll compiles` (layer: unit — type-check test, fails at `tsc --noEmit` if types are wrong)
  - spec scenario: "IRepository and IUseCase Interface Contracts > Repository interface satisfied by mock"
  - Must fail if: `IRepository` does not declare `findAll` and the missing method is not flagged.
- AC-02 → `packages/shared/test/unit/interfaces/interfaces.spec.ts::IUseCase > valid implementation compiles` (layer: unit — type-check test)
  - spec scenario: "IRepository and IUseCase Interface Contracts > UseCase interface satisfied by implementation"
  - Must fail if: `IUseCase` return type is `any` rather than `Promise<TOutput>`.
- AC-03 → `packages/shared/test/unit/interfaces/interfaces.spec.ts::IRepository > missing method causes compile error` (layer: unit — `// @ts-expect-error` annotation test)
  - Must fail if: TypeScript does not enforce the full interface contract.
- AC-04 → `packages/shared/test/unit/interfaces/interfaces.spec.ts::IRepository > findAll accepts optional partial filter` (layer: unit — type-check test)
  - Must fail if: `findAll` parameter is required (non-optional) or typed as `T` instead of `Partial<T>`.

---

### T11: Implement `KafkaModule` Dynamic NestJS Module

**Files affected**:
- `packages/shared/src/modules/kafka/kafka.constants.ts`
- `packages/shared/src/modules/kafka/kafka.module.ts`
- `packages/shared/test/unit/modules/kafka/kafka.module.spec.ts`

**Description**: Implement `KafkaModule.register(options: KafkaModuleOptions): DynamicModule` as described in the design. The `KAFKA_PRODUCER` factory calls `kafka.producer(); await producer.connect(); return producer`. The `KAFKA_CONSUMER` factory calls `kafka.consumer({ groupId }); await consumer.connect(); return consumer`. Export both tokens. Use `ModuleRef` for clean teardown hooks (`onModuleDestroy`). Unit tests mock the `Kafka` class from `kafkajs` via `jest.mock('kafkajs')` and use `@nestjs/testing` (`Test.createTestingModule`) to compile the module and resolve injection tokens. `@nestjs/testing ^10.0.0` is already listed as a dev dependency in `packages/shared/package.json` (see T01).

**Acceptance criteria**:
- AC-01: `KafkaModule.register(options)` returns a valid NestJS `DynamicModule` object with `providers` and `exports` arrays.
- AC-02: When the NestJS test module compiles, `KAFKA_PRODUCER` resolves to the mock `Producer` instance returned by the mock factory.
- AC-03: `register(options)` does not mutate the supplied `options` object.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/modules/kafka/kafka.module.spec.ts::KafkaModule > register > returns DynamicModule with providers and exports` (layer: unit)
  - spec scenario: "KafkaModule Connected Injection > Producer and consumer injected successfully"
  - Must fail if: `register` returns `undefined` or omits `exports`.
- AC-02 → `packages/shared/test/unit/modules/kafka/kafka.module.spec.ts::KafkaModule > injection > KAFKA_PRODUCER resolves to connected producer` (layer: unit — uses `@nestjs/testing` `Test.createTestingModule`)
  - spec scenario: "KafkaModule Connected Injection > Producer and consumer injected successfully"
  - Must fail if: `KAFKA_PRODUCER` token is not exported from the module.
- AC-03 → `packages/shared/test/unit/modules/kafka/kafka.module.spec.ts::KafkaModule > register > does not mutate options` (layer: unit)
  - spec scenario: "KafkaModule Connected Injection > Register options not mutated"
  - Must fail if: `register` destructively modifies the options object passed in.

---

### T12: Wire Barrel Export and Verify Package Build

**Files affected**:
- `packages/shared/src/index.ts`
- `openspec/CONTRACTS.md` ← add `@travel/shared` exported-types table

**Description**: Add re-exports for all public symbols from T02–T11 into `packages/shared/src/index.ts`. Update `openspec/CONTRACTS.md` with a table listing every named export from `@travel/shared` (symbol name, source file, and a one-line description). Run `npm run build` (TypeScript compilation to `dist/`) and `npm test` (Jest with coverage) in CI. Verify no circular dependency warnings using `npm run lint` (`madge --circular src`). The `madge ^6.0.0` dev dependency and the `lint` npm script are already wired in `packages/shared/package.json` (see T01).

**Acceptance criteria**:
- AC-01: Every public symbol listed in the design's "API / Interface Contracts" section is importable from `'@travel/shared'` without a TypeScript error.
- AC-02: `npm run build` in `packages/shared/` exits with code `0` and `dist/index.d.ts` is emitted.
- AC-03: `madge --circular packages/shared/src` reports zero circular dependencies.
- AC-04: `openspec/CONTRACTS.md` contains a row for every named export from `@travel/shared`, each row including symbol name, source file path, and description.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/barrel.spec.ts::barrel > all public symbols are importable from @travel/shared` (layer: unit — imports every named export from `'@travel/shared'` and asserts each is defined)
  - spec scenario: "Barrel Export Package Integrity > All public symbols importable from barrel"
  - Must fail if: any symbol is missing from `index.ts`.
- AC-02 → CI build step: `tsc --project packages/shared/tsconfig.json && test -f packages/shared/dist/index.d.ts` (layer: integration)
  - spec scenario: "Barrel Export Package Integrity > Package builds without circular dependency warnings"
  - Must fail if: `"declaration": true` is absent from `tsconfig.json` or `outDir` is misconfigured.
- AC-03 → CI lint step: `npm run lint` (`madge --circular src`) run inside `packages/shared/` (layer: integration)
  - spec scenario: "Barrel Export Package Integrity > Package builds without circular dependency warnings"
  - Must fail if: a circular import is introduced between base classes (e.g., `AggregateRoot` importing `Money`).
- AC-04 → `packages/shared/test/unit/barrel.spec.ts::barrel > CONTRACTS.md lists every named export` (layer: unit — reads `openspec/CONTRACTS.md` and asserts each named export from `@travel/shared` has a matching row)
  - Must fail if: `openspec/CONTRACTS.md` is not updated or is missing any symbol added in T02–T11.

---

### T13: Observability — KafkaModule Connection Logging

**Files affected**:
- `packages/shared/src/modules/kafka/kafka.module.ts` ← add NestJS `Logger` calls
- `packages/shared/test/unit/modules/kafka/kafka.module.spec.ts` ← verify log calls

**Description**: Inject the NestJS `Logger` (scoped to `KafkaModule`) into the module. Log `INFO` when the producer connects successfully (`"Kafka producer connected"`) and when the consumer connects successfully (`"Kafka consumer connected"`). Log `ERROR` if either `.connect()` call throws, before re-throwing the error. This ensures connection lifecycle is visible in the consuming service's log stream.

**Acceptance criteria**:
- AC-01: On successful producer connect, `Logger.log('Kafka producer connected')` is called exactly once.
- AC-02: On successful consumer connect, `Logger.log('Kafka consumer connected')` is called exactly once.
- AC-03: On producer connect failure, `Logger.error(...)` is called and the error is re-thrown so NestJS module initialization fails fast.

**Verification artifacts**:
- AC-01 → `packages/shared/test/unit/modules/kafka/kafka.module.spec.ts::KafkaModule > logging > logs producer connected on success` (layer: unit — spy on `Logger.log`)
  - Must fail if: the log call is removed from the producer factory.
- AC-02 → `packages/shared/test/unit/modules/kafka/kafka.module.spec.ts::KafkaModule > logging > logs consumer connected on success` (layer: unit — spy on `Logger.log`)
  - Must fail if: the log call is removed from the consumer factory.
- AC-03 → `packages/shared/test/unit/modules/kafka/kafka.module.spec.ts::KafkaModule > logging > logs error and rethrows on producer connect failure` (layer: unit — mock `producer.connect` to throw)
  - spec scenario: "KafkaModule Connected Injection > Producer connect failure propagates"
  - Must fail if: the error is swallowed (catch without re-throw) or `Logger.error` is not called.
