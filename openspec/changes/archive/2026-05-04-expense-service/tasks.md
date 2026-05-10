# Tasks: Expense Service (SM-08)

## Implementation Checklist

> **Implementation order** differs from task numbering for T07.
> Follow this sequence: T01 → T02 → T03 → T04 → T05 → T06 → T08 → T09 →
> T10 → T11 → **T07** → T12 → T13 → T14 → T15 → T16 → T17 → T18 → T19

- [x] T01: Scaffold expense-service project (package.json, tsconfig, jest.config, main.ts, module, JwtAuthGuard)
- [x] T02: Domain layer — Receipt aggregate
- [x] T03: Domain layer — Expense aggregate
- [x] T04: Domain events — ReceiptGenerated, ExpenseRecorded
- [x] T05: TypeORM entities and migrations (4 tables)
- [x] T06: Infrastructure — ReceiptRepository and ExpenseRepository
- [x] T08: Infrastructure — Kafka event publisher (expense-events)
- [x] T09: Application — DTOs and mappers (incl. CategoryResponseDto)
- [x] T10: Application — GenerateReceiptUseCase (BookingConfirmed handler)
- [x] T11: Application — VoidReceiptUseCase (BookingCancelled handler)
- [x] T07: Infrastructure — Kafka event consumer (booking-events) ← implement AFTER T10 + T11
- [x] T12: Application — ExpenseQueryService
- [x] T13: Presentation — ReceiptController
- [x] T14: Presentation — ExpenseController
- [x] T15: Presentation — HttpExceptionFilter, ValidationPipe, Health/Ready endpoints
- [x] T16: Observability instrumentation (metrics, traces, logs)
- [x] T17: Unit tests (≥ 80% branch coverage)
- [x] T18: Integration tests (controller + DB + Kafka consumer via Testcontainers)
- [x] T19: Contract test (Pact — BookingConfirmed / BookingCancelled consumer)

---

## Task Details

> Every task follows the AC Verification Policy
> (`docs/workflow/acceptance-criteria.md`): every Acceptance Criterion is
> paired with a named, automatically executable verification artifact and a
> "Must fail if" note.

---

### T01: Scaffold expense-service project

**Files affected**:
- `expense-service/package.json`
- `expense-service/tsconfig.json`
- `expense-service/jest.config.js`
- `expense-service/src/main.ts`
- `expense-service/src/expense.module.ts`
- `expense-service/src/app.module.ts`
- `expense-service/src/presentation/guards/jwt-auth.guard.ts`

**Description**:
Bootstrap the NestJS **hybrid** application (HTTP + Kafka microservice).
`package.json` mirrors `booking-service`:
- NestJS 10.x, TypeORM 0.3.x, `@nestjs/config`, `@nestjs/microservices`,
  `prom-client`, `winston`, `class-validator`, `class-transformer`,
  `@travel/shared` (workspace alias).
- Scripts: `build`, `start`, `start:dev`, `test`, `test:cov`, `typeorm`.
- `tsconfig.json`: extends `../tsconfig.base.json`; NO `rootDir`; sets
  `outDir: "dist"`; path alias `"@travel/shared"` → `"../packages/shared/src"`.
- `jest.config.js`: uses `ts-jest`, coverage thresholds (branches ≥ 80%),
  `--forceExit --runInBand`, exclusions for entities, migrations,
  `typeorm-data-source.ts`, `__pact_stub__`.
  `moduleNameMapper`: `typeorm` → `../../payment-service/node_modules/typeorm$1`;
  `@nestjs/typeorm` → `../../payment-service/node_modules/@nestjs/typeorm$1`.
- `main.ts` bootstraps as a **hybrid NestJS app** on port `3006`:
  ```typescript
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      client: { brokers: [process.env.KAFKA_BROKERS] },
      consumer: { groupId: 'expense-service-consumer' },
    },
  });
  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3006);
  ```
- `ExpenseModule` declares all providers; imports `TypeOrmModule`, `ConfigModule`.
- `jwt-auth.guard.ts`: copy verbatim from
  `booking-service/src/presentation/guards/jwt-auth.guard.ts`.
  Validate JWT from `Authorization: Bearer <token>` header using `JWT_SECRET`
  env var. Attach decoded payload to `request.user`.

**Acceptance criteria**:
- AC-01: `tsc --noEmit` exits 0 with no TS6059 errors.
- AC-02: `jest --passWithNoTests` exits 0.
- AC-03: `ConfigModule` loads `PORT`, `DATABASE_URL`, `KAFKA_BROKERS`,
  `JWT_SECRET` from environment.
- AC-04: `main.ts` calls `app.connectMicroservice()` with Kafka transport
  before `app.listen()`.

**Verification artifacts**:
- AC-01 → `expense-service/tsconfig.json` (static; `tsc --noEmit`)
  - Must fail if: `rootDir` is set, causing `@travel/shared` to resolve outside `rootDir`
- AC-02 → `expense-service/jest.config.js` (static; `npm test`)
  - Must fail if: jest config is missing `ts-jest` transformer
- AC-03 → `expense-service/src/config/env.validation.spec.ts::validates required env vars`
  (unit) — Must fail if: `ConfigModule` does not throw on missing `DATABASE_URL`
- AC-04 → `expense-service/src/main.spec.ts::registers Kafka microservice transport`
  (unit — spy on `app.connectMicroservice`) — Must fail if: `connectMicroservice`
  is not called with `Transport.KAFKA`

---

### T02: Domain layer — Receipt aggregate

**Files affected**:
- `expense-service/src/domain/aggregates/receipt.aggregate.ts`
- `expense-service/src/domain/value-objects/receipt-status.enum.ts`

**Description**:
`Receipt` extends `AggregateRoot` from `@travel/shared`.

