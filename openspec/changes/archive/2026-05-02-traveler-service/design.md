# Design: Traveler Profile Service (SM-03)

## Pattern Selection Log

| Pattern | Decision | Rationale |
|---|---|---|
| Database-per-service | Applied | Traveler service owns its own PostgreSQL schema (`travelers` table); no other service may query it directly per ADR-001 and ADR-004 |
| CQRS | Not applicable | Read model complexity does not justify a separate read store; single PostgreSQL with Redis cache-aside is sufficient for the traveler profile read workload |
| Saga (Choreography) | Not applicable | This service is not a saga coordinator; it publishes domain events that booking-service and others may react to, but no distributed transaction spans this service as initiator |
| Saga (Orchestration) | Not applicable | Same rationale as choreography; no multi-service transaction requires a saga orchestrator in this bounded context |
| Outbox | Not applicable | Outbox relay is not implemented per PROJECT.md §6; Kafka events are published directly after DB commit with at-least-once semantics; consumers deduplicate by `eventId` |
| Idempotency | Applied | `POST /travelers/sync` (HR bulk upsert) must be idempotent by `employeeId` to prevent duplicate profiles on repeated HR feed deliveries; Kafka event consumers must deduplicate by `eventId` (ADR-011) |
| Timeouts | Applied | HR SOAP client timeout 30 s (PROJECT.md §12 per-service override); Redis connect 2 s; Kafka produce 10 s; DB query 5 s (PROJECT.md §7) |
| Retries | Applied | HR SOAP calls and Kafka publish retry 3× with exponential backoff (base 200 ms, max 5 s, jitter); non-retryable on 4xx; retryable on 5xx/408 (ADR-011) |
| Circuit Breaker | Applied | HR SOAP client wrapped with opossum circuit breaker: 50% error threshold over 10 requests in 30 s window; 30 s half-open probe; fallback returns HTTP 503 with structured error body (ADR-011) |
| Bulkheads | Not applicable | Single-service context with a single external dependency (HR SOAP); circuit breaker per external system is sufficient isolation |
| Cache-aside | Applied | Traveler profiles cached in Redis (`traveler:profile:<travelerId>`, TTL 1 h); read path checks Redis first, populates on cache miss, returns cached value on hit (ADR-002, PROJECT.md §12) |
| Read-through | Not applicable | Application code manages cache population explicitly (cache-aside preferred for clarity and testability) |
| Write-through | Not applicable | Cache is invalidated on write rather than updated synchronously; write-through would create synchronous coupling between DB write and Redis write |
| Cache Invalidation | Applied | On PATCH, DELETE, and PUT-preferences, `traveler:profile:<travelerId>` is deleted from Redis immediately after the DB commit to prevent stale reads |

**Applied patterns**: Database-per-service, Idempotency, Timeouts, Retries, Circuit Breaker, Cache-aside, Cache Invalidation

**Architectural assumptions**:
- `@travel/shared` exports `AggregateRoot`, `DomainEvent`, `IRepository<T>`, `TypedId`, `KafkaModule`
- Kafka topics `traveler.created`, `traveler.updated`, `traveler.deleted` are pre-provisioned
- Redis is available at `REDIS_URL`; LRU eviction policy
- HR SOAP stub exposes a single endpoint for bulk employee data

---

## Architecture Overview

```
                        ┌─────────────────────────────────────────────────────┐
                        │              traveler-service (port 3003)           │
                        │                                                     │
  API Gateway  ─JWT──►  │  Presentation Layer (NestJS Controllers + Guards)   │
                        │            ↓             ↑                          │
                        │  Application Layer (Use Cases, DTOs, Mappers)       │
                        │            ↓             ↑                          │
                        │  Domain Layer (Traveler Aggregate, Value Objects,   │
                        │               Domain Events)                        │
                        │            ↓             ↑                          │
                        │  Infrastructure Layer                               │
                        │    ├── TravelerRepository (TypeORM + PostgreSQL)    │
                        │    ├── TravelerCacheService (ioredis + Redis)       │
                        │    ├── TravelerEventPublisher (KafkaJS)             │
                        │    ├── HrSoapClient (stub + opossum circuit breaker)│
                        │    └── GdprAnonymisationJob (@Cron)                 │
                        └─────────────────────────────────────────────────────┘
                                  │           │           │
                             PostgreSQL     Redis       Kafka
                             (travelers)  (cache)  (traveler.*)
                                                            │
                                              booking-service, policy-service, ...
```

