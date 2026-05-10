# Proposal: Policy Service (SM-05)

## Intent

Provide a dedicated microservice that owns corporate travel policy definitions
and departmental budget tracking. The service is the single authority for
determining whether a booking request complies with travel rules, enabling the
Booking Service to reject or flag non-compliant trips before any payment is
taken.

## Scope

### In Scope

- CRUD for `TravelPolicy` (name, department, JSONB `rules`, active flag, version)
- CRUD for `DepartmentalBudget` (department, fiscal year, total / quarterly breakdown, spent)
- Synchronous policy-validation endpoint (`POST /policies/validate`) returning
  pass/fail + violation list within 500 ms SLA
- Kafka publishing of `PolicyValidated` and `PolicyViolationDetected` domain
  events after each successful validation
- Cache-aside for active policy rules per department (Redis, 15 min TTL) and
  traveler department per `travelerId` (Redis, 1 h TTL)
- Cache invalidation on any policy create / update / delete
- Circuit breaker + retry + timeout for Traveler Service HTTP calls; fallback
  to JWT `department` claim when circuit is open
- `GET /health` and `GET /ready` endpoints
- Prometheus metrics, OpenTelemetry traces, structured Winston logs per ADR-007

### Out of Scope

- Approval workflow state machine — `policy_violations.requires_approval` flag
  recorded only; async manager notifications deferred to a future Notification
  Service
- Budget deduction at validation time — check is read-only; spend tracking
  update deferred to Booking Service confirmation flow (SM-07)
- Outbox / transactional Kafka relay — PROJECT.md §6 mandates direct publish
  after DB commit; no outbox table
- `policy_violations` REST CRUD — violations are written internally by
  `ValidatePolicyUseCase`; no separate REST endpoint
- Booking Service (SM-07) — depends on this service but is out of scope here

## Approach

The service follows the four-layer DDD architecture:
**Domain** (aggregates, value objects, domain services, events) →
**Application** (use cases, DTOs, mappers) →
**Infrastructure** (TypeORM repositories, Redis cache, Traveler HTTP client,
Kafka publisher) →
**Presentation** (NestJS controllers, guards, filters).

Policy validation is synchronous and pure: the `PolicyValidator` domain service
evaluates `PolicyRules` (JSONB) against the inbound `PolicyValidationRequest`
in memory, producing a `ValidationResult` value object. Side effects
(DB write of `policy_violation`, Kafka publish) happen in the application
layer after domain evaluation.

Traveler department resolution calls `GET /travelers/:id` on Traveler Service
via an HTTP client wrapped in opossum circuit breaker (50 % failure threshold /
10-request window / 30 s reset) with 3× exponential-backoff retries (base
200 ms, max 5 s, ±25 % jitter). When the circuit is open the fallback reads the
`department` claim from the validated JWT payload.

Policy rules and traveler department are cached in Redis (cache-aside pattern)
to keep validation well within the 500 ms SLA. Cache keys are explicitly
deleted on any policy mutation (cache invalidation pattern).

`PolicyValidated` and `PolicyViolationDetected` events are published directly
to Kafka after the DB commit (no outbox, per PROJECT.md §6).

## Microservice Patterns Applied

| Pattern            | Justification                                                                           |
|--------------------|-----------------------------------------------------------------------------------------|
| Database-per-service | Policy DB is an isolated PostgreSQL schema (`policy_service`), accessed by no other service |
| Idempotency        | Natural-key uniqueness (`name + department` for policies; `department + fiscal_year` for budgets) prevents duplicate records on retry |
| Timeouts           | 2 s connect / 5 s read on Traveler Service HTTP calls bounds validation latency         |
| Retries with Backoff | 3× retries (exponential, base 200 ms, max 5 s, ±25 % jitter) on transient Traveler Service failures |
| Circuit Breaker    | opossum on Traveler Service (50 % / 10 req / 30 s); fallback uses JWT `department` claim |
| Cache-aside        | Active policy rules per department (15 min TTL); traveler department per ID (1 h TTL)  |
| Cache Invalidation | Explicit cache-key delete on policy create / update / delete                            |

## Assumptions

- Redis is available at `REDIS_URL`; keys are namespaced with
  `policy-service:` prefix to avoid collisions with other services.
- Kafka broker is reachable at `KAFKA_BROKERS`; topic `policy-events` is
  pre-created with adequate partitions.
- Traveler Service is accessible at `TRAVELER_SERVICE_URL` and exposes
  `GET /travelers/:id` returning at minimum `{ id, department }`.
- JWT payload always contains a `department` field (used as CB fallback).
- `@travel/shared` v1 is published in the workspace and exports
  `AggregateRoot`, `DomainEvent`, `DomainEventProps`, `TypedId`,
  `DomainException`, `ConflictException`, `NotFoundException`,
  `generateUuid`, `isValidUuid`, `KafkaModule`, `KAFKA_PRODUCER`.
- TypeORM migrations run on service start in development; separate migration
  step enforced in production CI.
- All amounts are in USD; no multi-currency comparison in this iteration.
- `tsconfig.json` uses `exactOptionalPropertyTypes: true` and
  `noUncheckedIndexedAccess: true` (inherits from `tsconfig.base.json`).

## Open Questions

- None — all architectural decisions resolved per session context.