```typescript
class Receipt extends AggregateRoot<ReceiptProps> {
  static create(props: CreateReceiptProps): Receipt
  void(voidedAt: Date): void
  get id(): string
  get receiptNumber(): string
  get bookingId(): string
  get travelerId(): string
  get travelerName(): string
  get travelerEmail(): string
  get amount(): number
  get currency(): string
  get origin(): string
  get destination(): string
  get departureDate(): Date
  get status(): ReceiptStatus  // ACTIVE | VOIDED
  get generatedAt(): Date
  get voidedAt(): Date | undefined
}
```

`Receipt.create()` sets `status=ACTIVE` and `generatedAt=now()`.
`void()` sets `status=VOIDED` and records `voidedAt`.
Calling `void()` on an already-voided receipt throws `DomainException`.

**Acceptance criteria**:
- AC-01: `Receipt.create()` returns `status=ACTIVE`.
- AC-02: `Receipt.void()` transitions status to `VOIDED` and sets `voidedAt`.
- AC-03: `Receipt.void()` throws `DomainException` when already voided.

**Verification artifacts**:
- AC-01 → `expense-service/src/domain/aggregates/receipt.aggregate.spec.ts::create - status ACTIVE`
  (unit) — Must fail if: initial status is not `ACTIVE`
- AC-02 → `::void - transitions to VOIDED with voidedAt`
  (unit) — Must fail if: `status` is not updated or `voidedAt` not set
- AC-03 → `::void - throws DomainException when already VOIDED`
  (unit) — Must fail if: double-void is silently ignored

---

### T03: Domain layer — Expense aggregate

**Files affected**:
- `expense-service/src/domain/aggregates/expense.aggregate.ts`
- `expense-service/src/domain/value-objects/expense-status.enum.ts`
- `expense-service/src/domain/value-objects/expense-category.enum.ts`

**Description**:
`Expense` extends `AggregateRoot` from `@travel/shared`.

```typescript
class Expense extends AggregateRoot<ExpenseProps> {
  static create(props: CreateExpenseProps): Expense
  cancel(cancelledAt: Date): void
  get id(): string
  get bookingId(): string
  get receiptId(): string
  get travelerId(): string
  get travelerName(): string
  get amount(): number
  get currency(): string
  get category(): ExpenseCategory  // default FLIGHT
  get description(): string
  get expenseDate(): Date
  get status(): ExpenseStatus  // ACTIVE | CANCELLED
  get cancelledAt(): Date | undefined
}
```

`Expense.create()` sets `status=ACTIVE`, `category=FLIGHT` by default.
`cancel()` sets `status=CANCELLED` and `cancelledAt`.
Calling `cancel()` on an already-cancelled expense throws `DomainException`.

**Acceptance criteria**:
- AC-01: `Expense.create()` returns `status=ACTIVE` and `category=FLIGHT`.
- AC-02: `Expense.cancel()` transitions status to `CANCELLED` and sets `cancelledAt`.
- AC-03: `Expense.cancel()` throws `DomainException` when already cancelled.

**Verification artifacts**:
- AC-01 → `expense-service/src/domain/aggregates/expense.aggregate.spec.ts::create - ACTIVE with FLIGHT category`
  (unit) — Must fail if: default category or initial status is wrong
- AC-02 → `::cancel - transitions to CANCELLED with cancelledAt`
  (unit) — Must fail if: `status` not updated or `cancelledAt` not set
- AC-03 → `::cancel - throws DomainException when already CANCELLED`
  (unit) — Must fail if: double-cancel is silently ignored

---

### T04: Domain events — ReceiptGenerated, ExpenseRecorded

**Files affected**:
- `expense-service/src/domain/events/receipt-generated.event.ts`
- `expense-service/src/domain/events/expense-recorded.event.ts`

**Description**:
Both events extend `DomainEvent` from `@travel/shared` and carry the ADR-003
envelope (`eventId`, `eventType`, `aggregateId`, `occurredOn`, `correlationId`,
`causationId`, `version: "1.0"`, `data`).

`ReceiptGeneratedEvent.data`: `bookingId`, `travelerId`, `receiptNumber`,
`amount`, `currency`.

`ExpenseRecordedEvent.data`: `bookingId`, `travelerId`, `amount`, `currency`,
`status` (`ACTIVE` or `CANCELLED`).

**Acceptance criteria**:
- AC-01: `ReceiptGeneratedEvent` serialises with all ADR-003 envelope fields and `data.receiptNumber`.
- AC-02: `ExpenseRecordedEvent` serialises with `data.status` present.

**Verification artifacts**:
- AC-01 → `expense-service/src/domain/events/receipt-generated.event.spec.ts::serialises ADR-003 envelope with receiptNumber`
  (unit) — Must fail if: `eventId` or `data.receiptNumber` is missing
- AC-02 → `expense-service/src/domain/events/expense-recorded.event.spec.ts::data contains status`
  (unit) — Must fail if: `data.status` is absent

---

### T05: TypeORM entities and migrations (4 tables)

**Files affected**:
- `expense-service/src/infrastructure/entities/receipt.entity.ts`
- `expense-service/src/infrastructure/entities/expense.entity.ts`
- `expense-service/src/infrastructure/entities/expense-report.entity.ts`
- `expense-service/src/infrastructure/entities/processed-event.entity.ts`
- `expense-service/src/infrastructure/migrations/YYYYMMDD_create_expense_tables.ts`
- `expense-service/src/infrastructure/typeorm-data-source.ts`

**Description**:
TypeORM entities must mirror the schema in `design.md`.

- `ReceiptEntity`: columns mirror `receipts` table; `@Column({ unique: true })` on
  `receiptNumber` and `bookingId`.
