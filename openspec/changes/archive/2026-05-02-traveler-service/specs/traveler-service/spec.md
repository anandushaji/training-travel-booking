# Delta for traveler-service — Traveler Profile Service (SM-03)

> **Delta spec — ADDED sections only.** This service is new; all requirements below are additions to the system specification.

---

## ADDED Requirements

---

### Requirement: Traveler Aggregate Lifecycle

The system SHALL manage `Traveler` aggregates with full create, update, soft-delete, and preferences-update behaviours, enforcing domain invariants (unique email, unique employeeId, valid email format) and emitting domain events on every state change.

#### Scenario: Successful traveler creation

- GIVEN a valid `CreateTravelerDto` with a unique `email` and `employeeId`
- WHEN `POST /travelers` is called by a MANAGER or ADMIN
- THEN a new `Traveler` aggregate is persisted with `deletedAt = null`
- AND a `TravelerCreated` domain event is published to `traveler.created`
- AND the response body is a `TravelerResponseDto` with HTTP 201

#### Scenario: Creation rejected on duplicate email

- GIVEN a `Traveler` with `email = alice@corp.com` already exists (not soft-deleted)
- WHEN `POST /travelers` is called with `email = alice@corp.com`
- THEN HTTP 409 is returned with `error = "DuplicateEmail"`
- AND no aggregate is persisted
- AND no Kafka event is published

#### Scenario: EMPLOYEE cannot update another traveler's preferences

- GIVEN an authenticated user with role `EMPLOYEE` and JWT subject `travelerId = T1`
- WHEN `PUT /travelers/T2/preferences` is called (T2 ≠ T1)
- THEN HTTP 403 is returned with `error = "Forbidden"`
- AND no preferences update is applied

#### Scenario: Update traveler fields

- GIVEN a `Traveler` with `id = T1` exists and is active
- WHEN `PATCH /travelers/T1` is called with `{ "department": "Engineering" }`
- THEN the `department` field is updated in PostgreSQL
- AND a `TravelerUpdated` event is published with `changedFields = ["department"]`
- AND the Redis key `traveler:profile:T1` is invalidated

#### Scenario: Soft-delete

- GIVEN a `Traveler` with `id = T1` exists and is active
- WHEN `DELETE /travelers/T1` is called by ADMIN
- THEN `deleted_at` is set to the current timestamp in PostgreSQL
- AND a `TravelerDeleted` event is published to `traveler.deleted`
- AND `GET /travelers/T1` by a non-admin returns HTTP 404
- AND `GET /admin/travelers` still returns T1 with `deletedAt` populated

---

### Requirement: Performance and Availability SLA

The service SHALL conform to the project-wide SLA targets defined in PROJECT.md §7–8. Specifically:

- The service SHALL respond to `GET /travelers/:id` requests with P99 latency ≤ 200 ms at 500 RPS under normal operating conditions.
- The service SHALL achieve 99.9% uptime measured monthly.
- The service SHALL handle a maximum response time of 5 s for `POST /travelers/sync` with payloads up to 1 000 employee records.

---

### Requirement: CRUD REST Endpoints with RBAC

The system SHALL expose all 9 REST endpoints at `/travelers` (and `/admin/travelers`) with role-based access control as defined in the API contract.

#### Scenario: EMPLOYEE reads own profile

- GIVEN an authenticated user with role `EMPLOYEE` and `travelerId = T1`
- WHEN `GET /travelers/T1` is called
- THEN HTTP 200 is returned with the traveler's `TravelerResponseDto`
- AND PII fields (`name`, `email`) are present in the response
- AND `anonymisedAt` is not exposed in the response

#### Scenario: Insufficient role rejected

- GIVEN an authenticated user with role `EMPLOYEE`
- WHEN `POST /travelers` is called with a valid body
- THEN HTTP 403 is returned with `error = "Forbidden"`
- AND no aggregate is created