**Data flow — read path**:
1. Request arrives at API Gateway → JWT validated → forwarded to traveler-service.
2. Controller calls use case → use case calls `TravelerRepository.findById(id)`.
3. Repository checks `TravelerCacheService.get(id)` → cache HIT → return deserialised aggregate.
4. Cache MISS → query PostgreSQL → populate cache → return aggregate.

**Data flow — write path**:
1. Use case calls aggregate method (e.g., `traveler.update(...)`) → aggregate emits domain event.
2. Repository saves aggregate to PostgreSQL.
3. `TravelerCacheService.invalidate(id)` deletes Redis key.
4. `TravelerEventPublisher.publish(domainEvent)` publishes to Kafka topic.

---

## Folder Structure

```
traveler-service/
└── src/
    ├── domain/
    │   ├── aggregates/
    │   │   └── traveler.aggregate.ts
    │   ├── value-objects/
    │   │   ├── traveler-id.value-object.ts
    │   │   ├── email.value-object.ts
    │   │   ├── employee-id.value-object.ts
    │   │   └── traveler-preferences.value-object.ts
    │   ├── events/
    │   │   ├── traveler-created.event.ts
    │   │   ├── traveler-updated.event.ts
    │   │   └── traveler-deleted.event.ts
    │   ├── repositories/
    │   │   └── i-traveler.repository.ts
    │   └── exceptions/
    │       ├── traveler-not-found.exception.ts
    │       └── duplicate-employee-id.exception.ts
    │
    ├── application/
    │   ├── use-cases/
    │   │   ├── create-traveler.use-case.ts
    │   │   ├── get-traveler.use-case.ts
    │   │   ├── get-travelers.use-case.ts
    │   │   ├── update-traveler.use-case.ts
    │   │   ├── delete-traveler.use-case.ts
    │   │   ├── get-traveler-preferences.use-case.ts
    │   │   ├── update-traveler-preferences.use-case.ts
    │   │   ├── sync-travelers.use-case.ts
    │   │   └── get-admin-travelers.use-case.ts
    │   ├── dto/
    │   │   ├── create-traveler.dto.ts
    │   │   ├── update-traveler.dto.ts
    │   │   ├── traveler-response.dto.ts
    │   │   ├── traveler-preferences.dto.ts
    │   │   ├── sync-travelers.dto.ts
    │   │   └── admin-traveler-response.dto.ts
    │   └── mappers/
    │       └── traveler.mapper.ts
    │
    ├── infrastructure/
    │   ├── persistence/
    │   │   ├── entities/
    │   │   │   └── traveler.typeorm-entity.ts
    │   │   └── repositories/
    │   │       └── traveler.repository.ts
    │   ├── cache/
    │   │   └── traveler-cache.service.ts
    │   ├── kafka/
    │   │   └── traveler-event-publisher.ts
    │   ├── hr/
    │   │   └── hr-soap-client.stub.ts
    │   ├── jobs/
    │   │   └── gdpr-anonymisation.job.ts
    │   └── migrations/
    │       └── <timestamp>-CreateTravelersTable.ts
    │
    ├── presentation/
    │   ├── controllers/
    │   │   ├── traveler.controller.ts
    │   │   └── admin-traveler.controller.ts
    │   ├── guards/
    │   │   └── roles.guard.ts
    │   ├── decorators/
    │   │   └── roles.decorator.ts
    │   └── filters/
    │       └── domain-exception.filter.ts
    │
    ├── traveler.module.ts
    └── main.ts
```

---

## Domain Model

### `Traveler` Aggregate