- `ExpenseEntity`: `@Column({ unique: true })` on `bookingId`.
- `ExpenseReportEntity`: `payload` as `jsonb`.
- `ProcessedEventEntity`: `eventId` is `@PrimaryColumn()` (not `@PrimaryGeneratedColumn()`).

TypeORM DataSource must include the query timeout configuration (ADR-008):
```typescript
extra: {
  statement_timeout: 5000,   // PostgreSQL server-side query kill
  query_timeout: 5000,       // node-postgres client-side timeout
}
```

Migration creates all four tables in the correct order.

**Acceptance criteria**:
- AC-01: Migration runs without error against a fresh PostgreSQL database.
- AC-02: `ProcessedEventEntity` has `eventId` as `@PrimaryColumn` (string, no auto-generate).
- AC-03: `ReceiptEntity` has `@Column({ unique: true })` on `receipt_number`.

**Verification artifacts**:
- AC-01 → `expense-service/src/infrastructure/migrations/migration.integration.spec.ts::migration runs without error`
  (integration — Testcontainers) — Must fail if: SQL has syntax error
- AC-02 → `expense-service/src/infrastructure/entities/processed-event.entity.spec.ts::eventId is PrimaryColumn`
  (unit — metadata reflection) — Must fail if: `@PrimaryGeneratedColumn()` is used instead
- AC-03 → `expense-service/src/infrastructure/entities/receipt.entity.spec.ts::receiptNumber is unique`
  (unit) — Must fail if: `unique: true` is missing

---

### T06: Infrastructure — ReceiptRepository and ExpenseRepository

**Files affected**:
- `expense-service/src/infrastructure/repositories/receipt.repository.ts`
- `expense-service/src/infrastructure/repositories/expense.repository.ts`
- `expense-service/src/infrastructure/repositories/processed-event.repository.ts`

**Description**:

`ReceiptRepository`:
- `save(receipt: Receipt, em?: EntityManager): Promise<void>`
- `findById(id: string): Promise<Receipt | null>`
- `findByBookingId(bookingId: string): Promise<Receipt | null>`
- `findByTravelerId(travelerId: string): Promise<Receipt[]>`

`ExpenseRepository`:
- `save(expense: Expense, em?: EntityManager): Promise<void>`
- `findByTravelerId(travelerId: string, startDate: Date, endDate: Date): Promise<Expense[]>`
- `findByBookingId(bookingId: string): Promise<Expense | null>`
- `findAll(startDate: Date, endDate: Date): Promise<Expense[]>`

`ProcessedEventRepository`:
- `exists(eventId: string): Promise<boolean>`
- `save(eventId: string, eventType: string, em?: EntityManager): Promise<void>`

The optional `EntityManager` parameter allows repositories to participate in
the consumer's wrapping transaction (see T07).

Repositories are excluded from coverage via jest config glob.

**Acceptance criteria**:
- AC-01: `ReceiptRepository.findById` returns `null` (not throws) when not found.
- AC-02: `ProcessedEventRepository.exists` returns `true` when `eventId` is present.
- AC-03: `ExpenseRepository.findByTravelerId` filters correctly by `travelerId` and date range.

**Verification artifacts**:
- AC-01 → `expense-service/src/infrastructure/repositories/receipt.repository.integration.spec.ts::findById returns null when not found`
  (integration — Testcontainers) — Must fail if: repository throws instead of returning null
- AC-02 → `::processedEvent.exists returns true for known eventId`
  (integration) — Must fail if: PK lookup returns false for existing record
- AC-03 → `::findByTravelerId filters by date range`
  (integration) — Must fail if: date range filter is not applied

---

### T08: Infrastructure — Kafka event publisher (expense-events)

**Files affected**:
- `expense-service/src/infrastructure/kafka/expense-event.publisher.ts`

**Description**:
`ExpenseEventPublisher` injects `ClientKafka` (from `@nestjs/microservices`)
and publishes to `expense-events`.

```typescript
class ExpenseEventPublisher {
  async publishReceiptGenerated(event: ReceiptGeneratedEvent): Promise<void>
  async publishExpenseRecorded(event: ExpenseRecordedEvent): Promise<void>
}
```

Each method sends `{ topic: 'expense-events', messages: [{ key: aggregateId, value: JSON.stringify(envelope) }] }`.
On Kafka error: log ERROR with `correlationId` and do NOT rethrow
(publish is best-effort per PROJECT.md §6).

Increments `kafka_messages_produced_total{topic="expense-events"}` on each
successful publish.

**Kafka topic setup**: Ensure `expense-events` topic is added to
`docker-compose.yml` `KAFKA_CREATE_TOPICS`. Register in `docs/contracts/CONTRACTS.md`.

**Acceptance criteria**:
- AC-01: `publishReceiptGenerated` sends to topic `expense-events` with key = `event.aggregateId`.
- AC-02: Published message body has all ADR-003 envelope fields including `data.receiptNumber`.
- AC-03: Kafka error is logged but NOT rethrown (best-effort).
- AC-04: `kafka_messages_produced_total{topic="expense-events"}` is incremented on success.

**Verification artifacts**:
- AC-01 → `expense-service/src/infrastructure/kafka/expense-event.publisher.spec.ts::sends to expense-events with aggregateId key`
  (unit) — Must fail if: topic name is wrong or key omitted
- AC-02 → `::ReceiptGenerated message has receiptNumber in data`
  (unit) — Must fail if: `data.receiptNumber` is missing
- AC-03 → `::Kafka error is swallowed after logging`
  (unit) — Must fail if: error is rethrown to caller
- AC-04 → `::increments kafka_messages_produced_total on success`
  (unit — `prom.register.clear()` in beforeEach) — Must fail if: counter not incremented

---

### T09: Application — DTOs and mappers