#### Scenario: Admin list returns all traveler records including soft-deleted

- GIVEN 3 active traveler records and 1 soft-deleted record exist in PostgreSQL
- WHEN `GET /admin/travelers` is called by ADMIN
- THEN HTTP 200 is returned with all 4 records
- AND the soft-deleted record has `deletedAt` populated

#### Scenario: List travelers excludes soft-deleted for non-admin

- GIVEN 3 active traveler records and 1 soft-deleted record exist
- WHEN `GET /travelers` is called by EMPLOYEE
- THEN HTTP 200 is returned with exactly 3 records (soft-deleted excluded)

#### Scenario: employeeId exceeds maximum length

- GIVEN a `CreateTravelerDto` with `employeeId` of 51 characters (one over the 50-char maximum)
- WHEN `POST /travelers` is called by MANAGER
- THEN HTTP 400 is returned with a validation error identifying the `employeeId` field

#### Scenario: name exceeds maximum length

- GIVEN a `CreateTravelerDto` with `name` of 256 characters (one over the 255-char maximum)
- WHEN `POST /travelers` is called by MANAGER
- THEN HTTP 400 is returned with a validation error identifying the `name` field

#### Scenario: Concurrent POST with same employeeId — race condition resolved by DB constraint

- GIVEN no traveler exists for `employeeId = EMP-001`
- WHEN two simultaneous `POST /travelers` requests are made, both passing the `findByEmployeeId` check before either commits
- THEN exactly 1 traveler record is created for `employeeId = EMP-001` (DB UNIQUE constraint prevents duplicate)
- AND one request returns HTTP 201; the other returns HTTP 409 with `error = "DuplicateEmployeeId"`

#### Scenario: Database write failure returns 503

- GIVEN the PostgreSQL connection pool is exhausted
- WHEN `POST /travelers` is called with valid data
- THEN HTTP 503 is returned with `error = "ServiceUnavailable"`
- AND no `TravelerCreated` Kafka event is published

- GIVEN an authenticated user with role `EMPLOYEE`
- WHEN `POST /travelers` is called with a valid body
- THEN HTTP 403 is returned with `error = "Forbidden"`
- AND no aggregate is created

#### Scenario: Admin list returns all traveler records including soft-deleted

- GIVEN 3 active traveler records and 1 soft-deleted record exist in PostgreSQL
- WHEN `GET /admin/travelers` is called by ADMIN
- THEN HTTP 200 is returned with all 4 records
- AND the soft-deleted record has `deletedAt` populated

#### Scenario: List travelers excludes soft-deleted for non-admin

- GIVEN 3 active traveler records and 1 soft-deleted record exist
- WHEN `GET /travelers` is called by EMPLOYEE
- THEN HTTP 200 is returned with exactly 3 records (soft-deleted excluded)

---

### Requirement: Travel Preferences Management

The system SHALL allow any authenticated user (EMPLOYEE / MANAGER / ADMIN) to read and replace travel preferences for a traveler profile.

#### Scenario: Replace travel preferences

- GIVEN a `Traveler` with `id = T1` exists and has default preferences
- WHEN `PUT /travelers/T1/preferences` is called with `{ "seatPreference": "window", "mealPreference": "vegan" }`
- THEN the `preferences` JSON column is replaced in PostgreSQL
- AND a `TravelerUpdated` Kafka event is published with `changedFields = ["preferences"]`
- AND `GET /travelers/T1/preferences` returns the new preference values
- AND the Redis key `traveler:profile:T1` is invalidated

#### Scenario: Get preferences for non-existent traveler

- GIVEN no `Traveler` with `id = UNKNOWN` exists
- WHEN `GET /travelers/UNKNOWN/preferences` is called
- THEN HTTP 404 is returned with `error = "TravelerNotFound"`

---

### Requirement: HR System Synchronisation   [Idempotency]