| Field | Type | Notes |
|---|---|---|
| `id` | `TravelerId` | UUID, generated on create |
| `employeeId` | `EmployeeId` | Unique per organisation; HR system identifier |
| `name` | `string` | Full name; anonymised to `DELETED_USER_<id>` after GDPR erasure |
| `email` | `Email` | Validated format; anonymised to `deleted-<id>@anonymised.invalid` after GDPR erasure |
| `department` | `string` | Free text |
| `role` | `TravelerRole` | Enum: `EMPLOYEE` / `MANAGER` / `ADMIN` |
| `preferences` | `TravelerPreferences` | Value object (see below) |
| `deletedAt` | `Date \| null` | Null = active; set on soft-delete |
| `anonymisedAt` | `Date \| null` | Set by GDPR cron after PII erasure |
| `version` | `number` | Optimistic locking column (TypeORM `@VersionColumn`) |
| `createdAt` | `Date` | Set on insert |
| `updatedAt` | `Date` | Updated on every write |

**Aggregate behaviours**:
- `Traveler.create(props)` → emits `TravelerCreated`
- `traveler.update(props)` → emits `TravelerUpdated`
- `traveler.softDelete()` → sets `deletedAt`; emits `TravelerDeleted`
- `traveler.anonymisePii()` → sets `name`, `email` to placeholder values; sets `anonymisedAt`
- `traveler.updatePreferences(prefs)` → replaces `preferences`; emits `TravelerUpdated`

### Value Objects

**`TravelerId`** — wraps `string` UUID; constructed via `TypedId.generate()` or from persistence.

**`Email`** — wraps `string`; validates RFC-5322 format on construction; throws `InvalidEmailException` on violation.

**`EmployeeId`** — wraps `string`; non-empty, max 50 chars; HR system identifier.

**`TravelerPreferences`** — immutable value object:

| Field | Type | Notes |
|---|---|---|
| `seatPreference` | `string` | `window` / `aisle` / `middle` / `none` |
| `mealPreference` | `string` | `standard` / `vegetarian` / `vegan` / `halal` / `kosher` / `none` |
| `frequentFlyerNumbers` | `Record<string, string>` | Airline code → FF number |
| `preferredAirlines` | `string[]` | IATA airline codes |
| `specialAssistance` | `string[]` | e.g., `['wheelchair', 'hearing_impaired']` |

---

## API Contracts