**Files affected**:
- `expense-service/src/application/dtos/receipt-response.dto.ts`
- `expense-service/src/application/dtos/expense-response.dto.ts`
- `expense-service/src/application/dtos/expense-query.dto.ts`
- `expense-service/src/application/dtos/expense-summary.dto.ts`
- `expense-service/src/application/dtos/category-response.dto.ts`
- `expense-service/src/application/mappers/receipt.mapper.ts`
- `expense-service/src/application/mappers/expense.mapper.ts`

**Description**:
`ReceiptResponseDto`: `id`, `receiptNumber`, `bookingId`, `travelerId`,
`travelerName`, `travelerEmail`, `amount`, `currency`, `origin`,
`destination`, `departureDate`, `status`, `generatedAt`, `voidedAt?`.
Pagination wrapper: `{ receipts: ReceiptResponseDto[]; pagination: PaginationDto }`.

`PaginationDto`: `{ total: number; page: number; limit: number; totalPages: number }`.

`ExpenseResponseDto`: `id`, `bookingId`, `receiptId`, `travelerId`,
`travelerName`, `amount`, `currency`, `category`, `description`,
`expenseDate`, `status`, `cancelledAt?`.

`ExpenseQueryDto` (query params): `startDate` (ISO date, required),
`endDate` (ISO date, required), `travelerId?` (UUID, optional — used by
MANAGER/ADMIN), `page?` (default 1), `limit?` (default 20).

`ExpenseSummaryDto`: `fiscalYear`, `totalExpenses`, `totalCount`,
`byMonth: { month: string; amount: number; count: number }[]`,
`byCategory: Record<string, number>`.
(Matches OpenAPI `ExpenseSummary` schema — `byQuarter` is NOT in scope for v1.)

**`CategoryResponseDto`** (per OpenAPI `/categories` schema):
```typescript
class CategoryResponseDto {
  id: string;        // e.g. "flight"
  name: string;      // e.g. "Flight"
  description: string;
  active: boolean;   // always true in v1
}
```

`ReceiptMapper.toDto(receipt: Receipt): ReceiptResponseDto`.
`ExpenseMapper.toDto(expense: Expense): ExpenseResponseDto`.
`ExpenseMapper.toCsv(expenses: Expense[]): string` — CSV with header row.

**Acceptance criteria**:
- AC-01: `ExpenseQueryDto` fails validation when `startDate` is missing.
- AC-02: `ReceiptMapper.toDto` maps all required fields including `receiptNumber`.
- AC-03: `ExpenseMapper.toCsv` returns a string with a header row as the first line.
- AC-04: `CategoryResponseDto` has `id`, `name`, `description`, `active` fields
  (matching OpenAPI `/categories` response schema).

**Verification artifacts**:
- AC-01 → `expense-service/src/application/dtos/expense-query.dto.spec.ts::fails when startDate missing`
  (unit) — Must fail if: `@IsDateString()` or `@IsNotEmpty()` is missing on `startDate`
- AC-02 → `expense-service/src/application/mappers/receipt.mapper.spec.ts::maps all fields`
  (unit) — Must fail if: `receiptNumber` is absent from DTO
- AC-03 → `expense-service/src/application/mappers/expense.mapper.spec.ts::toCsv has header row`
  (unit) — Must fail if: first line is data instead of header
- AC-04 → `expense-service/src/application/dtos/category-response.dto.spec.ts::has id name description active`
  (unit — property check) — Must fail if: any of the four fields is missing

---

### T10: Application — GenerateReceiptUseCase  [Idempotency]

**Files affected**:
- `expense-service/src/application/use-cases/generate-receipt.use-case.ts`

**Description**:
```typescript
class GenerateReceiptUseCase {
  async execute(
    data: BookingConfirmedData,
    correlationId: string,
    em: EntityManager,          // ← passed in from consumer's transaction
  ): Promise<{ receipt: Receipt; expense: Expense }>
}
```

The `EntityManager` parameter is mandatory — the use case must use it for
all DB writes so they participate in the caller's (T07 consumer) transaction.

Flow:
1. Generate `receiptNumber`: `RCP-{YEAR}-{NNNNNN}` (zero-padded 6-digit count
   of rows in `receipts` table + 1, queried via `em`).
2. Create `Receipt` aggregate via `Receipt.create()`.
3. Create `Expense` aggregate via `Expense.create()` linked to the receipt.
4. Persist both via `ReceiptRepository.save(receipt, em)` and
   `ExpenseRepository.save(expense, em)`.
5. Return `{ receipt, expense }`.

The `processed_events` insert is handled by the consumer (T07) in the same
`EntityManager` transaction.

**Acceptance criteria**:
- AC-01: Returns `receipt` with `status=ACTIVE` and a non-empty `receiptNumber`.
- AC-02: Returns `expense` with `status=ACTIVE`, `category=FLIGHT`, linked `receiptId`.
- AC-03: `receiptNumber` follows the `RCP-YYYY-NNNNNN` pattern.

**Verification artifacts**:
- AC-01 → `expense-service/src/application/use-cases/generate-receipt.use-case.spec.ts::returns ACTIVE receipt`
  (unit — repos mocked; `em` passed as `{} as EntityManager`) — Must fail if: receipt status is not `ACTIVE`
- AC-02 → `::expense is ACTIVE with FLIGHT category and receiptId`
  (unit) — Must fail if: `receiptId` is not set or category is wrong
- AC-03 → `::receiptNumber matches RCP-YYYY-NNNNNN pattern`
  (unit — mock `em.count()` to return a fixed sequence number, e.g. 0 → `RCP-2026-000001`)
  — Must fail if: pattern regex does not match

---

### T11: Application — VoidReceiptUseCase

**Files affected**:
- `expense-service/src/application/use-cases/void-receipt.use-case.ts`

**Description**:
```typescript
class VoidReceiptUseCase {
  async execute(
    bookingId: string,
    correlationId: string,
    em: EntityManager,          // ← passed in from consumer's transaction
  ): Promise<void>
}
```