The system SHALL accept a bulk upsert payload from the HR system via `POST /travelers/sync`, performing idempotent create-or-update by `employeeId`, and SHALL NOT create duplicate traveler records when the same `employeeId` appears in repeated sync requests.

#### Scenario: First-time sync creates traveler records

- GIVEN no traveler records exist for `employeeId = EMP-001`
- WHEN `POST /travelers/sync` is called with `[{ employeeId: "EMP-001", name: "Alice", email: "alice@corp.com", ... }]`
- THEN a new `Traveler` is created in PostgreSQL with `employeeId = EMP-001`
- AND `TravelerCreated` is published to `traveler.created`
- AND the response is `{ synced: 1, errors: [] }`

#### Scenario: Repeated sync with same employeeId updates existing record

- GIVEN a `Traveler` with `employeeId = EMP-001` exists with `name = "Alice"`
- WHEN `POST /travelers/sync` is called again with `[{ employeeId: "EMP-001", name: "Alice Smith", ... }]`
- THEN the existing record is updated (`name = "Alice Smith"`)
- AND no second traveler is created (total count for EMP-001 = 1)
- AND `TravelerUpdated` is published
- AND the response is `{ synced: 1, errors: [] }`

#### Scenario: HR system returns 503 — circuit breaker opens

- GIVEN the HR SOAP stub returns 503 for 10 consecutive calls
- WHEN `POST /travelers/sync` is called
- THEN the circuit breaker transitions to OPEN state
- AND HTTP 503 is returned with `error = "HrSystemUnavailable"`
- AND `circuit_state{service="hr-soap"}` gauge = 1

#### Scenario: Partial sync failure — error reported per record

- GIVEN a sync payload with 3 records where record 2 has an invalid email format
- WHEN `POST /travelers/sync` is called
- THEN records 1 and 3 are upserted successfully
- AND the response is `{ synced: 2, errors: [{ employeeId: "EMP-002", reason: "InvalidEmail" }] }`

#### Scenario: All HR SOAP retries exhausted — record fails gracefully

- GIVEN the HR SOAP stub returns 503 on all 3 retry attempts for `employeeId = EMP-001` (below circuit-open threshold)
- WHEN `POST /travelers/sync` is called with `[{ employeeId: "EMP-001", ... }]`
- THEN the record is not created/updated in PostgreSQL
- AND the response is `{ synced: 0, errors: [{ employeeId: "EMP-001", reason: "HrUnavailable" }] }`
- AND `retry_count{operation="hr-soap", outcome="failure"}` is incremented

#### Scenario: Concurrent sync for same employeeId — exactly one record created

- GIVEN no traveler exists for `employeeId = EMP-005`
- WHEN two simultaneous `POST /travelers/sync` requests are made, both containing `employeeId = EMP-005`, arriving before either commits
- THEN exactly 1 traveler record exists for `employeeId = EMP-005` after both requests complete
- AND both requests return HTTP 200 (one with `synced: 1`, one with `synced: 1` via optimistic-lock retry or upsert dedup)

---

### Requirement: Traveler Profile Cache-aside   [Cache-aside]

The system SHALL cache traveler profiles in Redis under key `traveler:profile:<travelerId>` with a TTL of 1 hour, serving reads from cache when available and populating the cache on a miss, without requiring a write-through synchronisation step.

#### Scenario: Cache hit — profile served from Redis

- GIVEN a traveler profile is cached in Redis under `traveler:profile:T1`
- WHEN `GET /travelers/T1` is called
- THEN the response is returned from Redis without a PostgreSQL query
- AND `cache_hit_total{entity="traveler"}` is incremented by 1

#### Scenario: Cache miss — populate from PostgreSQL

- GIVEN no entry exists in Redis for `traveler:profile:T1`
- AND a `Traveler` with `id = T1` exists in PostgreSQL
- WHEN `GET /travelers/T1` is called
- THEN PostgreSQL is queried and the result is returned
- AND the result is written to Redis with TTL 3600 s
- AND `cache_miss_total{entity="traveler"}` is incremented by 1

