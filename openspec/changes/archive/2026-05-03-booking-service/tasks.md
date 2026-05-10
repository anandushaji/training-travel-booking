# Tasks: Booking Service (SM-07)

## Implementation Checklist

- [x] T01: Scaffold booking-service project (package.json, tsconfig, jest.config, main.ts, module)
- [x] T02: Domain layer — Booking aggregate with state machine
- [x] T03: Domain layer — BookingSaga and BookingStep entities
- [x] T04: Domain layer — Itinerary value object
- [x] T05: Domain events — BookingCreated, BookingConfirmed, BookingCancelled
- [x] T06: TypeORM entities and migrations (5 tables)
- [x] T07: Infrastructure — BookingRepository and BookingReadModelRepository
- [x] T08: Infrastructure — PolicyServiceClient with circuit breaker, retry, timeout
- [x] T09: Infrastructure — InventoryServiceClient with circuit breaker, retry, timeout
- [x] T10: Infrastructure — PaymentServiceClient with circuit breaker, retry, timeout
- [x] T11: Infrastructure — Kafka event publisher (booking-events)
- [x] T12: Infrastructure — Kafka event consumer (payment-events)
- [x] T13: Application — DTOs and mappers
- [x] T14: Application — BookingSagaOrchestrator
- [x] T15: Application — CreateBookingUseCase
- [x] T16: Application — CancelBookingUseCase and UpdateBookingUseCase
- [x] T17: Application — BookingQueryService (CQRS read side)
- [x] T18: Application — BookingReadModelUpdater (read model projection)
- [x] T19: Presentation — BookingController
- [x] T20: Presentation — HttpExceptionFilter, ValidationPipe, Health/Ready endpoints
- [x] T21: Observability instrumentation (metrics, traces, logs)
- [x] T22: Integration tests (controller + DB)
- [x] T23: Contract test (Pact — BookingConfirmed / BookingCancelled events)

---

## Task Details

> Every task follows the AC Verification Policy
> (`docs/workflow/acceptance-criteria.md`): every Acceptance Criterion is
> paired with a named, automatically executable verification artifact and a
> "Must fail if" note.

---

### T01: Scaffold booking-service project

**Files affected**:
- `booking-service/package.json`
- `booking-service/tsconfig.json`
- `booking-service/jest.config.js`
- `booking-service/src/main.ts`
- `booking-service/src/booking.module.ts`
- `booking-service/src/app.module.ts`

**Description**:
Bootstrap the NestJS application. `package.json` must mirror `policy-service`
and `payment-service`:
- NestJS 10.x, TypeORM 0.3.x, `@nestjs/config`, `opossum`, `axios`,
  `axios-retry`, `prom-client`, `winston`, `class-validator`,
  `class-transformer`, `@travel/shared` (workspace alias).
- Scripts: `build`, `start`, `start:dev`, `test`, `test:cov`, `typeorm`.
- `tsconfig.json`: extends `../tsconfig.base.json`; NO `rootDir`; sets
  `outDir: "dist"`; path alias `"@travel/shared"` → `"../packages/shared/src"`.
- `jest.config.js` (`module.exports = { ... }`): uses `ts-jest`, coverage
  thresholds (branches ≥ 80 %), `--forceExit --runInBand`, exclusions for
  entities, migrations, read-model, `typeorm-data-source.ts`, `__pact_stub__`.
- `main.ts` bootstraps on port `3001` (read from `PORT` env var).
- `BookingModule` declares all providers; imports `TypeOrmModule`,
  `KafkaModule`, `ConfigModule`.

