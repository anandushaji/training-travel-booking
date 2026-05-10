# Tasks: Traveler Profile Service (SM-03)

> Every task below MUST follow the AC Verification Policy
> (`docs/workflow/acceptance-criteria.md`): every Acceptance Criterion
> must be paired with a named, automatically executable verification
> artifact with a "Must fail if" note describing the THEN mutation it
> would detect.

---

## Implementation Checklist

- [x] T01: Bootstrap NestJS app, module structure, env config, TypeORM + PostgreSQL connection
- [x] T02: Domain layer — `Traveler` aggregate, value objects, domain events
- [x] T03: Database migration — `travelers` table with all columns, indexes, soft-delete, version column
- [x] T04: TypeORM entity + repository (`TravelerTypeOrmEntity`, `TravelerRepository`)
- [x] T05: Redis cache service (`TravelerCacheService`: get/set/invalidate, key `traveler:profile:<id>`, TTL 1h)
- [x] T06: Application use cases — `CreateTravelerUseCase`, `GetTravelerUseCase`, `GetTravelersUseCase`, `UpdateTravelerUseCase`, `DeleteTravelerUseCase`
- [x] T07: Application use cases — `GetTravelerPreferencesUseCase`, `UpdateTravelerPreferencesUseCase`, `GetAdminTravelersUseCase`
- [x] T08: HR Sync use case — `SyncTravelersUseCase` (bulk upsert, idempotent by `employeeId`, circuit breaker on SOAP stub)
- [x] T09: Kafka event publisher (`TravelerEventPublisher`, topics: `traveler.created/.updated/.deleted`)
- [x] T10: Presentation layer — controllers, DTOs, RBAC guards (all 9 endpoints)
- [x] T11: GDPR anonymisation job (scheduled cron, anonymise PII after 30 days of soft-delete)
- [x] T12: Observability instrumentation (Prometheus metrics, OpenTelemetry traces, per-pattern signals)
- [x] T13: Integration tests for all 9 endpoints (Testcontainers PostgreSQL + Redis)
- [x] T14: End-to-end wiring, smoke test, verify 80% coverage
- [x] T15: Provider-side contract tests — OpenAPI response shape validation for all 9 endpoints

---

## Task Details

---

### T01: Bootstrap NestJS App, Module Structure, Env Config, TypeORM + PostgreSQL Connection

**Files affected**:
- `traveler-service/src/main.ts`
- `traveler-service/src/traveler.module.ts`
- `traveler-service/src/app.module.ts`
- `traveler-service/src/infrastructure/config/database.config.ts`
- `traveler-service/src/infrastructure/config/env.validation.ts`
- `traveler-service/.env.example`
- `traveler-service/package.json`
- `traveler-service/tsconfig.json`

