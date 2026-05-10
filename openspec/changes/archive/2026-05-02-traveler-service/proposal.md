# Proposal: Traveler Profile Service (SM-03)

## Intent

Implement the central employee travel profile store for the Corporate Travel Portal. This service is the system of record for employee travel identities: it manages profile creation and maintenance, travel preference storage, role-based access, HR data synchronisation, GDPR-compliant soft-deletion, and downstream event notification. Every other service that needs to know "who is travelling" calls this service or reacts to its Kafka events.

## Scope

### In Scope

- NestJS microservice on port 3003 with 4-layer DDD architecture (Domain / Application / Infrastructure / Presentation)
- `Traveler` aggregate with value objects: `TravelerId`, `Email`, `EmployeeId`, `TravelerPreferences`
- Domain events: `TravelerCreated`, `TravelerUpdated`, `TravelerDeleted`
- All 9 REST endpoints:
  - `GET /travelers` — list profiles (EMPLOYEE / MANAGER / ADMIN)
  - `POST /travelers` — create profile (MANAGER / ADMIN)
  - `GET /travelers/{travelerId}` — get by ID (EMPLOYEE / MANAGER / ADMIN)
  - `PATCH /travelers/{travelerId}` — update fields (MANAGER / ADMIN)
  - `DELETE /travelers/{travelerId}` — soft-delete (ADMIN)
  - `GET /travelers/{travelerId}/preferences` — get preferences (EMPLOYEE / MANAGER / ADMIN)
  - `PUT /travelers/{travelerId}/preferences` — replace preferences (EMPLOYEE / MANAGER / ADMIN)
  - `POST /travelers/sync` — bulk HR upsert (ADMIN)
  - `GET /admin/travelers` — full PII admin list (ADMIN)
- PostgreSQL 15 persistence via TypeORM 0.3 with `travelers` table, soft-delete, version column, and TypeORM migrations
- Redis 7 cache-aside: key `traveler:profile:<travelerId>`, TTL 1 hour, invalidation on write
- Kafka event publishing to `traveler.created`, `traveler.updated`, `traveler.deleted` topics
- HR sync (`POST /travelers/sync`): bulk upsert idempotent by `employeeId`, circuit breaker wrapping the SOAP stub call
- GDPR: soft-delete flag (`deletedAt`), scheduled cron to anonymise PII fields 30 days after deletion
- RBAC via JWT guards (EMPLOYEE / MANAGER / ADMIN roles per ADR-005)
- Observability: Prometheus metrics, OpenTelemetry traces, structured Winston logs
- Contract-first: implementation matches `docs/contracts/openapi/openapi-traveler-service.yaml`
- 80% test coverage: co-located unit tests, Testcontainers integration tests

### Out of Scope

- Booking logic, policy evaluation, and payment handling (separate services)
- HR SOAP adapter full implementation — a stub/mock is used in v1; production SOAP client is a separate change
- Frontend SPA or React components
- Outbox relay pattern (not implemented per PROJECT.md §6; direct Kafka publish used)
- Read-model projections / CQRS (read complexity does not justify a separate store)
- Distributed saga coordination (this service is not a saga coordinator)
- Full Pact consumer-driven contract tests for downstream consumers (deferred to each consumer's change)

## Approach

The service follows the project-standard 4-layer DDD layout. The `Traveler` aggregate enforces all invariants (email format, employeeId uniqueness) and emits domain events that the infrastructure layer publishes to Kafka after each DB commit.

Profile reads apply **Cache-aside**: the repository checks Redis first, populates on miss, and returns. Writes (PATCH, DELETE, PUT preferences) immediately **invalidate** the cached key. This keeps read latency low for the common case while tolerating infrequent writes.

The HR sync endpoint performs a bulk upsert identified by `employeeId` (idempotency key). A version column enables optimistic locking to prevent concurrent sync races. The SOAP stub call is wrapped in an **opossum Circuit Breaker** (50% error rate over 10 requests in 30 s) so a failing HR system degrades gracefully.

All external calls (HR SOAP, Redis, Kafka) carry explicit **Timeouts** and are subject to **Retries** (3×, exponential backoff, non-retryable on 4xx).

GDPR soft-delete marks `deletedAt` on the row; a **nightly cron** anonymises PII fields (`name`, `email`) after 30 days, replacing them with deterministic placeholder values.

## Microservice Patterns Applied

| Pattern | Justification |
|---|---|
| Database-per-service | Traveler service owns its own PostgreSQL schema; ADR-001 forbids cross-service DB access |
| Idempotency | HR sync must not create duplicate profiles for the same `employeeId`; event consumers deduplicate by `eventId` |
| Timeouts | HR SOAP (30 s override), Redis (2 s), Kafka (10 s) per PROJECT.md §7 |
| Retries | HR SOAP and Kafka publish retry 3× with exponential backoff on 5xx/408 |
| Circuit Breaker | HR SOAP client wrapped with opossum (50%/10req/30s); fallback returns 503 |
| Cache-aside | Traveler profiles cached in Redis, read-path checks cache first, miss populates cache |
| Cache Invalidation | PATCH / DELETE / PUT-preferences invalidate `traveler:profile:<travelerId>` immediately |

## Assumptions

- `@travel/shared` package (SM-01) is available and exports `KafkaModule`, `AggregateRoot`, `DomainEvent`, `IRepository`, `TypedId`.
- The HR system SOAP endpoint URL is injected via environment variable `HR_SYSTEM_URL`.
- Basic Auth credentials for HR are available as `HR_SYSTEM_USERNAME` / `HR_SYSTEM_PASSWORD` Kubernetes secrets.
- The API Gateway handles JWT validation and forwards claims; this service only inspects roles.
- Kafka topics `traveler.created`, `traveler.updated`, `traveler.deleted` are pre-created with replication factor 2 and 7-day retention (PROJECT.md §6).
- Redis is available at `REDIS_URL` with no per-key auth; namespace isolation is sufficient.
- TypeORM migrations run as part of the deployment pipeline (`npm run migration:run`).
- The `traveler-events` Kafka topic group maps to the `traveler.<action>` per-event topic convention used in this service (fine-grained topics, not aggregated).

## Open Questions

| # | Question | Impact | Decision | Resolved |
|---|---|---|---|---|
| OQ-01 | **GDPR anonymisation schedule**: should the 30-day anonymisation job run as a NestJS `@Cron` inside the service, or as a separate Kubernetes CronJob? | Affects T11 implementation | **DECIDED: NestJS `@Cron('0 2 * * *')` inside traveler-service.** Simpler deployment; K8s CronJob deferred until operational scaling requirements demand it. | ✅ 2026-05-02 |
| OQ-02 | **HR SOAP endpoint URL**: is `HR_SYSTEM_URL` a single endpoint for both bulk employee list and individual lookups, or are they separate URLs? | Affects `SyncTravelersUseCase` and circuit breaker scope | **DECIDED: Single endpoint.** `HR_SYSTEM_URL` is one endpoint for all HR operations. Stub assumes single endpoint; circuit breaker wraps it as a single downstream. | ✅ 2026-05-02 |
| OQ-03 | **Traveler soft-delete visibility**: should `GET /travelers` (EMPLOYEE / MANAGER roles) silently exclude soft-deleted profiles, or return them with a `deleted: true` flag? | Affects `GetTravelersUseCase` query filter and DTO | **DECIDED: Silent exclusion.** Soft-deleted travelers are invisible to non-admin callers. `GET /travelers` applies `WHERE deleted_at IS NULL`. No `deleted: true` flag exposed to EMPLOYEE/MANAGER. | ✅ 2026-05-02 |