The `EntityManager` parameter is mandatory — the use case must use it for
all DB writes so they participate in the caller's (T07 consumer) transaction.

Flow:
1. `ReceiptRepository.findByBookingId(bookingId)` — if `null`, return (no-op).
2. Call `receipt.void(new Date())`.
3. `ReceiptRepository.save(receipt, em)`.
4. `ExpenseRepository.findByBookingId(bookingId)` — if found, call
   `expense.cancel(new Date())`, then `ExpenseRepository.save(expense, em)`.

**Acceptance criteria**:
- AC-01: Receipt status transitions to `VOIDED` and `voidedAt` is set.
- AC-02: Associated expense status transitions to `CANCELLED`.
- AC-03: No-op when `findByBookingId` returns `null` for the receipt.

**Verification artifacts**:
- AC-01 → `expense-service/src/application/use-cases/void-receipt.use-case.spec.ts::voids receipt`
  (unit — repos mocked; `em` passed as `{} as EntityManager`) — Must fail if: `receipt.void()` is not called
- AC-02 → `::cancels associated expense`
  (unit) — Must fail if: `expense.cancel()` is not called
- AC-03 → `::no-op when receipt not found`
  (unit) — Must fail if: exception is thrown when receipt is null

---

### T07: Infrastructure — Kafka event consumer (booking-events)

> **Must be implemented after T10 and T11** (consumer imports use-case classes).

**Files affected**:
- `expense-service/src/infrastructure/kafka/booking-event.consumer.ts`

**Description**:
`BookingEventConsumer` uses `@MessagePattern('booking-events')` (NestJS
microservices). The handler must resolve the event type from the message
key or `eventType` field in the payload.

**Transaction pattern** — use `dataSource.transaction()`:
```typescript
await this.dataSource.transaction(async (em) => {
  await this.generateReceiptUseCase.execute(data, correlationId, em);
  await this.processedEventRepo.save(eventId, eventType, em);
});
```
All writes (receipt, expense, processed_events) execute inside one atomic
transaction. If the transaction throws, it rolls back completely and the
Kafka offset is NOT committed (Kafka will redeliver).

**BookingConfirmed** handler:
1. Check `ProcessedEventRepository.exists(eventId)` — if `true`, return (ack silently); increment `expense_events_processed_total{event_type="BookingConfirmed", outcome="duplicate"}`.
2. `await dataSource.transaction(async (em) => { generateReceiptUseCase.execute(data, correlationId, em); processedEventRepo.save(eventId, eventType, em); })`.
3. Publish `ReceiptGenerated` + `ExpenseRecorded` to `expense-events` (best-effort, do not block).
4. Increment `expense_events_processed_total{event_type="BookingConfirmed", outcome="success"}`.
5. Return (NestJS microservices acks automatically on return).

**BookingCancelled** handler:
1. Check `ProcessedEventRepository.exists(eventId)` — if `true`, return.
2. `await dataSource.transaction(async (em) => { voidReceiptUseCase.execute(bookingId, correlationId, em); processedEventRepo.save(eventId, eventType, em); })`.
3. If a receipt existed (void happened), publish `ExpenseRecorded(status=CANCELLED)`.
4. Return.

**Error handling**:
- **Transient DB error**: transaction throws → do NOT return → NestJS microservice
  framework does NOT ack → Kafka redelivers. Log ERROR with `bookingId`,
  `eventId`, `correlationId`.
- **Poison pill (missing required field)**: catch `TypeError`/validation error,
  log ERROR, return (ack) to prevent partition block.
- **Duplicate key on `processed_events` PK** (race condition): catch unique
  constraint error, treat as duplicate — log INFO, return (ack).

**Acceptance criteria**:
- AC-01: `BookingConfirmed` message triggers `GenerateReceiptUseCase.execute()`.
- AC-02: Duplicate `BookingConfirmed` (eventId already in `processed_events`) is a no-op.
- AC-03: `BookingCancelled` message triggers `VoidReceiptUseCase.execute()`.
- AC-04: Duplicate `BookingCancelled` is a no-op.
- AC-05: Missing required field in event payload logs ERROR and returns (acks).
- AC-06: Transient DB error does NOT return — exception propagates so offset is not committed.

**Verification artifacts**:
- AC-01 → `expense-service/src/infrastructure/kafka/booking-event.consumer.spec.ts::BookingConfirmed calls GenerateReceiptUseCase`
  (unit — use case mocked, dataSource.transaction stubbed to call callback) — Must fail if: use case is not called
- AC-02 → `::duplicate BookingConfirmed is no-op`
  (unit) — Must fail if: `GenerateReceiptUseCase` is called when `eventId` already exists
- AC-03 → `::BookingCancelled calls VoidReceiptUseCase`
  (unit) — Must fail if: `VoidReceiptUseCase` is not called
- AC-04 → `::duplicate BookingCancelled is no-op`
  (unit) — Must fail if: use case is called on duplicate event
- AC-05 → `::missing payload field logs ERROR and returns`
  (unit — Winston mock) — Must fail if: exception propagates instead of being swallowed
- AC-06 → `::transient DB error propagates (no ack)`
  (unit — `dataSource.transaction` throws) — Must fail if: error is caught and return is called

---

### T12: Application — ExpenseQueryService

**Files affected**:
- `expense-service/src/application/services/expense-query.service.ts`