**Acceptance criteria**:
- AC-01: `tsc --noEmit` exits 0 with no TS6059 errors.
- AC-02: `jest --passWithNoTests` exits 0.
- AC-03: `ConfigModule` loads `PORT`, `DATABASE_URL`, `KAFKA_BROKERS`,
  `POLICY_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `PAYMENT_SERVICE_URL`
  from environment.

**Verification artifacts**:
- AC-01 → `booking-service/tsconfig.json` (static; `tsc --noEmit`)
  - Must fail if: `rootDir` is set, causing `@travel/shared` to resolve outside `rootDir`
- AC-02 → `booking-service/jest.config.js` (static; `npm test`)
  - Must fail if: jest config is missing `ts-jest` transformer
- AC-03 → `booking-service/src/config/env.validation.spec.ts::validates required env vars`
  (unit)
  - Must fail if: `ConfigModule` does not throw on missing `DATABASE_URL`

---

### T02: Domain layer — Booking aggregate

**Files affected**:
- `booking-service/src/domain/aggregates/booking.aggregate.ts`
- `booking-service/src/domain/value-objects/booking-id.value-object.ts`
- `booking-service/src/domain/value-objects/booking-status.enum.ts`

**Description**:
`Booking` extends `AggregateRoot` from `@travel/shared`.

```typescript
class Booking extends AggregateRoot<BookingProps> {
  static create(props: CreateBookingProps): Booking
  reserve(reservationId: string): void
  startPaymentProcessing(paymentId: string): void
  confirm(travelerName: string, travelerEmail: string): void
  cancel(reason: string): void
  fail(reason: string): void
  updateSpecialRequests(specialRequests: string): void
  get id(): BookingId
  get travelerId(): string
  get offerId(): string
  get status(): BookingStatus
  get itinerary(): Itinerary
  get reservationId(): string | undefined
  get paymentId(): string | undefined
  get totalAmount(): number
  get currency(): string
}
```

State machine transitions:
- `PENDING → RESERVED` via `reserve()`
- `RESERVED → PAYMENT_PROCESSING` via `startPaymentProcessing()`
- `PAYMENT_PROCESSING → CONFIRMED` via `confirm()`
- Any non-terminal state → `CANCELLED` via `cancel()`
- Any non-terminal state → `FAILED` via `fail()`

Calling a transition from an invalid state throws `DomainException`.

**Acceptance criteria**:
- AC-01: `Booking.create()` returns status `PENDING` and `version=1`.
- AC-02: `reserve()` transitions status to `RESERVED`.
- AC-03: `reserve()` throws `DomainException` if status is not `PENDING`.
- AC-04: `confirm()` transitions status to `CONFIRMED`.
- AC-05: `confirm()` throws `DomainException` if status is not `PAYMENT_PROCESSING`.
- AC-06: `cancel()` throws `DomainException` if status is already `CANCELLED`.
- AC-07: `cancel()` succeeds from any non-terminal state.

**Verification artifacts**:
- AC-01 → `booking-service/src/domain/aggregates/booking.aggregate.spec.ts::create - status PENDING version 1`
  (unit) — Must fail if: initial status is not `PENDING`
- AC-02 → `::reserve - transitions to RESERVED`
  (unit) — Must fail if: `reserve()` does not update `status`
- AC-03 → `::reserve - throws DomainException from non-PENDING state`
  (unit) — Must fail if: guard is missing
- AC-04 → `::confirm - transitions to CONFIRMED`
  (unit) — Must fail if: `confirm()` does not update `status`
- AC-05 → `::confirm - throws DomainException from non-PAYMENT_PROCESSING state`
  (unit) — Must fail if: guard is missing
- AC-06 → `::cancel - throws DomainException when already CANCELLED`
  (unit) — Must fail if: double-cancel is silently ignored
- AC-07 → `::cancel - succeeds from PENDING`
  (unit) — Must fail if: `cancel()` guards against non-CONFIRMED states

---

### T03: Domain layer — BookingSaga and BookingStep entities

**Files affected**:
- `booking-service/src/domain/entities/booking-saga.entity.ts`
- `booking-service/src/domain/entities/booking-step.entity.ts`
- `booking-service/src/domain/value-objects/saga-status.enum.ts`
- `booking-service/src/domain/value-objects/step-status.enum.ts`

**Description**:
`BookingSaga` and `BookingStep` are plain domain entities (extend `Entity`
from `@travel/shared`). They do NOT extend `AggregateRoot`.

```typescript
class BookingSaga {
  static create(bookingId: string): BookingSaga
  addStep(stepName: string): BookingStep
  markStepCompleted(stepNumber: number): void
  markStepFailed(stepNumber: number, error: string): void
  beginCompensation(): void
  markCompensated(): void
  complete(): void
  get id(): string
  get bookingId(): string
  get status(): SagaStatus
  get currentStep(): number
  get steps(): BookingStep[]
}
```

**Acceptance criteria**:
- AC-01: `BookingSaga.create()` initialises with `status=STARTED`, `currentStep=0`.
- AC-02: `addStep()` appends a new `BookingStep` with `status=PENDING`.
- AC-03: `markStepCompleted()` updates the step `status` to `COMPLETED` and
  increments `currentStep`.
- AC-04: `beginCompensation()` sets saga `status` to `COMPENSATING`.
- AC-05: `complete()` sets saga `status` to `COMPLETED`.

**Verification artifacts**:
- AC-01 → `booking-service/src/domain/entities/booking-saga.entity.spec.ts::create - STARTED with currentStep 0`
  (unit) — Must fail if: initial status is not `STARTED`
- AC-02 → `::addStep - appends PENDING step`
  (unit) — Must fail if: step is added with wrong initial status
- AC-03 → `::markStepCompleted - increments currentStep`
  (unit) — Must fail if: `currentStep` is not incremented
- AC-04 → `::beginCompensation - sets COMPENSATING`
  (unit) — Must fail if: status transition is missing
- AC-05 → `::complete - sets COMPLETED`
  (unit) — Must fail if: `complete()` does not update status

---

### T04: Domain layer — Itinerary value object

**Files affected**:
- `booking-service/src/domain/value-objects/itinerary.value-object.ts`

**Description**:
`Itinerary` is an immutable value object (readonly fields, no setters):
`origin` (3-char IATA), `destination` (3-char IATA), `departureDate` (Date),
`returnDate` (Date | undefined), `cabinClass` (enum), `passengers` (int 1–9).

Constructor validates:
- `origin` and `destination` must be 3 uppercase alpha characters.
- `passengers` must be 1–9.
- `departureDate` must not be in the past.
- `cabinClass` must be one of `ECONOMY|PREMIUM_ECONOMY|BUSINESS|FIRST`.

**Acceptance criteria**:
- AC-01: Valid `Itinerary` construction succeeds.
- AC-02: Invalid `origin` (wrong length or non-alpha) throws `DomainException`.
- AC-03: `passengers=0` throws `DomainException`.
- AC-04: `passengers=10` throws `DomainException`.
- AC-05: Invalid `cabinClass` throws `DomainException`.

**Verification artifacts**:
- AC-01 → `booking-service/src/domain/value-objects/itinerary.value-object.spec.ts::valid construction succeeds`
  (unit) — Must fail if: constructor throws on valid input
- AC-02 → `::rejects invalid origin`
  (unit) — Must fail if: `origin` length check is missing
- AC-03 → `::rejects passengers below 1`
  (unit) — Must fail if: lower bound check is missing
- AC-04 → `::rejects passengers above 9`
  (unit) — Must fail if: upper bound check is missing
- AC-05 → `::rejects invalid cabinClass`
  (unit) — Must fail if: enum validation is missing

---

### T05: Domain events — BookingCreated, BookingConfirmed, BookingCancelled

**Files affected**:
- `booking-service/src/domain/events/booking-created.event.ts`
- `booking-service/src/domain/events/booking-confirmed.event.ts`
- `booking-service/src/domain/events/booking-cancelled.event.ts`

**Description**:
All events extend `DomainEvent` from `@travel/shared` and carry the ADR-003
envelope (`eventId`, `eventType`, `aggregateId`, `occurredOn`, `correlationId`,
`causationId`, `data`).

**Acceptance criteria**:
- AC-01: `BookingCreatedEvent` serialises with all ADR-003 envelope fields present.
- AC-02: `BookingConfirmedEvent` includes `data.travelerName`, `data.reservationId`,
  `data.paymentId` in the serialised form.
- AC-03: `BookingCancelledEvent` includes `data.reason` in the serialised form.

**Verification artifacts**:
- AC-01 → `booking-service/src/domain/events/booking-created.event.spec.ts::serialises ADR-003 envelope`
  (unit) — Must fail if: `eventId` is missing
- AC-02 → `booking-service/src/domain/events/booking-confirmed.event.spec.ts::data contains travelerName and paymentId`
  (unit) — Must fail if: `data.travelerName` is absent
- AC-03 → `booking-service/src/domain/events/booking-cancelled.event.spec.ts::data contains reason`
  (unit) — Must fail if: `data.reason` is absent

---

### T06: TypeORM entities and migrations (5 tables)

**Files affected**:
- `booking-service/src/infrastructure/entities/booking.entity.ts`
- `booking-service/src/infrastructure/entities/booking-saga.entity.ts`
- `booking-service/src/infrastructure/entities/booking-saga-step.entity.ts`
- `booking-service/src/infrastructure/entities/event-store.entity.ts`
- `booking-service/src/infrastructure/entities/booking-read-model.entity.ts`
- `booking-service/src/infrastructure/migrations/YYYYMMDD_create_booking_tables.ts`
- `booking-service/src/infrastructure/typeorm-data-source.ts`

**Description**:
TypeORM entities must mirror the schema in `design.md`:
- `BookingEntity`: `@VersionColumn()` on `version`; `@Column({ type: 'jsonb' })` on `itinerary`.
- `BookingSagaEntity`: `@OneToMany` to `BookingSagaStepEntity`.
- `BookingSagaStepEntity`: `@ManyToOne` to `BookingSagaEntity`.
- `EventStoreEntity`: append-only, no version column.
- `BookingReadModelEntity`: separate entity used by query service (excluded from
  coverage via jest config glob — `!**/entities/*.ts`).

Migration creates all five tables in correct FK order.

**Acceptance criteria**:
- AC-01: Migration runs without error.
- AC-02: `BookingEntity` has `@VersionColumn` decorator.
- AC-03: `BookingSagaEntity` and `BookingSagaStepEntity` have correct `@OneToMany`
  / `@ManyToOne` relationship.

**Verification artifacts**:
- AC-01 → `booking-service/src/infrastructure/migrations/migration.integration.spec.ts::migration runs without error`
  (integration — Testcontainers) — Must fail if: SQL has syntax error
- AC-02 → `booking-service/src/infrastructure/entities/booking.entity.spec.ts::has VersionColumn`
  (unit — metadata reflection) — Must fail if: `@VersionColumn()` is removed
- AC-03 → `booking-service/src/infrastructure/entities/booking-saga.entity.spec.ts::has OneToMany to steps`
  (unit) — Must fail if: relationship decorator is missing

---

### T07: Infrastructure — BookingRepository and BookingReadModelRepository

**Files affected**:
- `booking-service/src/infrastructure/repositories/booking.repository.ts`
- `booking-service/src/infrastructure/repositories/booking-read-model.repository.ts`
- `booking-service/src/infrastructure/repositories/booking-saga.repository.ts`

**Description**:
`BookingRepository`:
- `save(booking: Booking): Promise<void>` — persist aggregate + publish domain events
- `findById(id: string): Promise<Booking | null>`
- `findByTravelerId(travelerId: string, filters): Promise<Booking[]>`

`BookingSagaRepository`:
- `save(saga: BookingSaga): Promise<void>`
- `findByBookingId(bookingId: string): Promise<BookingSaga | null>`

`BookingReadModelRepository`:
- `upsert(row: BookingReadModelRow): Promise<void>`
- `findById(id: string): Promise<BookingReadModelRow | null>`
- `findByTravelerId(travelerId: string, filters): Promise<BookingReadModelRow[]>`

Repositories are excluded from coverage via jest config glob.

**Acceptance criteria**:
- AC-01: `BookingRepository.findById` returns `null` (not throws) when not found.
- AC-02: `BookingSagaRepository.save` persists all steps.
- AC-03: `BookingReadModelRepository.upsert` inserts on first call and updates on second.

**Verification artifacts**:
- AC-01 → `booking-service/src/infrastructure/repositories/booking.repository.integration.spec.ts::findById returns null when not found`
  (integration — Testcontainers) — Must fail if: repository throws instead of null
- AC-02 → `::saga save persists steps`
  (integration) — Must fail if: saga steps are not cascaded
- AC-03 → `::read-model upsert inserts then updates`
  (integration) — Must fail if: second upsert creates duplicate row

---

### T08: Infrastructure — PolicyServiceClient  [Circuit Breaker + Retries + Timeouts]

**Files affected**:
- `booking-service/src/infrastructure/http/policy-service.client.ts`

**Description**:
```typescript
class PolicyServiceClient {
  async validatePolicy(request: PolicyValidationRequest, correlationId: string): Promise<PolicyValidationResponse>
}
```

Axios instance: `baseURL=POLICY_SERVICE_URL`, `timeout=POLICY_READ_TIMEOUT_MS (5000)`.
`axios-retry`: 3×, exponential backoff ±25% jitter, retryable on 5xx/network errors.
opossum CB: 50%/10req/30s; fallback throws `ServiceUnavailableException`.

**Acceptance criteria**:
- AC-01: Returns parsed response on HTTP 200 from Policy Service.
- AC-02: Increments `downstream_retries_total{service="policy"}` on 503 exhaustion.
- AC-03: When CB is OPEN, throws `ServiceUnavailableException` without calling Policy Service.
- AC-04: Non-retryable 422 is NOT retried.

**Verification artifacts**:
- AC-01 → `booking-service/src/infrastructure/http/policy-service.client.spec.ts::returns response on 200`
  (unit — Axios mock) — Must fail if: response body is not parsed
- AC-02 → `::increments retry counter on 503 exhaustion`
  (unit) — Must fail if: retry interceptor is not wired
- AC-03 → `::throws ServiceUnavailableException when CB open`
  (unit — opossum forced-open) — Must fail if: fallback is not registered
- AC-04 → `::does not retry 422`
  (unit) — Must fail if: `retryCondition` does not exclude 4xx

---

### T09: Infrastructure — InventoryServiceClient  [Circuit Breaker + Retries + Timeouts]

**Files affected**:
- `booking-service/src/infrastructure/http/inventory-service.client.ts`

**Description**:
```typescript
class InventoryServiceClient {
  async createReservation(offerId: string, itinerary: ItineraryDto, correlationId: string): Promise<ReservationResponse>
  async cancelReservation(reservationId: string, correlationId: string): Promise<void>
}
```

Same timeout/retry/CB pattern as `PolicyServiceClient` but for `INVENTORY_SERVICE_URL`.
CB fallback throws `ServiceUnavailableException`.

**Acceptance criteria**:
- AC-01: `createReservation` returns `reservationId` on HTTP 201 from Inventory Service.
- AC-02: `cancelReservation` does not throw on HTTP 204.
- AC-03: When CB is OPEN, throws `ServiceUnavailableException`.

**Verification artifacts**:
- AC-01 → `booking-service/src/infrastructure/http/inventory-service.client.spec.ts::createReservation returns reservationId`
  (unit) — Must fail if: response `reservationId` is not extracted
- AC-02 → `::cancelReservation resolves on 204`
  (unit) — Must fail if: 204 response causes a parse error
- AC-03 → `::throws ServiceUnavailableException when CB open`
  (unit) — Must fail if: fallback not registered

---

### T10: Infrastructure — PaymentServiceClient  [Circuit Breaker + Retries + Timeouts]

**Files affected**:
- `booking-service/src/infrastructure/http/payment-service.client.ts`

**Description**:
```typescript
class PaymentServiceClient {
  async authorizePayment(travelerId: string, amount: number, currency: string, correlationId: string): Promise<AuthorizeResponse>
  async capturePayment(paymentId: string, correlationId: string): Promise<void>
  async refundPayment(paymentId: string, correlationId: string): Promise<void>
}
```

Same timeout/retry/CB pattern. CB fallback throws `ServiceUnavailableException`.

**Idempotency assumption**: Payment Service must return the same `paymentId` for duplicate `authorizePayment` calls with the same `bookingId`. This is required for retry safety — without it, a retry after a partial failure could result in a double charge. If Payment Service cannot guarantee this, retries on `authorizePayment` must be disabled.

**Acceptance criteria**:
- AC-01: `authorizePayment` returns `paymentId` on HTTP 201.
- AC-02: `capturePayment` resolves on HTTP 200.
- AC-03: `refundPayment` resolves on HTTP 200.
- AC-04: When CB is OPEN, throws `ServiceUnavailableException`.

**Verification artifacts**:
- AC-01 → `booking-service/src/infrastructure/http/payment-service.client.spec.ts::authorizePayment returns paymentId`
  (unit) — Must fail if: `paymentId` not extracted from response
- AC-02 → `::capturePayment resolves on 200`
  (unit) — Must fail if: method rejects on valid 200
- AC-03 → `::refundPayment resolves on 200`
  (unit) — Must fail if: method rejects on valid 200
- AC-04 → `::throws when CB open`
  (unit) — Must fail if: fallback not registered

---

### T11: Infrastructure — Kafka event publisher

**Files affected**:
- `booking-service/src/infrastructure/kafka/booking-event.publisher.ts`

**Description**:
`BookingEventPublisher` injects `KAFKA_PRODUCER` and publishes to `booking-events`.

**Kafka topic setup**: Ensure `booking-events` topic exists before starting the service. Add to `docker-compose.yml` under the `kafka` service's `KAFKA_CREATE_TOPICS` env var: `booking-events:1:1`. Also register the topic in `docs/contracts/CONTRACTS.md` under the booking-service producer entry.

```typescript
class BookingEventPublisher {
  async publishBookingCreated(event: BookingCreatedEvent): Promise<void>
  async publishBookingConfirmed(event: BookingConfirmedEvent): Promise<void>
  async publishBookingCancelled(event: BookingCancelledEvent): Promise<void>
}
```

Each method sends `{ topic: 'booking-events', messages: [{ key: aggregateId, value: JSON.stringify(envelope) }] }`.
On Kafka error: log ERROR and rethrow.

**Acceptance criteria**:
- AC-01: `publishBookingConfirmed` sends to topic `booking-events` with key = `event.aggregateId`.
- AC-02: Published message body has all six ADR-003 envelope fields.
- AC-03: Kafka error is logged and rethrown.

**Verification artifacts**:
- AC-01 → `booking-service/src/infrastructure/kafka/booking-event.publisher.spec.ts::sends to booking-events with aggregateId key`
  (unit) — Must fail if: topic name is wrong or key omitted
- AC-02 → `::message conforms to ADR-003 envelope`
  (unit) — Must fail if: any envelope field is missing
- AC-03 → `::rethrows Kafka error after logging`
  (unit) — Must fail if: error swallowed silently

---

### T12: Infrastructure — Kafka event consumer (payment-events)

**Files affected**:
- `booking-service/src/infrastructure/kafka/payment-event.consumer.ts`

**Description**:
`PaymentEventConsumer` subscribes to `payment-events` topic.

On `PaymentCaptured`:
1. Look up booking by `data.bookingId`.
2. Check if saga `status` is already `COMPLETED` — if so, ack and return (idempotent).
3. Confirm booking aggregate.
4. Publish `BookingConfirmed` to `booking-events`.
5. Update read model.

On `PaymentFailed`:
1. Look up booking.
2. Check if saga already `COMPENSATED` — if so, ack and return.
3. Cancel reservation via `InventoryServiceClient`.
4. Call `booking.fail()`.
5. Publish `BookingCancelled`.

**Acceptance criteria**:
- AC-01: `PaymentCaptured` consumer transitions booking to `CONFIRMED`.
- AC-02: Duplicate `PaymentCaptured` (saga already `COMPLETED`) is a no-op.
- AC-03: `PaymentFailed` consumer cancels reservation and marks booking `FAILED`.
- AC-04: `PaymentFailed` with saga already `COMPENSATED` is a no-op.

**Verification artifacts**:
- AC-01 → `booking-service/src/infrastructure/kafka/payment-event.consumer.spec.ts::PaymentCaptured confirms booking`
  (unit — mocked repo + publisher) — Must fail if: `booking.confirm()` is not called
- AC-02 → `::duplicate PaymentCaptured is no-op`
  (unit) — Must fail if: second processing emits duplicate event
- AC-03 → `::PaymentFailed cancels reservation and marks FAILED`
  (unit) — Must fail if: `cancelReservation` is not called
- AC-04 → `::duplicate PaymentFailed is no-op`
  (unit) — Must fail if: compensation is triggered twice

---

### T13: Application — DTOs and mappers

**Files affected**:
- `booking-service/src/application/dtos/create-booking.dto.ts`
- `booking-service/src/application/dtos/cancel-booking.dto.ts`
- `booking-service/src/application/dtos/update-booking.dto.ts`
- `booking-service/src/application/dtos/booking-response.dto.ts`
- `booking-service/src/application/dtos/list-bookings.dto.ts`
- `booking-service/src/application/mappers/booking.mapper.ts`

**Description**:
`CreateBookingDto` requires `travelerId` (UUID), `flightOfferId` (string),
`itinerary` (nested object with `origin`, `destination`, `departureDate`,
`cabinClass`, `passengers`).
`CancelBookingDto` has optional `reason` (string).
`UpdateBookingDto` has optional `specialRequests` (string).

DTOs use `class-validator` with `whitelist: true`.
`BookingMapper.toDto(aggregate | readModel): BookingResponseDto`.
`exactOptionalPropertyTypes: true` — use `...(x !== undefined && { x })`.

**Acceptance criteria**:
- AC-01: `CreateBookingDto` fails validation when `travelerId` is missing.
- AC-02: `CreateBookingDto` fails validation when `itinerary.origin` is missing.
- AC-03: `BookingMapper.toDto` maps all required fields including nested `itinerary`.

**Verification artifacts**:
- AC-01 → `booking-service/src/application/dtos/create-booking.dto.spec.ts::fails when travelerId missing`
  (unit) — Must fail if: `@IsUUID()` is missing on `travelerId`
- AC-02 → `::fails when itinerary.origin missing`
  (unit) — Must fail if: `@IsNotEmpty()` missing on `origin`
- AC-03 → `booking-service/src/application/mappers/booking.mapper.spec.ts::maps all fields including itinerary`
  (unit) — Must fail if: `itinerary` is missing from the mapped DTO

---

### T14: Application — BookingSagaOrchestrator

**Files affected**:
- `booking-service/src/application/saga/booking-saga.orchestrator.ts`

**Description**:
```typescript
class BookingSagaOrchestrator {
  async execute(booking: Booking, correlationId: string): Promise<void>
  async compensate(booking: Booking, saga: BookingSaga, correlationId: string): Promise<void>
}
```

`execute()`:
1. Create and persist `BookingSaga` (`STARTED`).
2. **Step 1 — Validate Policy**: `PolicyServiceClient.validatePolicy()`. On
   violation, throw `PolicyViolationException`; saga stays `FAILED`.
3. **Step 2 — Reserve Flight**: `InventoryServiceClient.createReservation()`.
   On error, call `compensate()` (no reservation to cancel; policy is read-only).
4. **Step 3 — Authorize Payment**: `PaymentServiceClient.authorizePayment()`.
   On error, call `compensate()` which cancels reservation.
5. **Step 4 — Capture Payment**: `PaymentServiceClient.capturePayment()`.
   On error, call `compensate()` which cancels reservation + refunds payment.
6. Mark saga `COMPLETED`, call `booking.confirm()`.

`compensate()` executes in reverse:
- If `paymentId` present: `PaymentServiceClient.refundPayment()`.
- If `reservationId` present: `InventoryServiceClient.cancelReservation()`.
- Mark saga `COMPENSATED`, call `booking.fail(reason)`.

If a compensation step itself fails (downstream error after retries):
- Log `ERROR` with `bookingId`, `sagaId`, `stepName`, error message.
- Mark saga `COMPENSATED_WITH_ERRORS`.
- Increment `booking_saga_compensation_failed_total` counter.
- Rethrow so the caller (use case) receives a ServiceUnavailableException.

**Acceptance criteria**:
- AC-01: All four steps complete → saga status `COMPLETED`, booking status `CONFIRMED`.
- AC-02: Policy violation at step 1 → no reservation, no payment, saga `FAILED`.
- AC-03: Inventory failure at step 2 → saga `COMPENSATED`, no payment.
- AC-04: Payment authorization failure at step 3 → reservation cancelled, saga `COMPENSATED`.
- AC-05: Each step creates a `BookingStep` row with correct `stepName`.
- AC-06: Compensation step failure → saga marked `COMPENSATED_WITH_ERRORS`, counter incremented.

**Verification artifacts**:
- AC-01 → `booking-service/src/application/saga/booking-saga.orchestrator.spec.ts::all steps succeed - saga COMPLETED`
  (unit — all clients mocked) — Must fail if: saga status is not `COMPLETED` on success
- AC-02 → `::policy violation - no reservation or payment`
  (unit) — Must fail if: `createReservation` is called after policy violation
- AC-03 → `::inventory failure - no payment created`
  (unit) — Must fail if: `authorizePayment` is called after reservation failure
- AC-04 → `::payment failure - cancels reservation`
  (unit) — Must fail if: `cancelReservation` is not called during compensation
- AC-05 → `::creates BookingStep for each step`
  (unit) — Must fail if: steps are not persisted
- AC-06 → `::compensation step failure - marks COMPENSATED_WITH_ERRORS`
  (unit) — Must fail if: saga status remains `COMPENSATING` when compensation throws

---

### T15: Application — CreateBookingUseCase

**Files affected**:
- `booking-service/src/application/use-cases/create-booking.use-case.ts`

**Description**:
```typescript
class CreateBookingUseCase {
  async execute(dto: CreateBookingDto, jwtPayload: JwtPayload, correlationId: string): Promise<BookingResponseDto>
}
```

Flow:
1. Validate `travelerId` matches `jwtPayload.sub` for EMPLOYEE role;
   MANAGER/ADMIN may use any `travelerId`.
2. Construct `Booking.create()`.
3. Persist booking (`status=PENDING`).
4. Publish `BookingCreated` to Kafka (fire-and-forget, errors logged).
5. Call `BookingSagaOrchestrator.execute(booking, correlationId)`.
6. Persist final booking state.
7. Return `BookingMapper.toDto(booking)`.

On `PolicyViolationException` / `ServiceUnavailableException` /
downstream errors: persist booking as `FAILED`, rethrow mapped exception.

**Acceptance criteria**:
- AC-01: Returns `BookingResponseDto` with `status=CONFIRMED` on saga success.
- AC-02: Throws HTTP 403 when EMPLOYEE provides a different `travelerId` than JWT sub.
- AC-03: Persists booking with `status=FAILED` when saga fails.
- AC-04: Publishes `BookingCreated` event regardless of saga outcome.

**Verification artifacts**:
- AC-01 → `booking-service/src/application/use-cases/create-booking.use-case.spec.ts::returns CONFIRMED on saga success`
  (unit — orchestrator mocked) — Must fail if: use case does not return DTO
- AC-02 → `::throws 403 for wrong travelerId on EMPLOYEE role`
  (unit) — Must fail if: EMPLOYEE role check is missing
- AC-03 → `::persists FAILED on saga error`
  (unit) — Must fail if: failed booking is not persisted
- AC-04 → `::publishes BookingCreated`
  (unit) — Must fail if: `publishBookingCreated` is not called

---

### T16: Application — CancelBookingUseCase and UpdateBookingUseCase

**Files affected**:
- `booking-service/src/application/use-cases/cancel-booking.use-case.ts`
- `booking-service/src/application/use-cases/update-booking.use-case.ts`

**Description**:
`CancelBookingUseCase`:
1. `findById` → `NotFoundException` if null.
2. Guard: if `status=CANCELLED` throw `ConflictException('BOOKING_ALREADY_CANCELLED')`.
3. Call `booking.cancel(reason)`.
4. If `reservationId` present, call `InventoryServiceClient.cancelReservation()` (best-effort, log error).
5. If `paymentId` present, call `PaymentServiceClient.refundPayment()` (best-effort).
6. Persist updated booking.
7. Publish `BookingCancelled`.
8. Update read model.
9. Return DTO.

`UpdateBookingUseCase`:
1. `findById` → `NotFoundException` if null.
2. `booking.updateSpecialRequests(dto.specialRequests)`.
3. Persist.
4. Return DTO.

**Acceptance criteria**:
- AC-01: `CancelBookingUseCase` throws `NotFoundException` when booking not found.
- AC-02: `CancelBookingUseCase` throws `ConflictException` when already cancelled.
- AC-03: `CancelBookingUseCase` calls `cancelReservation` and `refundPayment`.
- AC-04: `CancelBookingUseCase` publishes `BookingCancelled` event.
- AC-05: `UpdateBookingUseCase` updates `specialRequests` field.

**Verification artifacts**:
- AC-01 → `booking-service/src/application/use-cases/cancel-booking.use-case.spec.ts::throws NotFoundException when not found`
  (unit) — Must fail if: null from repo is not mapped to NotFoundException
- AC-02 → `::throws ConflictException when already CANCELLED`
  (unit) — Must fail if: guard is missing
- AC-03 → `::cancels reservation and refunds payment`
  (unit) — Must fail if: either downstream call is skipped
- AC-04 → `::publishes BookingCancelled`
  (unit) — Must fail if: event is not published
- AC-05 → `booking-service/src/application/use-cases/update-booking.use-case.spec.ts::updates specialRequests`
  (unit) — Must fail if: field is not saved

---

### T17: Application — BookingQueryService (CQRS read side)

**Files affected**:
- `booking-service/src/application/services/booking-query.service.ts`

**Description**:
```typescript
class BookingQueryService {
  async getById(id: string): Promise<BookingResponseDto>
  async listBookings(filters: ListBookingsDto): Promise<{ bookings: BookingResponseDto[]; pagination: PaginationDto }>
}
```

Reads from `BookingReadModelRepository` only (no write-side access).
`listBookings` supports `status` filter, `page`, `limit` with default pagination.

**Acceptance criteria**:
- AC-01: `getById` throws `NotFoundException` when read model row not found.
- AC-02: `listBookings` returns paginated result with `pagination` metadata.
- AC-03: `listBookings` with `status=CONFIRMED` filters to only confirmed bookings.

**Verification artifacts**:
- AC-01 → `booking-service/src/application/services/booking-query.service.spec.ts::getById throws NotFoundException`
  (unit) — Must fail if: null is not mapped to NotFoundException
- AC-02 → `::listBookings returns pagination metadata`
  (unit) — Must fail if: `pagination` field is missing from response
- AC-03 → `::listBookings filters by status`
  (unit) — Must fail if: status filter is not applied

---

### T18: Application — BookingReadModelUpdater (read model projection)

**Files affected**:
- `booking-service/src/application/event-handlers/booking-read-model.updater.ts`

**Description**:
`BookingReadModelUpdater` uses `@OnEvent('BookingConfirmed')` and
`@OnEvent('BookingCancelled')` (NestJS EventEmitter2 or CQRS EventBus).

On `BookingConfirmed`: upsert row in `booking_read_model` with denormalized
`travelerName`, `travelerEmail`, all booking fields.
On `BookingCancelled`: update `status=CANCELLED` for the booking row.

**Acceptance criteria**:
- AC-01: `BookingConfirmed` event triggers upsert with all required fields.
- AC-02: `BookingCancelled` event updates `status` to `CANCELLED`.
- AC-03: Handler is idempotent — calling twice does not create duplicate rows.

**Verification artifacts**:
- AC-01 → `booking-service/src/application/event-handlers/booking-read-model.updater.spec.ts::BookingConfirmed upserts with all fields`
  (unit — repo mocked) — Must fail if: `travelerName` is omitted from upsert
- AC-02 → `::BookingCancelled updates status`
  (unit) — Must fail if: status is not set to CANCELLED
- AC-03 → `::upsert is idempotent`
  (unit) — Must fail if: second call creates a duplicate row

---

### T19: Presentation — BookingController

**Files affected**:
- `booking-service/src/presentation/controllers/booking.controller.ts`

**Description**:
Routes per `openapi-booking-service.yaml`:
- `POST /bookings` → `CreateBookingUseCase`; `@HttpCode(201)`
- `GET /bookings` → `BookingQueryService.listBookings`
- `GET /bookings/:id` → `BookingQueryService.getById`
- `POST /bookings/:id/cancel` → `CancelBookingUseCase`
- `PATCH /bookings/:id` → `UpdateBookingUseCase`

All routes: `@UseGuards(JwtAuthGuard)`.
Controller extracts `correlationId` from `X-Correlation-ID` header
(defaults to `generateUuid()` if missing).

**Acceptance criteria**:
- AC-01: `POST /bookings` returns 201 with booking DTO.
- AC-02: `POST /bookings` without JWT returns 401.
- AC-03: `POST /bookings/:id/cancel` returns 409 when booking already cancelled.
- AC-04: `X-Correlation-ID` header is propagated to use cases.

**Verification artifacts**:
- AC-01 → `booking-service/src/presentation/controllers/booking.controller.spec.ts::POST /bookings returns 201`
  (unit — use case mocked) — Must fail if: `@HttpCode(201)` is missing
- AC-02 → `::POST /bookings returns 401 without JWT`
  (unit — guard not overridden) — Must fail if: `JwtAuthGuard` is not applied
- AC-03 → `::POST /bookings/:id/cancel returns 409 when already cancelled`
  (unit) — Must fail if: ConflictException is not mapped to 409
- AC-04 → `::correlationId forwarded from header`
  (unit) — Must fail if: header not extracted

---

### T20: Presentation — HttpExceptionFilter, ValidationPipe, Health/Ready endpoints

**Files affected**:
- `booking-service/src/presentation/filters/http-exception.filter.ts`
- `booking-service/src/presentation/controllers/health.controller.ts`
- `booking-service/src/main.ts` (global pipe + filter registration)

**Description**:
Mirror the pattern from `policy-service`:
- `HttpExceptionFilter` returns `{ error, message, details }` for all exceptions.
- `ValidationPipe`: `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- `GET /health` → `{ status: "healthy", timestamp: ISO }` (no auth).
- `GET /ready` → SELECT 1 on DB; returns `{ status: "ready", database: "connected" }` or 503.

**Acceptance criteria**:
- AC-01: `HttpExceptionFilter` returns `{ error, message, details }` for 404.
- AC-02: `ValidationPipe` rejects extra fields with HTTP 400.
- AC-03: `GET /health` returns 200 without JWT.
- AC-04: `GET /ready` returns 503 when DB is unavailable.

**Verification artifacts**:
- AC-01 → `booking-service/src/presentation/filters/http-exception.filter.spec.ts::maps NotFoundException to 404 shape`
  (unit) — Must fail if: default NestJS error body is returned
- AC-02 → `booking-service/src/presentation/controllers/booking.controller.spec.ts::ValidationPipe rejects extra fields`
  (unit) — Must fail if: `forbidNonWhitelisted` is not true
- AC-03 → `booking-service/src/presentation/controllers/health.controller.spec.ts::GET /health returns 200`
  (unit) — Must fail if: `JwtAuthGuard` is applied to health
- AC-04 → `::GET /ready returns 503 when DB down`
  (unit) — Must fail if: DB error is not caught

---

### T21: Observability instrumentation

**Files affected**:
- `booking-service/src/infrastructure/metrics/booking-metrics.service.ts`
- `booking-service/src/infrastructure/http/policy-service.client.ts` (add CB state gauge)
- `booking-service/src/infrastructure/http/inventory-service.client.ts` (add CB state gauge)
- `booking-service/src/infrastructure/http/payment-service.client.ts` (add CB state gauge)

**Description**:
`BookingMetricsService` initialises all `prom-client` metrics:
- `http_requests_total` (Counter, labels: method, route, status_code)
- `http_request_duration_seconds` (Histogram, labels: method, route)
- `bookings_created_total` (Counter)
- `bookings_confirmed_total` (Counter)
- `bookings_cancelled_total` (Counter)
- `booking_saga_duration_seconds` (Histogram)
- `booking_saga_compensation_failed_total` (Counter — incremented when a compensation step throws after retries exhausted)
- `downstream_retries_total` (Counter, labels: service)
- `downstream_cb_state` (Gauge, labels: service, state)

`GET /metrics` endpoint: unauthenticated, returns `prom-client` text format.
All metrics specs call `prom.register.clear()` in `beforeEach`.

**Acceptance criteria**:
- AC-01: `bookings_created_total` incremented after `CreateBookingUseCase.execute()`.
- AC-02: `downstream_cb_state{service="policy", state="open"}` gauge set to 1 on CB OPEN.
- AC-03: `GET /metrics` returns 200 with `Content-Type: text/plain`.

**Verification artifacts**:
- AC-01 → `booking-service/src/infrastructure/metrics/booking-metrics.service.spec.ts::increments bookings_created_total`
  (unit — `prom.register.clear()` in beforeEach) — Must fail if: counter not incremented
- AC-02 → `booking-service/src/infrastructure/http/policy-service.client.spec.ts::sets cb_state gauge to 1 on OPEN`
  (unit) — Must fail if: opossum `open` event does not trigger gauge update
- AC-03 → `booking-service/src/presentation/controllers/health.controller.spec.ts::GET /metrics returns 200`
  (unit) — Must fail if: metrics endpoint is missing

---

### T22: Integration tests

**Files affected**:
- `booking-service/src/presentation/controllers/booking.controller.integration.spec.ts`
- `booking-service/src/application/use-cases/create-booking.use-case.integration.spec.ts`

**Description**:
Integration tests use Testcontainers (PostgreSQL) and `@nestjs/testing`
`Test.createTestingModule` with real TypeORM. Kafka, Policy, Inventory, and
Payment clients are mocked.

Key scenarios:
- `POST /bookings` with mocked saga → booking row created, read model upserted.
- `POST /bookings` with mocked policy violation → booking `FAILED`.
- `POST /bookings/:id/cancel` → booking `CANCELLED`, `BookingCancelled` event published.
- `GET /bookings/:id` → reads from read model.

**Acceptance criteria**:
- AC-01: `POST /bookings` creates booking row and read model row on saga success.
- AC-02: `POST /bookings` with policy violation returns 422 and booking `FAILED`.
- AC-03: `POST /bookings/:id/cancel` returns 200 with `status=CANCELLED`.

**Verification artifacts**:
- AC-01 → `booking-service/src/presentation/controllers/booking.controller.integration.spec.ts::POST /bookings creates booking and read model`
  (integration) — Must fail if: read model row is not created
- AC-02 → `::POST /bookings with violation returns 422 and FAILED booking`
  (integration) — Must fail if: booking is not persisted as FAILED
- AC-03 → `::POST /bookings/:id/cancel returns 200 CANCELLED`
  (integration) — Must fail if: status is not updated to CANCELLED

---

### T23: Contract test — Kafka events (Pact)

**Files affected**:
- `booking-service/src/contract/__pact_stub__.js`
- `booking-service/src/contract/booking-events.pact.spec.ts`

**Description**:
Mirrors the pattern from `policy-service/src/contract/policy-events.pact.spec.ts`.
`__pact_stub__.js` stubs `@pact-foundation/pact` (same stub as policy-service).
`moduleNameMapper` in `jest.config.js` maps `@pact-foundation/pact` to the stub.

Tests two interactions (consumer = Expense Service SM-08):

1. **BookingConfirmed**:
   ```json
   {
     "eventType": "BookingConfirmed",
     "aggregateId": "<string>",
     "data": { "travelerId": "<string>", "totalAmount": 450.00, "currency": "USD" }
   }
   ```

2. **BookingCancelled**:
   ```json
   {
     "eventType": "BookingCancelled",
     "aggregateId": "<string>",
     "data": { "travelerId": "<string>", "reason": "<string>" }
   }
   ```

No `finalize()` call (consistent with policy-service).

**Acceptance criteria**:
- AC-01: Pact test for `BookingConfirmed` passes.
- AC-02: Pact test for `BookingCancelled` passes.
- AC-03: `asynchronousBodyHandler` validates the envelope shape.

**Verification artifacts**:
- AC-01 → `booking-service/src/contract/booking-events.pact.spec.ts::BookingConfirmed interaction`
  (contract) — Must fail if: `eventType` is absent
- AC-02 → `::BookingCancelled interaction`
  (contract) — Must fail if: `data.reason` is absent
- AC-03 → `::handler validates envelope shape`
  (contract) — Must fail if: `aggregateId` is not in message body