| Method | Path | Auth Roles | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/travelers` | EMPLOYEE, MANAGER, ADMIN | — | `TravelerResponseDto[]` (paginated, excludes soft-deleted) |
| `POST` | `/travelers` | MANAGER, ADMIN | `CreateTravelerDto` | `201 TravelerResponseDto` |
| `GET` | `/travelers/{travelerId}` | EMPLOYEE, MANAGER, ADMIN | — | `TravelerResponseDto` |
| `PATCH` | `/travelers/{travelerId}` | MANAGER, ADMIN | `UpdateTravelerDto` | `200 TravelerResponseDto` |
| `DELETE` | `/travelers/{travelerId}` | ADMIN | — | `204 No Content` |
| `GET` | `/travelers/{travelerId}/preferences` | EMPLOYEE, MANAGER, ADMIN | — | `TravelerPreferencesDto` |
| `PUT` | `/travelers/{travelerId}/preferences` | EMPLOYEE, MANAGER, ADMIN | `TravelerPreferencesDto` | `200 TravelerPreferencesDto` |
| `POST` | `/travelers/sync` | ADMIN | `SyncTravelersDto` | `200 { synced: number, errors: SyncErrorDto[] }` |
| `GET` | `/admin/travelers` | ADMIN | — | `AdminTravelerResponseDto[]` (includes PII + deletedAt) |

**Auth**: JWT Bearer via API Gateway; `X-Correlation-ID` header propagated to all downstream calls and logs.

**Error shape**:
```json
{
  "error": "TravelerNotFound",
  "message": "Traveler <id> not found",
  "details": [],
  "correlationId": "uuid",
  "timestamp": "ISO 8601"
}
```

---

## Database Schema

### Table: `travelers`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `uuid` | PK, NOT NULL | `TravelerId` |
| `employee_id` | `varchar(50)` | UNIQUE, NOT NULL | HR system identifier; dedup key for sync |
| `name` | `varchar(255)` | NOT NULL | Anonymised after GDPR erasure |
| `email` | `varchar(320)` | UNIQUE, NOT NULL | Anonymised after GDPR erasure |
| `department` | `varchar(100)` | NOT NULL | |
| `role` | `varchar(20)` | NOT NULL, CHECK IN ('EMPLOYEE','MANAGER','ADMIN') | |
| `preferences` | `jsonb` | NOT NULL, DEFAULT '{}' | `TravelerPreferences` serialised |
| `deleted_at` | `timestamptz` | NULL | Soft-delete marker |
| `anonymised_at` | `timestamptz` | NULL | Set after GDPR PII erasure |
| `version` | `integer` | NOT NULL, DEFAULT 0 | Optimistic locking |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT now() | |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT now() | |

**Indexes**:
- `idx_travelers_employee_id` — UNIQUE on `employee_id` (fast lookup for HR sync dedup)
- `idx_travelers_email` — UNIQUE on `email` (enforces email uniqueness)
- `idx_travelers_deleted_at` — partial index WHERE `deleted_at IS NULL` (fast active-only queries)
- `idx_travelers_role` — on `role` (role-filtered admin queries)

**Soft-delete convention**: all queries in `TravelerRepository` for non-admin use cases apply `WHERE deleted_at IS NULL`. Admin queries do not apply this filter.

---

## Resilience Design

### Cache-aside Flow

```
read(id):
  value = redis.get("traveler:profile:{id}")
  if value != null:
    increment cache_hit_total
    return deserialise(value)
  increment cache_miss_total
  traveler = postgres.findById(id)
  if traveler == null: throw TravelerNotFoundException
  redis.set("traveler:profile:{id}", serialise(traveler), EX 3600)
  return traveler

write(id, ...):
  postgres.save(traveler)
  redis.del("traveler:profile:{id}")   // invalidate