**Description**:
```typescript
class ExpenseQueryService {
  async getReceipts(travelerId: string, role: string): Promise<{ receipts: ReceiptResponseDto[]; pagination: PaginationDto }>
  async getReceiptById(id: string, requestingTravelerId: string, role: string): Promise<ReceiptResponseDto>
  async getExpenses(query: ExpenseQueryDto, travelerId: string, role: string): Promise<{ expenses: ExpenseResponseDto[]; summary: { totalAmount: number; count: number } }>
  async getExpenseSummary(fiscalYear: number, travelerId: string, role: string): Promise<ExpenseSummaryDto>
  async exportExpenses(query: ExpenseQueryDto, travelerId: string, role: string): Promise<string>
  async getCategories(): Promise<CategoryResponseDto[]>
}
```

Role scoping:
- `EMPLOYEE`: `travelerId` is always the JWT `sub`; cannot access records for other travelers.
  `getReceiptById` throws `ForbiddenException` when `receipt.travelerId !== requestingTravelerId`.
- `MANAGER` / `ADMIN`: can supply any `travelerId` or omit it for all records.

`getReceiptById` throws `NotFoundException` when receipt does not exist.
`getCategories` returns:
```typescript
[
  { id: 'flight',     name: 'Flight',     description: 'Airfare expenses',      active: true },
  { id: 'hotel',      name: 'Hotel',      description: 'Accommodation expenses', active: true },
  { id: 'car-rental', name: 'Car Rental', description: 'Vehicle rental',         active: true },
  { id: 'meal',       name: 'Meal',       description: 'Meal and food expenses', active: true },
  { id: 'other',      name: 'Other',      description: 'Other business expenses',active: true },
]
```
`exportExpenses` calls `ExpenseMapper.toCsv()`.
`getExpenseSummary` returns `byMonth` and `byCategory` (not `byQuarter`),
matching the OpenAPI `ExpenseSummary` schema.

**Acceptance criteria**:
- AC-01: `getReceiptById` throws `NotFoundException` when receipt does not exist.
- AC-02: `getReceiptById` throws `ForbiddenException` when EMPLOYEE requests another traveler's receipt.
- AC-03: `getExpenses` with EMPLOYEE role only returns expenses for the JWT's `travelerId`.
- AC-04: `getExpenseSummary` returns `byMonth` array and `byCategory` object.
- AC-05: `exportExpenses` returns a string starting with the CSV header row.
- AC-06: `getCategories` returns exactly 5 `CategoryResponseDto` objects.

**Verification artifacts**:
- AC-01 → `expense-service/src/application/services/expense-query.service.spec.ts::getReceiptById throws NotFoundException`
  (unit) — Must fail if: `null` from repo is not mapped to `NotFoundException`
- AC-02 → `::getReceiptById throws ForbiddenException for wrong traveler`
  (unit) — Must fail if: ownership check is absent
- AC-03 → `::getExpenses EMPLOYEE scoped to own travelerId`
  (unit) — Must fail if: EMPLOYEE can query other travelers' expenses
- AC-04 → `::getExpenseSummary returns byMonth and byCategory`
  (unit) — Must fail if: `byMonth` is absent or `byQuarter` is returned instead
- AC-05 → `::exportExpenses returns CSV with header`
  (unit) — Must fail if: first line of output is not a header
- AC-06 → `::getCategories returns 5 CategoryResponseDto items`
  (unit) — Must fail if: list length is not 5 or any object lacks `id`/`name`/`description`/`active`

---

### T13: Presentation — ReceiptController

**Files affected**:
- `expense-service/src/presentation/controllers/receipt.controller.ts`

**Description**:
Routes per `openapi-expense-service.yaml`:
- `GET /receipts` → `ExpenseQueryService.getReceipts(travelerId, role)`; 200
- `GET /receipts/:id` → `ExpenseQueryService.getReceiptById(id, travelerId, role)`; 200

Both routes: `@UseGuards(JwtAuthGuard)`.
Controller extracts `travelerId` from JWT payload `sub` and `role` from JWT claims.
`X-Correlation-ID` header extracted (defaults to `generateUuid()` if absent).
Response for `GET /receipts`: `{ receipts: [...], pagination: { total, page, limit, totalPages } }`.

**Acceptance criteria**:
- AC-01: `GET /receipts` returns 200 with `receipts` array **and** `pagination` object.
- AC-02: `GET /receipts` without JWT returns 401.
- AC-03: `GET /receipts/:id` returns 404 when receipt does not exist.
- AC-04: `X-Correlation-ID` header is forwarded to the query service.
- AC-05: `GET /receipts/:id` returns 403 when EMPLOYEE requests another traveler's receipt.

**Verification artifacts**:
- AC-01 → `expense-service/src/presentation/controllers/receipt.controller.spec.ts::GET /receipts returns 200 with pagination`
  (unit — service mocked) — Must fail if: `pagination` field is absent from response body
- AC-02 → `::GET /receipts returns 401 without JWT`
  (unit — guard not overridden) — Must fail if: `JwtAuthGuard` is not applied
- AC-03 → `::GET /receipts/:id returns 404 when not found`
  (unit) — Must fail if: `NotFoundException` is not propagated
- AC-04 → `::correlationId forwarded from header`
  (unit) — Must fail if: header is not extracted
- AC-05 → `::GET /receipts/:id returns 403 for wrong traveler`
  (unit) — Must fail if: `ForbiddenException` is not mapped to 403

---

### T14: Presentation — ExpenseController

**Files affected**:
- `expense-service/src/presentation/controllers/expense.controller.ts`

**Description**:
Routes per `openapi-expense-service.yaml`:
- `GET /expenses` → `ExpenseQueryService.getExpenses(query, travelerId, role)`; 200
- `GET /expenses/summary` → `ExpenseQueryService.getExpenseSummary(fiscalYear, travelerId, role)`; 200
- `GET /expenses/export` → `ExpenseQueryService.exportExpenses(query, travelerId, role)`; 200 (`text/csv`)
- `GET /categories` → `ExpenseQueryService.getCategories()`; 200