#### Scenario: Redis unavailable — fallback to PostgreSQL

- GIVEN Redis is unreachable
- WHEN `GET /travelers/T1` is called
- THEN PostgreSQL is queried and the result is returned (HTTP 200)
- AND a `warn` log is emitted with `message = "Redis unavailable, falling back to DB"`
- AND no HTTP error is returned to the caller

---

### Requirement: Cache Invalidation on Write   [Cache Invalidation]

The system SHALL delete the Redis key `traveler:profile:<travelerId>` immediately after any write operation (PATCH, DELETE, PUT-preferences) completes the PostgreSQL commit, preventing stale cache entries from being served.

#### Scenario: Cache invalidated after profile update

- GIVEN `traveler:profile:T1` exists in Redis
- WHEN `PATCH /travelers/T1` is called with a valid update
- THEN the PostgreSQL record is updated
- AND `traveler:profile:T1` is deleted from Redis
- AND a subsequent `GET /travelers/T1` triggers a cache miss and repopulates from PostgreSQL

#### Scenario: Cache invalidated after soft-delete

- GIVEN `traveler:profile:T1` exists in Redis
- WHEN `DELETE /travelers/T1` is called by ADMIN
- THEN the `deleted_at` column is set in PostgreSQL
- AND `traveler:profile:T1` is deleted from Redis
- AND a subsequent `GET /travelers/T1` by a non-admin receives HTTP 404

---

### Requirement: Kafka Event Publishing   [Outbox — not applied; direct publish]

The system SHALL publish domain events to Kafka topics (`traveler.created`, `traveler.updated`, `traveler.deleted`) after each successful PostgreSQL commit, using at-least-once delivery semantics, with each event carrying a unique `eventId` to support consumer-side deduplication.

#### Scenario: TravelerCreated event published after successful create

- GIVEN a valid `POST /travelers` request is received
- WHEN the `Traveler` is persisted in PostgreSQL
- THEN a `TravelerCreated` event is published to `traveler.created`
- AND the event body conforms to the ADR-003 schema (`eventId`, `eventType`, `aggregateId`, `occurredOn`, `correlationId`, `causationId`, `data`)
- AND `kafka_events_published_total{topic="traveler.created", status="success"}` is incremented

#### Scenario: Kafka publish failure triggers retry

- GIVEN Kafka is temporarily unavailable (simulated 503 from broker)
- WHEN a `TravelerUpdated` event is to be published
- THEN the publisher retries up to 3 times with exponential backoff
- AND after all retries exhausted, an `error` log is emitted with the event payload and correlationId
- AND `kafka_events_published_total{topic="traveler.updated", status="failure"}` is incremented

#### Scenario: Events partitioned by travelerId

- GIVEN two `TravelerUpdated` events for the same `travelerId = T1`
- WHEN both events are published to `traveler.updated`
- THEN both events land in the same Kafka partition
- AND ordering of events for T1 is preserved

---

### Requirement: Resilience — Retries with Backoff   [Retries]

The system SHALL retry HR SOAP calls and Kafka publish operations on transient errors (5xx, 408, network failures) up to 3 times with exponential backoff, and SHALL NOT retry on permanent errors (4xx).

#### Scenario: Transient error retried — eventual success

- GIVEN an HR SOAP call returns 503 on the first and second attempt
- WHEN `POST /travelers/sync` is called
- THEN the system retries the SOAP call (attempt 2, attempt 3)
- AND when attempt 3 succeeds, the sync completes normally
- AND `retry_count{operation="hr-soap", outcome="success"}` = 2

#### Scenario: Non-retryable 4xx error — immediate failure

- GIVEN the HR SOAP stub returns 401 Unauthorized
- WHEN `POST /travelers/sync` is called
- THEN the system does NOT retry the SOAP call
- AND HTTP 503 is returned immediately
- AND `retry_count{operation="hr-soap", outcome="non-retryable"}` = 0 (no retry recorded)