```

**Cache unavailability fallback**: if Redis is unavailable, the service falls through to PostgreSQL without error. A `warn` log is emitted. Cache operations must not block or fail the primary path.

### HR SOAP Circuit Breaker (opossum)

| Parameter | Value |
|---|---|
| `errorThresholdPercentage` | 50 |
| `volumeThreshold` | 10 |
| `timeout` | 30000 ms (30 s) |
| `resetTimeout` | 30000 ms (half-open probe) |
| Fallback | Return HTTP 503 `{ "error": "HrSystemUnavailable" }` |

State transitions emitted as `circuit_state` gauge metric:
- Closed = 0 | Half-open = 0.5 | Open = 1

### Retry Configuration (HR SOAP + Kafka publish)

| Parameter | Value |
|---|---|
| Max attempts | 3 (4 total) |
| Backoff base | 200 ms |
| Backoff max | 5000 ms |
| Jitter | ±20% |
| Retryable | 5xx, 408, network errors |
| Non-retryable | 4xx (including 400, 401, 403, 404, 422) |

Counter `retry_count` incremented per retry attempt with labels `operation` and `outcome`.

---

## Cache Design

| Property | Value |
|---|---|
| Key pattern | `traveler:profile:<travelerId>` |
| Serialisation | JSON (full `TravelerResponseDto` shape) |
| TTL | 3600 s (1 hour) |
| Eviction | LRU (global Redis policy) |
| Invalidation trigger | PATCH, DELETE, PUT-preferences (after DB commit, before Kafka publish) |
| Cache-miss fallback | Read from PostgreSQL, populate cache |
| Unavailability fallback | Bypass cache, read from PostgreSQL; log `warn` |
| Metrics | `cache_hit_total{entity="traveler"}`, `cache_miss_total{entity="traveler"}` |

---

## Idempotency Design

### HR Sync (`POST /travelers/sync`)

- **Key**: `employeeId` — unique identifier from HR feed.
- **Strategy**: `INSERT ... ON CONFLICT (employee_id) DO UPDATE SET ...` (PostgreSQL upsert).
- **Race prevention**: `version` column with TypeORM `@VersionColumn`; concurrent syncs on the same employee will trigger an optimistic lock conflict which is caught and retried within the sync use case.
- **Idempotency window**: indefinite (the `employees` table is the dedup store — no separate Redis key needed for sync).

### Kafka Event Consumer Deduplication

- **Key**: `eventId` (UUID, included in every event per ADR-003 schema).
- **Strategy**: consumers maintain an `event_dedup` table or Redis key `event:processed:<eventId>` with TTL 24 h.
- **This service's responsibility**: emit a unique `eventId` per published event; consumer deduplication is the consumer's responsibility. This is documented in the event schema below.

---

## GDPR Design

| Step | Mechanism |
|---|---|
| Soft-delete | `DELETE /travelers/{id}` sets `deleted_at = NOW()` and `version++`; record remains in DB |
| Kafka event | `TravelerDeleted` published immediately on soft-delete |
| Cache invalidation | `traveler:profile:<id>` deleted from Redis immediately |
| PII anonymisation | Cron runs nightly at 02:00 UTC; finds rows where `deleted_at < NOW() - 30 days AND anonymised_at IS NULL`; sets `name = 'DELETED_USER_<id>'`, `email = 'deleted-<id>@anonymised.invalid'`, `anonymised_at = NOW()` |
| Response filtering | Soft-deleted profiles excluded from all non-admin queries (`WHERE deleted_at IS NULL`) |
| Admin visibility | `GET /admin/travelers` returns all rows including soft-deleted; `deletedAt` field exposed |

**Schedule**: NestJS `@Cron('0 2 * * *')` inside `GdprAnonymisationJob` (see OQ-01 in proposal for K8s CronJob alternative).

---

## Event Schema

All events conform to ADR-003:

```typescript
interface TravelerDomainEvent {
  eventId: string;        // UUID, unique per event emission
  eventType: string;      // e.g., 'TravelerCreated'
  aggregateId: string;    // travelerId
  occurredOn: string;     // ISO 8601
  correlationId: string;  // from X-Correlation-ID header
  causationId: string;    // id of the command/request that caused this event
  version: string;        // schema version, currently "1"
  data: object;
}
```

**Kafka topic naming note**: This service uses fine-grained per-event topics (`traveler.created`, `traveler.updated`, `traveler.deleted`) rather than the aggregated `traveler-events` pattern mentioned in ADR-003. Fine-grained topics allow downstream consumers (booking-service, policy-service) to subscribe only to the event types they care about, reducing consumer-side filtering overhead. This pattern is proposed as the new project standard going forward and is a candidate for an ADR-003 update.

### `TravelerCreated` → topic `traveler.created`
```json
{
  "eventId": "uuid",
  "eventType": "TravelerCreated",
  "version": "1",
  "aggregateId": "<travelerId>",
  "occurredOn": "ISO 8601",
  "correlationId": "uuid",
  "causationId": "<requestId>",
  "data": {
    "travelerId": "uuid",
    "employeeId": "string",
    "name": "string",
    "email": "string",
    "department": "string",
    "role": "EMPLOYEE|MANAGER|ADMIN"
  }
}
```

### `TravelerUpdated` → topic `traveler.updated`
```json
{
  "eventId": "uuid",
  "eventType": "TravelerUpdated",
  "version": "1",
  "aggregateId": "<travelerId>",
  "occurredOn": "ISO 8601",
  "correlationId": "uuid",
  "causationId": "<requestId>",
  "data": {
    "travelerId": "uuid",
    "changedFields": ["name", "department"],
    "snapshot": { "name": "string", "email": "string", "department": "string", "role": "string" }
  }
}
```

### `TravelerDeleted` → topic `traveler.deleted`
```json
{
  "eventId": "uuid",
  "eventType": "TravelerDeleted",
  "version": "1",
  "aggregateId": "<travelerId>",
  "occurredOn": "ISO 8601",
  "correlationId": "uuid",
  "causationId": "<requestId>",
  "data": {
    "travelerId": "uuid",
    "deletedAt": "ISO 8601"
  }
}
```

---

## Error Handling

| Error Class | HTTP Status | Retryable | Notes |
|---|---|---|---|
| `TravelerNotFoundException` | 404 | No | Thrown when `findById` returns null |
| `DuplicateEmployeeIdException` | 409 | No | Thrown when POST creates with existing `employeeId` |
| `DuplicateEmailException` | 409 | No | Thrown when POST creates with existing `email` (DB UNIQUE constraint violation caught and re-thrown as domain exception) |
| `InvalidEmailException` | 400 | No | Thrown by `Email` value object |
| `OptimisticLockException` | 409 | Yes (retry within use case) | TypeORM version conflict on concurrent sync |
| `HrSystemUnavailableException` | 503 | — | Circuit breaker fallback |
| `CacheUnavailableException` | — | — | Caught internally; fallback to DB; log warn |

---

## Security Considerations

- JWT claims decoded and validated by API Gateway; traveler-service receives `userId`, `role` in request context.
- RBAC enforced in `RolesGuard` using `@Roles()` decorator; any request without the required role receives 403.
- `GET /admin/travelers` and `DELETE /travelers/:id` and `POST /travelers/sync` are ADMIN-only.
- PII fields (`name`, `email`) never logged; only `travelerId` and `employeeId` appear in log context.
- HR SOAP credentials loaded from Kubernetes secrets (`HR_SYSTEM_USERNAME`, `HR_SYSTEM_PASSWORD`); never committed to code.
- GDPR anonymisation irreversible — anonymised rows cannot be de-anonymised.

---

## Observability

### Metrics (Prometheus)

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` | All HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `route` | p50/p95/p99 latency |
| `cache_hit_total` | Counter | `entity="traveler"` | Redis cache hits |
| `cache_miss_total` | Counter | `entity="traveler"` | Redis cache misses |
| `kafka_events_published_total` | Counter | `topic`, `status` | Kafka publish outcomes |
| `retry_count` | Counter | `operation`, `outcome` | Retry attempts per op |
| `circuit_state` | Gauge | `service="hr-soap"` | 0=closed, 0.5=half-open, 1=open |
| `circuit_breaker_errors_total` | Counter | `service="hr-soap"` | Errors contributing to circuit |
| `db_query_duration_seconds` | Histogram | `operation` | TypeORM query latency |
| `db_connections_active` | Gauge | — | TypeORM pool active connections |