**All four routes** use `@UseGuards(JwtAuthGuard)` (aligns with OpenAPI `bearerAuth`
on all paths). Unauthenticated requests receive 401 on all routes including
`/categories`.

`GET /expenses/export` sets `Content-Type: text/csv` and
`Content-Disposition: attachment; filename="expenses.csv"` on the response.

**Acceptance criteria**:
- AC-01: `GET /expenses` returns 400 when `startDate` is missing.
- AC-02: `GET /expenses/export` sets `Content-Type: text/csv`.
- AC-03: `GET /categories` returns 200 with an array of `CategoryResponseDto` objects
  when a valid JWT is provided.
- AC-04: `GET /expenses` returns 401 without a JWT.
- AC-05: `GET /categories` returns 401 without a JWT.

**Verification artifacts**:
- AC-01 → `expense-service/src/presentation/controllers/expense.controller.spec.ts::GET /expenses returns 400 without startDate`
  (unit) — Must fail if: `ValidationPipe` does not reject missing `startDate`
- AC-02 → `::GET /expenses/export sets Content-Type text/csv`
  (unit) — Must fail if: response header is not set
- AC-03 → `::GET /categories returns CategoryResponseDto array`
  (unit — mock returns 5 items) — Must fail if: items are plain strings instead of objects
- AC-04 → `::GET /expenses returns 401 without JWT`
  (unit) — Must fail if: `JwtAuthGuard` is not applied
- AC-05 → `::GET /categories returns 401 without JWT`
  (unit — guard not overridden) — Must fail if: `JwtAuthGuard` is not applied to categories route

---

### T15: Presentation — HttpExceptionFilter, ValidationPipe, Health/Ready endpoints

**Files affected**:
- `expense-service/src/presentation/filters/http-exception.filter.ts`
- `expense-service/src/presentation/controllers/health.controller.ts`
- `expense-service/src/main.ts` (global pipe + filter registration)