---

### Requirement: HR SOAP Circuit Breaker   [Circuit Breaker]

The system SHALL wrap the HR SOAP client in an opossum circuit breaker that opens after 50% error rate over 10 requests in a 30-second window, returning a 503 fallback while open, and probing for recovery after 30 seconds.

#### Scenario: Circuit opens after threshold breached

- GIVEN 6 of 10 consecutive HR SOAP calls return 503 (60% error rate > 50% threshold)
- WHEN the 11th call is made
- THEN the circuit breaker is in OPEN state and the call is not forwarded to the SOAP client
- AND HTTP 503 `{ "error": "HrSystemUnavailable" }` is returned immediately
- AND `circuit_state{service="hr-soap"}` = 1

#### Scenario: Circuit recovers via half-open probe

- GIVEN the circuit is OPEN and 30 seconds have elapsed
- WHEN the next `POST /travelers/sync` call arrives
- THEN the circuit enters HALF-OPEN state and one probe call is forwarded to HR SOAP
- AND if the probe succeeds, the circuit transitions to CLOSED
- AND `circuit_state{service="hr-soap"}` = 0

#### Scenario: Circuit remains open on failed probe

- GIVEN the circuit is HALF-OPEN and the probe call returns 503
- WHEN the probe completes
- THEN the circuit returns to OPEN state
- AND `circuit_state{service="hr-soap"}` = 1

---

### Requirement: GDPR Soft-Delete and PII Anonymisation

The system SHALL soft-delete traveler records (preserving the row, setting `deleted_at`) and SHALL anonymise PII fields (`name`, `email`) for records deleted more than 30 days ago, rendering them unidentifiable.

#### Scenario: Soft-delete marks record and hides from non-admin

- GIVEN a `Traveler` with `id = T1` is active
- WHEN `DELETE /travelers/T1` is called by ADMIN
- THEN `deleted_at` is set in PostgreSQL
- AND `GET /travelers/T1` by EMPLOYEE returns HTTP 404
- AND `GET /admin/travelers` returns T1 with `deletedAt` populated

#### Scenario: PII anonymised after 30-day window

- GIVEN a `Traveler` with `id = T1` has `deleted_at = NOW() - 31 days`
- AND `anonymised_at IS NULL`
- WHEN the GDPR anonymisation cron runs
- THEN `name` is set to `DELETED_USER_<T1>`
- AND `email` is set to `deleted-<T1>@anonymised.invalid`
- AND `anonymised_at` is set to the current timestamp

#### Scenario: PII not yet anonymised (within 30 days)

- GIVEN a `Traveler` with `deleted_at = NOW() - 10 days`
- AND `anonymised_at IS NULL`
- WHEN the GDPR anonymisation cron runs
- THEN the record is NOT anonymised (still within 30-day window)
- AND `anonymised_at` remains NULL

---

### Requirement: Observability Instrumentation

The system SHALL emit Prometheus metrics, OpenTelemetry traces, and structured Winston log entries for all HTTP operations, cache interactions, Kafka publishes, circuit breaker state changes, and retry events, conforming to ADR-007 observability standards.

#### Scenario: Metrics emitted on profile read

- GIVEN a `GET /travelers/T1` request is received
- WHEN the request completes with HTTP 200
- THEN `http_requests_total{method="GET", route="/travelers/:id", status_code="200"}` is incremented
- AND `http_request_duration_seconds{method="GET", route="/travelers/:id"}` histogram observation is recorded

#### Scenario: Trace spans created for cache and DB operations

- GIVEN a `GET /travelers/T1` request results in a cache miss
- WHEN the use case executes
- THEN a root span for the HTTP request is created with `correlation.id` attribute
- AND a child span is created for the Redis GET operation
- AND a child span is created for the PostgreSQL query
- AND a child span is created for the Redis SET (cache populate)

---