### Traces (OpenTelemetry → Jaeger)

- Span per HTTP request (auto-instrumented via `@opentelemetry/instrumentation-nestjs-core`)
- Span per PostgreSQL query (TypeORM instrumentation)
- Span per Redis operation (`TravelerCacheService`)
- Span per Kafka publish (`TravelerEventPublisher`)
- `X-Correlation-ID` set as span attribute `correlation.id` and propagated to all outbound calls

### Logs (Winston → Elasticsearch)

Every log entry includes:
```json
{
  "timestamp": "ISO 8601",
  "level": "info|warn|error|debug",
  "service": "traveler-service",
  "correlationId": "uuid",
  "message": "string",
  "context": { "travelerId": "uuid", "operation": "createTraveler" }
}
```

Key log events:
- `info` — traveler created/updated/deleted (travelerId only, no PII)
- `info` — cache hit/miss (travelerId)
- `info` — Kafka event published (eventType, topic)
- `warn` — Redis unavailable, falling back to DB
- `warn` — HR sync conflict (employeeId, version)
- `warn` — circuit breaker state change (state, service)
- `error` — DB commit failed, Kafka publish failed (with correlationId + stack)

---

## Dependencies on Other Changes

| Change | What Is Needed |
|---|---|
| SM-01 (`@travel/shared`) | `AggregateRoot`, `DomainEvent`, `IRepository<T>`, `TypedId`, `KafkaModule` — must be published to npm or workspace before T02 |