**Description**:
Mirror the pattern from `booking-service`:
- `HttpExceptionFilter` returns `{ error, message, details }` for all HTTP exceptions.
- `ValidationPipe`: `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.
- `GET /health` → `{ status: "healthy" }` (no auth).
- `GET /ready` → SELECT 1 on DB; returns `{ status: "ready" }` or 503.

**Acceptance criteria**:
- AC-01: `HttpExceptionFilter` returns `{ error, message, details }` for a 404 exception.
- AC-02: `GET /health` returns 200 without JWT.
- AC-03: `GET /ready` returns 503 when DB is unavailable.

**Verification artifacts**:
- AC-01 → `expense-service/src/presentation/filters/http-exception.filter.spec.ts::maps NotFoundException to 404 shape`
  (unit) — Must fail if: default NestJS error body is returned
- AC-02 → `expense-service/src/presentation/controllers/health.controller.spec.ts::GET /health returns 200`
  (unit) — Must fail if: `JwtAuthGuard` is applied to health
- AC-03 → `::GET /ready returns 503 when DB down`
  (unit) — Must fail if: DB error is not caught

---

### T16: Observability instrumentation

**Files affected**:
- `expense-service/src/infrastructure/metrics/expense-metrics.service.ts`
- `expense-service/src/presentation/controllers/health.controller.ts` (add `/metrics`)

**Description**:
`ExpenseMetricsService` initialises all `prom-client` metrics:
- `http_requests_total` (Counter, labels: method, route, status_code)
- `http_request_duration_seconds` (Histogram, labels: method, route)
- `receipts_generated_total` (Counter)
- `receipts_voided_total` (Counter)
- `expense_events_processed_total` (Counter, labels: `event_type`, `outcome`)
- `kafka_messages_produced_total` (Counter, label: `topic`) — required per ADR-007
- `kafka_consumer_lag` (Gauge, labels: `topic`, `group`) — required per ADR-007;
  updated by the Kafka consumer on each message poll (approximate from
  `highWatermark - consumerOffset` if accessible, or via a periodic admin client
  query — expose as 0 when unavailable rather than omitting the gauge)

`GET /metrics`: unauthenticated; returns `prom-client` text format.
All specs that instantiate `ExpenseMetricsService` call `prom.register.clear()`
in `beforeEach`.

Winston JSON logs must include `correlationId` in every log line.

**Acceptance criteria**:
- AC-01: `receipts_generated_total` increments after `GenerateReceiptUseCase.execute()`.
- AC-02: `expense_events_processed_total{event_type="BookingConfirmed", outcome="duplicate"}` increments on duplicate event.
- AC-03: `GET /metrics` returns 200 with `Content-Type: text/plain`.
- AC-04: `kafka_messages_produced_total{topic="expense-events"}` gauge is registered
  and increments when publisher sends a message.

**Verification artifacts**:
- AC-01 → `expense-service/src/infrastructure/metrics/expense-metrics.service.spec.ts::increments receipts_generated_total`
  (unit — `prom.register.clear()` in beforeEach) — Must fail if: counter not incremented
- AC-02 → `::increments processed_total with duplicate outcome`
  (unit) — Must fail if: duplicate label is not applied
- AC-03 → `expense-service/src/presentation/controllers/health.controller.spec.ts::GET /metrics returns 200`
  (unit) — Must fail if: metrics endpoint is missing
- AC-04 → `expense-service/src/infrastructure/kafka/expense-event.publisher.spec.ts::increments kafka_messages_produced_total`
  (unit — `prom.register.clear()` in beforeEach) — Must fail if: counter not registered or not incremented

---

### T17: Unit tests (≥ 80% branch coverage)

**Files affected**:
- All `*.spec.ts` files across the service (added or extended in T02–T16).

**Description**:
Run `npm run test:cov` inside `expense-service`. Review the coverage report
and add branch-covering tests until `jest --coverage` reports ≥ 80% branches
across all included files.

Key gaps to anticipate (based on booking-service experience):
- Guard branches in aggregate state machines (T02, T03).
- Duplicate-event path in consumer (T07 AC-02, AC-04).
- Transient DB error propagation path in consumer (T07 AC-06).
- Poison-pill (missing field) path in consumer (T07 AC-05).
- EMPLOYEE vs MANAGER/ADMIN role fork in `ExpenseQueryService` (T12).
- `null`-receipt guard in `VoidReceiptUseCase` (T11 AC-03).
- `voidedAt?` / `cancelledAt?` optional field in mappers (T09).
- `HttpExceptionFilter` — string-response `HttpException` AND plain `Error`.
- `JwtAuthGuard` — missing `Authorization` header AND malformed token.
- `GET /categories` — 401 without JWT (T14 AC-05).
- `ForbiddenException` in `getReceiptById` (T12 AC-02, T13 AC-05).

**Acceptance criteria**:
- AC-01: `npm run test:cov` reports branch coverage ≥ 80% for all included files.
- AC-02: All test suites pass (0 failures).

**Verification artifacts**:
- AC-01 → `jest --coverage` output; threshold enforced in `jest.config.js`
  (thresholds block) — Must fail if: branch coverage drops below 80%
- AC-02 → `jest` exit code 0 — Must fail if: any test is failing

---

### T18: Integration tests (controller + DB + Kafka consumer)

**Files affected**:
- `expense-service/src/presentation/controllers/receipt.controller.integration.spec.ts`
- `expense-service/src/presentation/controllers/expense.controller.integration.spec.ts`
- `expense-service/src/infrastructure/kafka/booking-event.consumer.integration.spec.ts`

**Description**:
Integration tests use Testcontainers (PostgreSQL) and `@nestjs/testing`
`Test.createTestingModule` with real TypeORM. Kafka producer is mocked.

**HTTP controller tests** (existing scenarios):
- `GET /receipts` with seeded receipt → returns receipt and pagination.
- `GET /receipts/:id` for unknown ID → 404.
- `GET /expenses` with seeded expenses → returns filtered list with `summary.totalAmount`.
- `GET /expenses/export` → returns CSV string.

**Kafka consumer idempotency test** (new — required per Dev reviewer finding):
- Seed an empty `expense-db` via Testcontainers.
- Call the consumer handler twice with the same `BookingConfirmed` event (same `eventId`).
- Assert: exactly **one** row in `receipts` and exactly **one** row in `processed_events`.
- Assert: on the second call, the consumer returns without error (acks silently).

**Acceptance criteria**:
- AC-01: `GET /receipts` returns seeded receipt in the list with `pagination` field.
- AC-02: `GET /receipts/:id` with unknown ID returns 404.
- AC-03: `GET /expenses` returns correct `summary.totalAmount` for seeded data.
- AC-04: Calling the `BookingConfirmed` consumer handler twice with the same
  `eventId` results in exactly one row in `receipts` and one row in
  `processed_events`; the second call does not throw.

**Verification artifacts**:
- AC-01 → `expense-service/src/presentation/controllers/receipt.controller.integration.spec.ts::GET /receipts returns seeded receipt with pagination`
  (integration) — Must fail if: `pagination` field is absent or repository query fails
- AC-02 → `::GET /receipts/:id returns 404 for unknown`
  (integration) — Must fail if: 404 is not returned on missing record
- AC-03 → `::GET /expenses summary.totalAmount matches seed`
  (integration) — Must fail if: aggregation is incorrect
- AC-04 → `expense-service/src/infrastructure/kafka/booking-event.consumer.integration.spec.ts::duplicate BookingConfirmed produces exactly one receipt`
  (integration — Testcontainers PostgreSQL) — Must fail if: second handler call inserts a duplicate receipt row or throws

---

### T19: Contract test (Pact — BookingConfirmed / BookingCancelled consumer)

**Files affected**:
- `expense-service/src/contract/__pact_stub__.js`
- `expense-service/src/contract/booking-events.pact.spec.ts`

**Description**:
Mirrors the pattern from `booking-service/src/contract/booking-events.pact.spec.ts`.
`__pact_stub__.js` stubs `@pact-foundation/pact` (same stub as booking-service).
`moduleNameMapper` in `jest.config.js` maps `@pact-foundation/pact` to the stub.

Tests two interactions (consumer = Expense Service SM-08):

1. **BookingConfirmed** — validates:
   ```json
   {
     "eventType": "BookingConfirmed",
     "aggregateId": "<string>",
     "correlationId": "<string>",
     "data": {
       "travelerId": "<string>",
       "travelerName": "<string>",
       "travelerEmail": "<string>",
       "totalAmount": 450.00,
       "currency": "USD",
       "origin": "JFK",
       "destination": "LAX",
       "departureDate": "<string>"
     }
   }
   ```

2. **BookingCancelled** — validates:
   ```json
   {
     "eventType": "BookingCancelled",
     "aggregateId": "<string>",
     "data": { "travelerId": "<string>", "reason": "<string>" }
   }
   ```

No `finalize()` call (consistent with booking-service).

**Acceptance criteria**:
- AC-01: Pact test for `BookingConfirmed` passes with all required `data` fields validated.
- AC-02: Pact test for `BookingCancelled` passes with `data.reason` validated.
- AC-03: `asynchronousBodyHandler` validates the ADR-003 envelope shape.

**Verification artifacts**:
- AC-01 → `expense-service/src/contract/booking-events.pact.spec.ts::BookingConfirmed interaction`
  (contract) — Must fail if: `data.travelerName` or `data.totalAmount` is absent
- AC-02 → `::BookingCancelled interaction`
  (contract) — Must fail if: `data.reason` is absent
- AC-03 → `::handler validates envelope shape`
  (contract) — Must fail if: `aggregateId` is not in message body