**Description**: Initialise the NestJS application on port 3003. Register `TypeOrmModule.forRootAsync` with a `DatabaseConfig` provider that reads `DATABASE_URL` from environment. Enable global validation pipe, `X-Correlation-ID` propagation via middleware, and a global `DomainExceptionFilter`. Register `KafkaModule` from `@travel/shared`. Register `ConfigModule` globally with Joi schema validation for all required env vars (`DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, `HR_SYSTEM_URL`, `HR_SYSTEM_USERNAME`, `HR_SYSTEM_PASSWORD`, `PORT`).

**Acceptance criteria**:
- AC-01: The app starts without error when all required env vars are set.
- AC-02: `GET /health` returns HTTP 200 with `{ status: "ok" }`.
- AC-03: TypeORM connects to PostgreSQL; connection pool max = 20.
- AC-04: Missing required env var causes startup to fail with a descriptive error.

**Verification artifacts**:
- AC-01 → `src/app.module.spec.ts::should bootstrap application without errors when env is valid` (unit)
  - Must fail if: required env vars are removed from `ConfigModule` Joi schema and startup does not throw.
- AC-02 → `src/presentation/controllers/health.controller.spec.ts::should return 200 with status ok` (unit)
  - Must fail if: health endpoint is removed or returns non-200.
- AC-03 → `src/infrastructure/config/database.config.spec.ts::should set pool max to 20` (unit)
  - Must fail if: pool max is set to any value other than 20.
- AC-04 → `src/infrastructure/config/env.validation.spec.ts::should throw on missing DATABASE_URL` (unit)
  - Must fail if: Joi schema does not mark `DATABASE_URL` as required.

---

### T02: Domain Layer — Traveler Aggregate, Value Objects, Domain Events

**Files affected**:
- `traveler-service/src/domain/aggregates/traveler.aggregate.ts`
- `traveler-service/src/domain/aggregates/traveler.aggregate.spec.ts`
- `traveler-service/src/domain/value-objects/traveler-id.value-object.ts`
- `traveler-service/src/domain/value-objects/email.value-object.ts`
- `traveler-service/src/domain/value-objects/email.value-object.spec.ts`
- `traveler-service/src/domain/value-objects/employee-id.value-object.ts`
- `traveler-service/src/domain/value-objects/traveler-preferences.value-object.ts`
- `traveler-service/src/domain/events/traveler-created.event.ts`
- `traveler-service/src/domain/events/traveler-updated.event.ts`
- `traveler-service/src/domain/events/traveler-deleted.event.ts`
- `traveler-service/src/domain/exceptions/traveler-not-found.exception.ts`
- `traveler-service/src/domain/exceptions/duplicate-employee-id.exception.ts`
- `traveler-service/src/domain/exceptions/duplicate-email.exception.ts`
- `traveler-service/src/domain/repositories/i-traveler.repository.ts`

**Description**: Implement the `Traveler` aggregate extending `AggregateRoot` from `@travel/shared`. Implement static factory `Traveler.create(props)` which validates invariants and emits `TravelerCreated`. Implement `update(props)`, `softDelete()`, `anonymisePii()`, `updatePreferences(prefs)` instance methods each emitting the appropriate domain event. Implement value objects `TravelerId` (wraps `TypedId`), `Email` (RFC-5322 regex validation), `EmployeeId` (non-empty, max 50 chars), `TravelerPreferences` (immutable, all fields optional with defaults). Domain events must include all ADR-003 fields (`eventId`, `eventType`, `aggregateId`, `occurredOn`, `correlationId`, `causationId`, `data`).

**Acceptance criteria**:
- AC-01: `Traveler.create` with valid props returns an aggregate with a `TravelerCreated` event in `domainEvents`.
- AC-02: `Email` value object throws `InvalidEmailException` when constructed with `"not-an-email"`.
- AC-03: `traveler.softDelete()` sets `deletedAt` and emits `TravelerDeleted`.
- AC-04: `traveler.updatePreferences(prefs)` replaces preferences immutably and emits `TravelerUpdated` with `changedFields = ["preferences"]`.
- AC-05: `Traveler.create` with a duplicate `employeeId` (enforced at repository layer — the aggregate itself does not know about other aggregates, so this AC is about the uniqueness rule being expressed as a repository-level invariant and surfaced via `DuplicateEmployeeIdException`).
- AC-06: `DuplicateEmailException` has HTTP status 409 and is caught from a DB UNIQUE constraint violation on `email` in `CreateTravelerUseCase`.

**Verification artifacts**:
- AC-01 → `src/domain/aggregates/traveler.aggregate.spec.ts::should emit TravelerCreated event on create` (unit)
  - Must fail if: `Traveler.create` does not call `this.addDomainEvent(new TravelerCreated(...))`.
- AC-02 → `src/domain/value-objects/email.value-object.spec.ts::should throw InvalidEmailException for invalid email format` (unit)
  - Must fail if: `Email` constructor does not validate format or throws a different exception type.
- AC-03 → `src/domain/aggregates/traveler.aggregate.spec.ts::should set deletedAt and emit TravelerDeleted on softDelete` (unit)
  - Must fail if: `softDelete()` does not set `this.deletedAt` or does not emit `TravelerDeleted`.
- AC-04 → `src/domain/aggregates/traveler.aggregate.spec.ts::should replace preferences and emit TravelerUpdated with changedFields preferences` (unit)
  - Must fail if: `updatePreferences` mutates the existing `TravelerPreferences` object instead of replacing it, or emits `changedFields` without `"preferences"`.
- AC-05 → `src/domain/exceptions/duplicate-employee-id.exception.spec.ts::should be instance of DomainException with statusCode 409` (unit)
  - Must fail if: `DuplicateEmployeeIdException` does not extend `DomainException` or has a different `statusCode`.
- AC-06 → `src/domain/exceptions/duplicate-email.exception.spec.ts::should be instance of DomainException with statusCode 409` (unit)
  - Must fail if: `DuplicateEmailException` does not extend `DomainException` or has a different `statusCode`.

---

### T03: Database Migration — `travelers` Table

**Files affected**:
- `traveler-service/src/infrastructure/migrations/<timestamp>-CreateTravelersTable.ts`

**Description**: Create a TypeORM migration that creates the `travelers` table with columns: `id` (uuid PK), `employee_id` (varchar 50, unique), `name` (varchar 255), `email` (varchar 320, unique), `department` (varchar 100), `role` (varchar 20, CHECK constraint), `preferences` (jsonb, default `'{}'`), `deleted_at` (timestamptz, nullable), `anonymised_at` (timestamptz, nullable), `version` (integer, default 0), `created_at` (timestamptz, default now()), `updated_at` (timestamptz, default now()). Create indexes: unique on `employee_id`, unique on `email`, partial index on `deleted_at IS NULL` for `idx_travelers_deleted_at`, index on `role`.

**Acceptance criteria**:
- AC-01: Running `npm run migration:run` applies the migration without error on a fresh PostgreSQL 15 database.
- AC-02: `employees_id` column has a UNIQUE constraint enforced at the database level.
- AC-03: `role` column has a CHECK constraint limiting values to `'EMPLOYEE'`, `'MANAGER'`, `'ADMIN'`.
- AC-04: `version` column default is 0.
- AC-05: `npm run migration:revert` removes the `travelers` table cleanly.

**Verification artifacts**:
- AC-01 → `src/infrastructure/migrations/create-travelers-table.migration.spec.ts::should apply migration without error on clean database` (integration — Testcontainers)
  - Must fail if: migration SQL has a syntax error or missing column definition.
- AC-02 → `src/infrastructure/migrations/create-travelers-table.migration.spec.ts::should enforce unique constraint on employee_id` (integration — Testcontainers)
  - Must fail if: `employee_id` unique index is not created by the migration.
- AC-03 → `src/infrastructure/migrations/create-travelers-table.migration.spec.ts::should enforce role CHECK constraint` (integration — Testcontainers)
  - Must fail if: CHECK constraint is absent and an invalid role value is accepted.
- AC-04 → `src/infrastructure/migrations/create-travelers-table.migration.spec.ts::should set version default to 0` (integration — Testcontainers)
  - Must fail if: `version` column does not have a DEFAULT of 0.
- AC-05 → `src/infrastructure/migrations/create-travelers-table.migration.spec.ts::should revert migration cleanly` (integration — Testcontainers)
  - Must fail if: `down()` migration does not drop the `travelers` table.

---

### T04: TypeORM Entity + Repository

**Files affected**:
- `traveler-service/src/infrastructure/persistence/entities/traveler.typeorm-entity.ts`
- `traveler-service/src/infrastructure/persistence/repositories/traveler.repository.ts`
- `traveler-service/src/infrastructure/persistence/repositories/traveler.repository.spec.ts`
- `traveler-service/src/application/mappers/traveler.mapper.ts`

**Description**: Implement `TravelerTypeOrmEntity` with `@Entity('travelers')`, `@Column`, `@VersionColumn`, `@Index` decorators matching the migration schema. Implement `TravelerRepository` implementing `IRepository<Traveler>` with methods: `findById(id)`, `findByEmployeeId(employeeId)`, `findAll(includeDeleted)`, `save(traveler)`, `delete(id)` (soft-delete, sets `deletedAt`). All queries for non-admin use apply `WHERE deleted_at IS NULL`. `save()` uses TypeORM `save()` which triggers optimistic lock conflict on version mismatch. Implement `TravelerMapper` with `toDomain(entity): Traveler` and `toPersistence(aggregate): TravelerTypeOrmEntity`.

**Acceptance criteria**:
- AC-01: `findById` returns `null` for a non-existent or soft-deleted traveler (when `includeDeleted = false`).
- AC-02: `save()` persists a new `Traveler` and increments `version` from 0 to 1 on the first update.
- AC-03: When the same `Traveler` record is loaded twice (both reads return `version = N`), the first `save()` succeeds and increments the row's version to `N+1`; the subsequent `save()` of the stale copy (still at `version = N`) throws TypeORM's `OptimisticLockVersionMismatchError` — confirming that the `@VersionColumn` optimistic-lock guard is in place and that no silent last-write-wins overwrite occurs.
- AC-04: `findAll(false)` excludes soft-deleted records.
- AC-05: `findAll(true)` includes soft-deleted records.

**Verification artifacts**:
- AC-01 → `src/infrastructure/persistence/repositories/traveler.repository.spec.ts::should return null for soft-deleted traveler when includeDeleted is false` (integration — Testcontainers)
  - Must fail if: repository does not apply `WHERE deleted_at IS NULL` filter.
- AC-02 → `src/infrastructure/persistence/repositories/traveler.repository.spec.ts::should increment version on first update` (integration — Testcontainers)
  - Must fail if: `@VersionColumn` is not applied to the entity or TypeORM `save()` is not used.
- AC-03 → `src/infrastructure/persistence/repositories/traveler.repository.spec.ts::should throw OptimisticLockVersionMismatchError on stale-version save` (integration — Testcontainers)
  - Test setup: insert traveler row; load the entity into `copyA` and `copyB` (both have `version = 0`); call `save(copyA)` (succeeds, DB row version = 1); call `save(copyB)` (stale, version = 0); assert `OptimisticLockVersionMismatchError` is thrown.
  - Must fail if: `@VersionColumn` is absent and the stale save silently overwrites the committed data.
- AC-04 → `src/infrastructure/persistence/repositories/traveler.repository.spec.ts::should exclude soft-deleted records from findAll when includeDeleted is false` (integration — Testcontainers)
  - Must fail if: `findAll(false)` does not filter `deleted_at IS NULL`.
- AC-05 → `src/infrastructure/persistence/repositories/traveler.repository.spec.ts::should include soft-deleted records when findAll called with includeDeleted true` (integration — Testcontainers)
  - Must fail if: `findAll(true)` still applies `deleted_at IS NULL` filter.

---

### T05: Redis Cache Service (`TravelerCacheService`)

**Files affected**:
- `traveler-service/src/infrastructure/cache/traveler-cache.service.ts`
- `traveler-service/src/infrastructure/cache/traveler-cache.service.spec.ts`

**Description**: Implement `TravelerCacheService` using `ioredis 5.x`. Methods: `get(travelerId): TravelerResponseDto | null`, `set(travelerId, dto): void`, `invalidate(travelerId): void`. Key pattern: `traveler:profile:<travelerId>`. TTL: 3600 s. On `get`, if Redis throws, catch exception, emit `warn` log, return `null` (fallback to DB). On `set`/`invalidate`, if Redis throws, catch and log `warn` (do not propagate to caller). Connect timeout: 2 s. Register as a provider in `TravelerModule`.

**Acceptance criteria**:
- AC-01: `get(id)` returns the cached `TravelerResponseDto` when the key exists.
- AC-02: `set(id, dto)` stores the key with TTL 3600 and correct key pattern `traveler:profile:<id>`.
- AC-03: `invalidate(id)` deletes the key `traveler:profile:<id>`.
- AC-04: `get(id)` returns `null` (not throws) when Redis is unavailable.
- AC-05: `set(id, dto)` does not throw when Redis is unavailable; a `warn` log is emitted.

**Verification artifacts**:
- AC-01 → `src/infrastructure/cache/traveler-cache.service.spec.ts::should return cached dto on get` (unit — mocked ioredis)
  - Must fail if: `get()` does not call `redis.get(key)` or does not deserialise the stored value.
- AC-02 → `src/infrastructure/cache/traveler-cache.service.spec.ts::should call redis.set with correct key pattern and TTL 3600` (unit — mocked ioredis)
  - Must fail if: `set()` uses a different key prefix or TTL value.
- AC-03 → `src/infrastructure/cache/traveler-cache.service.spec.ts::should call redis.del with correct key on invalidate` (unit — mocked ioredis)
  - Must fail if: `invalidate()` calls `redis.del` with an incorrect key.
- AC-04 → `src/infrastructure/cache/traveler-cache.service.spec.ts::should return null and not throw when redis get throws` (unit — mocked ioredis throws)
  - Must fail if: `get()` propagates the Redis exception instead of catching it.
- AC-05 → `src/infrastructure/cache/traveler-cache.service.spec.ts::should not throw and emit warn log when redis set throws` (unit — mocked ioredis throws)
  - Must fail if: `set()` re-throws the Redis exception.

---

### T06: Application Use Cases — CRUD (Create, Get, GetAll, Update, Delete)

**Files affected**:
- `traveler-service/src/application/use-cases/create-traveler.use-case.ts`
- `traveler-service/src/application/use-cases/create-traveler.use-case.spec.ts`
- `traveler-service/src/application/use-cases/get-traveler.use-case.ts`
- `traveler-service/src/application/use-cases/get-traveler.use-case.spec.ts`
- `traveler-service/src/application/use-cases/get-travelers.use-case.ts`
- `traveler-service/src/application/use-cases/get-travelers.use-case.spec.ts`
- `traveler-service/src/application/use-cases/update-traveler.use-case.ts`
- `traveler-service/src/application/use-cases/update-traveler.use-case.spec.ts`
- `traveler-service/src/application/use-cases/delete-traveler.use-case.ts`
- `traveler-service/src/application/use-cases/delete-traveler.use-case.spec.ts`
- `traveler-service/src/application/dto/create-traveler.dto.ts`
- `traveler-service/src/application/dto/update-traveler.dto.ts`
- `traveler-service/src/application/dto/traveler-response.dto.ts`

**Description**: Implement each use case as a single-responsibility class injected with `ITravelerRepository`, `TravelerCacheService`, and `TravelerEventPublisher`. `CreateTravelerUseCase`: check for existing `employeeId` (throws `DuplicateEmployeeIdException` on conflict), call `Traveler.create(props)`, save to repository, invalidate cache (no-op on create), publish `TravelerCreated`. `GetTravelerUseCase`: call `TravelerCacheService.get(id)` first; on miss call `repository.findById(id)` (throws `TravelerNotFoundException` if null), populate cache, return DTO. `UpdateTravelerUseCase`: load aggregate, call `traveler.update(props)`, save, invalidate cache, publish `TravelerUpdated`. `DeleteTravelerUseCase`: load aggregate, call `traveler.softDelete()`, save, invalidate cache, publish `TravelerDeleted`.

**Acceptance criteria**:
- AC-01: `CreateTravelerUseCase` throws `DuplicateEmployeeIdException` when `repository.findByEmployeeId` returns a result.
- AC-02: `GetTravelerUseCase` returns the cached DTO without calling `repository.findById` on a cache hit.
- AC-03: `GetTravelerUseCase` calls `repository.findById` on cache miss and populates cache via `TravelerCacheService.set`.
- AC-04: `GetTravelerUseCase` throws `TravelerNotFoundException` when `repository.findById` returns `null`.
- AC-05: `UpdateTravelerUseCase` calls `TravelerCacheService.invalidate` after successful `repository.save`.
- AC-06: `DeleteTravelerUseCase` calls `traveler.softDelete()` and the saved entity has `deletedAt` set.

**Verification artifacts**:
- AC-01 → `src/application/use-cases/create-traveler.use-case.spec.ts::should throw DuplicateEmployeeIdException when employeeId already exists` (unit — mocked repository)
  - Must fail if: use case does not check `repository.findByEmployeeId` before creating the aggregate.
- AC-02 → `src/application/use-cases/get-traveler.use-case.spec.ts::should return cached dto without calling repository on cache hit` (unit — mocked cache returns value)
  - Must fail if: use case always calls `repository.findById` regardless of cache result.
- AC-03 → `src/application/use-cases/get-traveler.use-case.spec.ts::should call repository and populate cache on cache miss` (unit — mocked cache returns null)
  - Must fail if: use case does not call `cacheService.set` after a cache miss.
- AC-04 → `src/application/use-cases/get-traveler.use-case.spec.ts::should throw TravelerNotFoundException when repository returns null` (unit)
  - Must fail if: use case returns `null` instead of throwing `TravelerNotFoundException`.
- AC-05 → `src/application/use-cases/update-traveler.use-case.spec.ts::should invalidate cache after repository save` (unit — mocked cache)
  - Must fail if: `cacheService.invalidate` is not called after `repository.save`.
- AC-06 → `src/application/use-cases/delete-traveler.use-case.spec.ts::should set deletedAt on soft-delete and save` (unit)
  - Must fail if: `softDelete()` is not called on the aggregate before `repository.save`.

---

### T07: Application Use Cases — Preferences + Admin List

**Files affected**:
- `traveler-service/src/application/use-cases/get-traveler-preferences.use-case.ts`
- `traveler-service/src/application/use-cases/get-traveler-preferences.use-case.spec.ts`
- `traveler-service/src/application/use-cases/update-traveler-preferences.use-case.ts`
- `traveler-service/src/application/use-cases/update-traveler-preferences.use-case.spec.ts`
- `traveler-service/src/application/use-cases/get-admin-travelers.use-case.ts`
- `traveler-service/src/application/use-cases/get-admin-travelers.use-case.spec.ts`
- `traveler-service/src/application/dto/traveler-preferences.dto.ts`
- `traveler-service/src/application/dto/admin-traveler-response.dto.ts`

**Description**: `GetTravelerPreferencesUseCase`: reuse `GetTravelerUseCase` or directly call repository/cache; return `TravelerPreferencesDto` extracted from the aggregate. `UpdateTravelerPreferencesUseCase`: load aggregate, call `traveler.updatePreferences(prefs)`, save, invalidate cache, publish `TravelerUpdated`. `GetAdminTravelersUseCase`: call `repository.findAll(includeDeleted = true)`; return `AdminTravelerResponseDto[]` which includes `deletedAt`, `anonymisedAt`, and full PII fields.

**Acceptance criteria**:
- AC-01: `UpdateTravelerPreferencesUseCase` replaces preferences and invalidates the cache key.
- AC-02: `GetAdminTravelersUseCase` returns soft-deleted records alongside active ones.
- AC-03: `GetTravelerPreferencesUseCase` throws `TravelerNotFoundException` for a non-existent `travelerId`.

**Verification artifacts**:
- AC-01 → `src/application/use-cases/update-traveler-preferences.use-case.spec.ts::should replace preferences and invalidate cache` (unit)
  - Must fail if: `updatePreferences` is not called on the aggregate or `cacheService.invalidate` is omitted.
- AC-02 → `src/application/use-cases/get-admin-travelers.use-case.spec.ts::should return both active and soft-deleted travelers` (unit — mocked repository returns mixed list)
  - Must fail if: use case calls `repository.findAll(false)` instead of `repository.findAll(true)`.
- AC-03 → `src/application/use-cases/get-traveler-preferences.use-case.spec.ts::should throw TravelerNotFoundException for unknown id` (unit)
  - Must fail if: use case returns an empty/null preferences object instead of throwing.

---

### T08: HR Sync Use Case — `SyncTravelersUseCase` with Circuit Breaker

**Files affected**:
- `traveler-service/src/infrastructure/hr/hr-soap-client.stub.ts`
- `traveler-service/src/infrastructure/hr/hr-soap-client.stub.spec.ts`
- `traveler-service/src/application/use-cases/sync-travelers.use-case.ts`
- `traveler-service/src/application/use-cases/sync-travelers.use-case.spec.ts`
- `traveler-service/src/application/dto/sync-travelers.dto.ts`

**Description**: Implement `HrSoapClientStub` as a stub that reads from `HR_SYSTEM_URL` with Basic Auth. Wrap it with opossum circuit breaker configured: `errorThresholdPercentage: 50`, `volumeThreshold: 10`, `timeout: 30000`, `resetTimeout: 30000`. Fallback throws `HrSystemUnavailableException`. Implement `SyncTravelersUseCase`: accepts `SyncTravelersDto` (array of HR employee records), iterates records, calls `repository.findByEmployeeId(employeeId)` — if exists: call `traveler.update(props)` + save + publish `TravelerUpdated`; if not: `Traveler.create(props)` + save + publish `TravelerCreated`. Collect per-record errors; return `{ synced: N, errors: [...] }`. Apply retry policy (3×, exponential backoff) to the SOAP stub call.

**Acceptance criteria**:
- AC-01: Sync with a new `employeeId` creates a traveler and returns `{ synced: 1, errors: [] }`.
- AC-02: Sync with an existing `employeeId` updates the traveler without creating a duplicate.
- AC-03: After 10 consecutive SOAP 503 responses (60% error rate), the circuit breaker opens and `HrSystemUnavailableException` is thrown on the next call without forwarding to the SOAP stub.
- AC-04: A partial payload where one record has an invalid email returns `{ synced: N-1, errors: [{ employeeId, reason: "InvalidEmail" }] }`.
- AC-05: On a transient 503 (first attempt only), the use case retries and succeeds on the second attempt.

**Verification artifacts**:
- AC-01 → `src/application/use-cases/sync-travelers.use-case.spec.ts::should create traveler and return synced 1 for new employeeId` (unit — mocked repository)
  - Must fail if: use case calls `update` instead of `create` for a new `employeeId`.
- AC-02 → `src/application/use-cases/sync-travelers.use-case.spec.ts::should update existing traveler without creating a duplicate for known employeeId` (unit — mocked repository returns existing)
  - Must fail if: use case always calls `Traveler.create` regardless of existing record lookup.
- AC-03 → `src/infrastructure/hr/hr-soap-client.stub.spec.ts::should open circuit breaker after 10 calls with 60 percent errors` (unit — opossum with mocked SOAP)
  - Must fail if: circuit breaker threshold or volumeThreshold is not configured correctly.
- AC-04 → `src/application/use-cases/sync-travelers.use-case.spec.ts::should report per-record error for invalid email and continue syncing remaining records` (unit)
  - Must fail if: use case throws on first invalid record instead of continuing to process remaining records.
- AC-05 → `src/application/use-cases/sync-travelers.use-case.spec.ts::should retry SOAP call on transient 503 and succeed on second attempt` (unit — stub throws once then succeeds)
  - Must fail if: retry policy is not applied or the use case fails after a single transient error.

---

### T09: Kafka Event Publisher (`TravelerEventPublisher`)

**Files affected**:
- `traveler-service/src/infrastructure/kafka/traveler-event-publisher.ts`
- `traveler-service/src/infrastructure/kafka/traveler-event-publisher.spec.ts`

**Description**: Implement `TravelerEventPublisher` using `KafkaModule` from `@travel/shared`. Method `publish(event: DomainEvent): Promise<void>`. Maps domain event type to Kafka topic (`TravelerCreated` → `traveler.created`, `TravelerUpdated` → `traveler.updated`, `TravelerDeleted` → `traveler.deleted`). Message key = `aggregateId` (ensures partition ordering per traveler). Retry 3× with exponential backoff on broker errors. On exhausted retries, log `error` with full event payload and correlationId; increment `kafka_events_published_total{status="failure"}`. On success, increment `kafka_events_published_total{topic, status="success"}`.

**Acceptance criteria**:
- AC-01: Publishing `TravelerCreated` calls the Kafka producer with topic `traveler.created` and key = `travelerId`.
- AC-02: Publishing `TravelerUpdated` uses key = `travelerId` (same partition as create event).
- AC-03: On producer failure (all 3 retries exhausted), an `error` log is emitted with `eventType`, `aggregateId`, and `correlationId`.
- AC-04: `kafka_events_published_total{topic="traveler.created", status="success"}` is incremented on successful publish.

**Verification artifacts**:
- AC-01 → `src/infrastructure/kafka/traveler-event-publisher.spec.ts::should publish to traveler.created with travelerId as message key` (unit — mocked Kafka producer)
  - Must fail if: publisher sends to wrong topic or uses a different partition key.
- AC-02 → `src/infrastructure/kafka/traveler-event-publisher.spec.ts::should use travelerId as key for TravelerUpdated event` (unit)
  - Must fail if: message key is null or uses a different field.
- AC-03 → `src/infrastructure/kafka/traveler-event-publisher.spec.ts::should emit error log with eventType aggregateId and correlationId after retries exhausted` (unit — producer mock always throws)
  - Must fail if: error log is emitted without required fields or is not emitted at all.
- AC-04 → `src/infrastructure/kafka/traveler-event-publisher.spec.ts::should increment kafka_events_published_total success counter` (unit — mocked metrics)
  - Must fail if: metric counter is not called after successful publish.

---

### T10: Presentation Layer — Controllers, DTOs, RBAC Guards

**Files affected**:
- `traveler-service/src/presentation/controllers/traveler.controller.ts`
- `traveler-service/src/presentation/controllers/traveler.controller.spec.ts`
- `traveler-service/src/presentation/controllers/admin-traveler.controller.ts`
- `traveler-service/src/presentation/controllers/admin-traveler.controller.spec.ts`
- `traveler-service/src/presentation/guards/roles.guard.ts`
- `traveler-service/src/presentation/guards/roles.guard.spec.ts`
- `traveler-service/src/presentation/guards/self-or-admin.guard.ts`
- `traveler-service/src/presentation/guards/self-or-admin.guard.spec.ts`
- `traveler-service/src/presentation/decorators/roles.decorator.ts`
- `traveler-service/src/presentation/filters/domain-exception.filter.ts`

**Description**: Implement `TravelerController` with routes for 8 traveler endpoints. Implement `AdminTravelerController` with route for `GET /admin/travelers`. Apply `@UseGuards(JwtAuthGuard, RolesGuard)` and `@Roles(...)` to each route per the API contract table. `DomainExceptionFilter` maps `TravelerNotFoundException` → 404, `DuplicateEmployeeIdException` → 409, `DuplicateEmailException` → 409, `InvalidEmailException` → 400, `HrSystemUnavailableException` → 503 using the standard error response shape. Validate all incoming DTOs with `class-validator`. Propagate `X-Correlation-ID` header from request to use-case context. For `PUT /travelers/:id/preferences`, implement a `SelfOrAdminGuard` that allows MANAGER/ADMIN on any `travelerId` but restricts EMPLOYEE to their own `travelerId` only (JWT subject must equal path `:id`).

**Acceptance criteria**:
- AC-01: `POST /travelers` with role `EMPLOYEE` returns HTTP 403.
- AC-02: `DELETE /travelers/:id` with role `MANAGER` returns HTTP 403.
- AC-03: `POST /travelers` with a missing required field returns HTTP 400 with validation error details.
- AC-04: `GET /travelers/:id` for a non-existent ID returns HTTP 404 with `error = "TravelerNotFound"`.
- AC-05: `GET /admin/travelers` with role `ADMIN` returns HTTP 200.
- AC-06: `X-Correlation-ID` from the incoming request is present in the response and in all downstream use-case logs.
- AC-07: `PUT /travelers/T2/preferences` called by EMPLOYEE whose JWT subject is T1 (T1 ≠ T2) returns HTTP 403.

**Verification artifacts**:
- AC-01 → `src/presentation/controllers/traveler.controller.spec.ts::should return 403 when EMPLOYEE calls POST /travelers` (unit — mocked guard)
  - Must fail if: `@Roles('MANAGER', 'ADMIN')` is missing from the `createTraveler` route handler.
- AC-02 → `src/presentation/controllers/traveler.controller.spec.ts::should return 403 when MANAGER calls DELETE /travelers/:id` (unit — mocked guard)
  - Must fail if: `@Roles('ADMIN')` is not the sole role on the `deleteTraveler` handler.
- AC-03 → `src/presentation/controllers/traveler.controller.spec.ts::should return 400 with validation errors for missing required field` (unit — `ValidationPipe` enabled)
  - Must fail if: `ValidationPipe` is not applied globally or DTO `@IsNotEmpty()` decorators are absent.
- AC-04 → `src/presentation/controllers/traveler.controller.spec.ts::should return 404 with TravelerNotFound error for unknown id` (unit — use case throws `TravelerNotFoundException`)
  - Must fail if: `DomainExceptionFilter` does not map `TravelerNotFoundException` to 404.
- AC-05 → `src/presentation/controllers/admin-traveler.controller.spec.ts::should return 200 for GET /admin/travelers with ADMIN role` (unit)
  - Must fail if: `AdminTravelerController` applies a role guard that excludes ADMIN.
- AC-06 → `src/presentation/controllers/traveler.controller.spec.ts::should propagate X-Correlation-ID to use case context` (unit)
  - Must fail if: correlation ID middleware does not extract or forward the header.
- AC-07 → `src/presentation/controllers/traveler.controller.spec.ts::should return 403 when EMPLOYEE calls PUT /travelers/T2/preferences with subject T1` (unit — SelfOrAdminGuard)
  - Must fail if: `SelfOrAdminGuard` is absent or does not compare JWT subject with path `:id` for EMPLOYEE role.

---

### T11: GDPR Anonymisation Job

**Files affected**:
- `traveler-service/src/infrastructure/jobs/gdpr-anonymisation.job.ts`
- `traveler-service/src/infrastructure/jobs/gdpr-anonymisation.job.spec.ts`

**Description**: Implement `GdprAnonymisationJob` as a NestJS injectable decorated with `@Injectable()`. Use `@Cron('0 2 * * *')` for nightly execution at 02:00 UTC. The job queries `travelers WHERE deleted_at < NOW() - INTERVAL '30 days' AND anonymised_at IS NULL`. For each matching row, it calls `traveler.anonymisePii()` which sets `name = 'DELETED_USER_<id>'`, `email = 'deleted-<id>@anonymised.invalid'`, `anonymised_at = NOW()`. Save via repository. Log `info` for each anonymised record (travelerId only, no PII in logs). Register in `TravelerModule` with `ScheduleModule.forRoot()`.

**Acceptance criteria**:
- AC-01: Records with `deleted_at < NOW() - 30 days` and `anonymised_at IS NULL` are anonymised.
- AC-02: Records within the 30-day window are NOT anonymised.
- AC-03: `anonymised_at` is set to the current timestamp after anonymisation.
- AC-04: Anonymised `name` matches pattern `DELETED_USER_<uuid>`.
- AC-05: Anonymised `email` matches pattern `deleted-<uuid>@anonymised.invalid`.

**Verification artifacts**:
- AC-01 → `src/infrastructure/jobs/gdpr-anonymisation.job.spec.ts::should anonymise records deleted more than 30 days ago` (integration — Testcontainers)
  - Must fail if: the job's WHERE clause does not filter `deleted_at < NOW() - INTERVAL '30 days'`.
- AC-02 → `src/infrastructure/jobs/gdpr-anonymisation.job.spec.ts::should not anonymise records deleted within 30 days` (integration — Testcontainers)
  - Must fail if: job anonymises all soft-deleted records regardless of `deleted_at` age.
- AC-03 → `src/infrastructure/jobs/gdpr-anonymisation.job.spec.ts::should set anonymisedAt to current timestamp after anonymisation` (integration — Testcontainers)
  - Must fail if: `anonymised_at` is not updated by the job.
- AC-04 → `src/infrastructure/jobs/gdpr-anonymisation.job.spec.ts::should set name to DELETED_USER_<id> pattern` (unit — mocked repository)
  - Must fail if: `anonymisePii()` uses a different placeholder pattern for `name`.
- AC-05 → `src/infrastructure/jobs/gdpr-anonymisation.job.spec.ts::should set email to deleted-<id>@anonymised.invalid pattern` (unit — mocked repository)
  - Must fail if: `anonymisePii()` uses a different placeholder pattern for `email`.

---

### T12: Observability Instrumentation

**Files affected**:
- `traveler-service/src/infrastructure/observability/metrics.service.ts`
- `traveler-service/src/infrastructure/observability/metrics.service.spec.ts`
- `traveler-service/src/infrastructure/observability/tracing.module.ts`
- `traveler-service/src/infrastructure/observability/logging.service.ts`
- Updates to: `traveler-cache.service.ts`, `traveler-event-publisher.ts`, `hr-soap-client.stub.ts`, all use cases

**Description**: Implement `MetricsService` registering the following Prometheus counters/gauges/histograms via `prom-client`: `http_requests_total` (labels: method, route, status_code), `http_request_duration_seconds` (histogram, labels: method, route), `cache_hit_total` (label: entity), `cache_miss_total` (label: entity), `kafka_events_published_total` (labels: topic, status), `retry_count` (labels: operation, outcome), `circuit_state` (gauge, label: service), `circuit_breaker_errors_total` (label: service), `db_query_duration_seconds` (histogram, label: operation), `db_connections_active` (gauge). Configure `OpenTelemetryModule` with `NodeTracerProvider`, `JaegerExporter`, `HttpInstrumentation`, `PgInstrumentation`, auto-attaching `X-Correlation-ID` to every span. Instrument `TravelerCacheService` to increment `cache_hit_total`/`cache_miss_total`. Instrument `TravelerEventPublisher` to increment `kafka_events_published_total`. Instrument HR SOAP circuit breaker to emit `circuit_state` gauge on state change. Instrument retry handler to increment `retry_count`.

**Acceptance criteria**:
- AC-01: `cache_hit_total{entity="traveler"}` increments on each Redis cache hit.
- AC-02: `cache_miss_total{entity="traveler"}` increments on each Redis cache miss.
- AC-03: `kafka_events_published_total{topic, status}` increments on each Kafka publish attempt.
- AC-04: `circuit_state{service="hr-soap"}` = 1 when the circuit is OPEN; 0 when CLOSED; 0.5 when HALF-OPEN.
- AC-05: `retry_count{operation, outcome}` increments on each retry attempt.
- AC-06: `http_requests_total` and `http_request_duration_seconds` are recorded for every HTTP request.
- AC-07: Every log line includes `service = "traveler-service"` and `correlationId`.

**Verification artifacts**:
- AC-01 → `src/infrastructure/observability/metrics.service.spec.ts::should increment cache_hit_total on cache hit` (unit — mocked prom-client)
  - Must fail if: `MetricsService.incrementCacheHit` is not called from `TravelerCacheService.get` on a hit.
- AC-02 → `src/infrastructure/observability/metrics.service.spec.ts::should increment cache_miss_total on cache miss` (unit)
  - Must fail if: `MetricsService.incrementCacheMiss` is not called from `TravelerCacheService.get` on a miss.
- AC-03 → `src/infrastructure/observability/metrics.service.spec.ts::should increment kafka_events_published_total with correct topic and status` (unit — mocked counter)
  - Must fail if: publisher does not call the metrics counter with topic label.
- AC-04 → `src/infrastructure/observability/metrics.service.spec.ts::should set circuit_state gauge to 1 on circuit open` (unit — mocked opossum events)
  - Must fail if: `circuit_state` gauge is not registered on the `open` event of the opossum circuit breaker.
- AC-05 → `src/infrastructure/observability/metrics.service.spec.ts::should increment retry_count with operation and outcome labels` (unit)
  - Must fail if: retry handler does not call `metricsService.incrementRetryCount` on each retry.
- AC-06 → `src/infrastructure/observability/metrics.service.spec.ts::should record http_requests_total and http_request_duration_seconds per request` (unit — NestJS interceptor test)
  - Must fail if: HTTP metrics interceptor is not registered globally or does not observe duration.
- AC-07 → `src/infrastructure/observability/logging.service.spec.ts::should include service and correlationId in every log entry` (unit — mocked Winston logger)
  - Must fail if: Winston logger does not include `service = "traveler-service"` in the default metadata.

---

### T13: Integration Tests for All 9 Endpoints

**Files affected**:
- `traveler-service/src/presentation/controllers/traveler.controller.integration.spec.ts`
- `traveler-service/src/presentation/controllers/admin-traveler.controller.integration.spec.ts`

**Description**: Implement integration tests using Testcontainers (PostgreSQL 15 + Redis 7). Spin up real PostgreSQL and Redis instances per test suite. Run migrations before tests. Mock Kafka producer (do not require a real Kafka broker in integration tests). Mock JWT guard to inject test user context (role-specific tokens per test). Cover: all 9 endpoint happy paths, RBAC rejection (403), `TravelerNotFoundException` (404), duplicate `employeeId` (409), soft-delete + admin visibility, cache invalidation verified by checking Redis key absence after write, HR sync idempotency (run twice with same payload — record count unchanged).

**Acceptance criteria**:
- AC-01: All 9 endpoints return their documented success status codes with Testcontainers.
- AC-02: `POST /travelers` with a duplicate `employeeId` returns HTTP 409.
- AC-03: `DELETE /travelers/:id` → `GET /travelers/:id` by non-admin returns 404; `GET /admin/travelers` returns the soft-deleted record.
- AC-04: Cache key `traveler:profile:<id>` is absent in Redis after `PATCH /travelers/:id`.
- AC-05: Running `POST /travelers/sync` twice with the same payload results in exactly 1 traveler record per `employeeId`.

**Verification artifacts**:
- AC-01 → `src/presentation/controllers/traveler.controller.integration.spec.ts::should return correct status codes for all 9 endpoints` (integration — Testcontainers)
  - Must fail if: any endpoint returns an unexpected status code.
- AC-02 → `src/presentation/controllers/traveler.controller.integration.spec.ts::should return 409 on duplicate employeeId` (integration)
  - Must fail if: unique constraint on `employee_id` is absent or use case does not enforce the check.
- AC-03 → `src/presentation/controllers/traveler.controller.integration.spec.ts::should return 404 for soft-deleted traveler from non-admin and 200 from admin list` (integration)
  - Must fail if: `WHERE deleted_at IS NULL` filter is missing or admin endpoint applies the same filter.
- AC-04 → `src/presentation/controllers/traveler.controller.integration.spec.ts::should remove cache key from Redis after PATCH` (integration — Testcontainers with Redis)
  - Must fail if: `TravelerCacheService.invalidate` is not called in `UpdateTravelerUseCase`.
- AC-05 → `src/presentation/controllers/traveler.controller.integration.spec.ts::should not create duplicate records on repeated sync for same employeeId` (integration)
  - Must fail if: `SyncTravelersUseCase` uses INSERT instead of upsert.

---

### T14: End-to-End Wiring, Smoke Test, and Coverage Verification

**Files affected**:
- `traveler-service/src/traveler.module.ts` (final wiring)
- `traveler-service/jest.config.js`
- `traveler-service/jest.coverage.config.js`

**Description**: Register all providers, repositories, use cases, controllers, guards, filters, the GDPR job, observability module, and Redis/Kafka modules in `TravelerModule`. Verify that `npm run build` completes without TypeScript errors. Run `npm run test:coverage` and confirm the coverage report shows ≥ 80% for statements, branches, functions, and lines. Run a manual smoke test (or automated E2E): create a traveler → get by ID (cache miss) → get by ID again (cache hit) → patch → verify cache invalidation → delete → verify 404 → run admin list → verify soft-deleted record present. Use `jest.config.js` (not `jest.config.ts`) to avoid `ts-node` dependency — copy exact versions of `opossum`, `@opentelemetry/sdk-node`, and `prom-client` from `api-gateway/package.json`.

**Acceptance criteria**:
- AC-01: `npm run build` exits with code 0 (no TypeScript errors).
- AC-02: `npm run test:coverage` reports ≥ 80% statement coverage across the `traveler-service`.
- AC-03: The smoke-test sequence (create → get × 2 → patch → delete → admin-list) completes without errors against a Testcontainers environment.

**Verification artifacts**:
- AC-01 → CI step `build` in `.github/workflows/traveler-service.yml::TypeScript build step exits 0` (build check)
  - Must fail if: any TypeScript type error is introduced in the final wiring.
- AC-02 → `npm run test:coverage` Jest coverage report — threshold enforced in `jest.coverage.config.js` with `coverageThreshold: { global: { statements: 80 } }` (coverage gate)
  - Must fail if: coverage threshold is not set in Jest config or overall statement coverage drops below 80%.
- AC-03 → `traveler-service/src/presentation/controllers/traveler.controller.integration.spec.ts::smoke test — create get get patch delete admin-list sequence succeeds` (integration — Testcontainers)
  - Must fail if: any step in the sequence returns an unexpected status code or throws an unhandled exception.
