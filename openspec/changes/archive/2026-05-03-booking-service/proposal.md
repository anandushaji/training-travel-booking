# Proposal: Booking Service (SM-07)

## Intent

Provide the core-domain microservice that orchestrates the full trip-booking
lifecycle. The Booking Service is the single authority for creating, tracking,
and cancelling bookings. It coordinates Policy, Inventory, and Payment services
through a durable `BookingSagaOrchestrator`, guarantees compensating
transactions on any saga step failure, and publishes domain events consumed by
the Expense Service (SM-08).

## Scope

### In Scope

- `Booking` aggregate root with state machine:
  `PENDING → RESERVED → PAYMENT_PROCESSING → CONFIRMED / CANCELLED / FAILED`
- `BookingSaga` entity and `BookingStep` entity (durable saga — persisted to DB)
- `BookingSagaOrchestrator` domain service with four ordered steps:
  1. Validate Policy (`POST /policies/validate` → Policy Service)
  2. Create Reservation (`POST /inventory/reservations` → Inventory Service)
  3. Authorize Payment (`POST /payments/authorize` → Payment Service)
  4. Confirm Booking (aggregate state transition + capture payment)
- Compensating transactions in reverse order on any step failure:
  cancel reservation (Inventory), void/refund payment (Payment)
- CQRS split:
  - **Command side**: `CreateBookingUseCase`, `CancelBookingUseCase`
  - **Query side**: `BookingQueryService` reading from `booking_read_model`
  - `BookingReadModelUpdater` event handler projecting `BookingConfirmed` /
    `BookingCancelled` events onto the read model
- REST endpoints per `openapi-booking-service.yaml`:
  `GET /health`, `GET /ready`, `GET /bookings`, `POST /bookings`,
  `GET /bookings/:id`, `POST /bookings/:id/cancel`
  (also: `PATCH /bookings/:id` for `specialRequests` update)
- Kafka **publish** to topic `booking-events`:
  `BookingCreated`, `BookingConfirmed`, `BookingCancelled`
- Kafka **consume** from topic `payment-events`:
  `PaymentCaptured` → confirm booking; `PaymentFailed` → compensate saga
- PostgreSQL persistence (five tables per DDD §12.1):
  `bookings`, `booking_sagas`, `booking_saga_steps`, `event_store`,
  `booking_read_model`
- Optimistic locking (`@VersionColumn`) on `bookings` table
- Retry (3×, exponential backoff) + Circuit Breaker (opossum) on all three
  downstream HTTP clients (Policy, Inventory, Payment)
- `GET /health` and `GET /ready` endpoints
- Prometheus metrics, OpenTelemetry traces, structured Winston logs per ADR-007

### Out of Scope

- Outbox / transactional Kafka relay — PROJECT.md §6 mandates direct publish
  after DB commit; no outbox table
- Approval workflow state machine — policy `requiresApproval` flag is passed
  through as-is; async manager notification deferred to a future Notification
  Service
- Event sourcing replay / snapshotting — `event_store` table is written for
  observability/audit; full ES replay infrastructure is out of scope
- `PATCH /bookings/:id` business-logic beyond updating `specialRequests` text
  field (no saga re-orchestration on update)
- Expense Service (SM-08) — this service only publishes events consumed by SM-08

## Approach

The service follows the four-layer DDD architecture:
**Domain** (aggregates, value objects, domain services, events) →
**Application** (use cases, DTOs, mappers, read-model updater) →
**Infrastructure** (TypeORM repositories, HTTP clients, Kafka publisher/consumer) →
**Presentation** (NestJS controllers, guards, filters).

`CreateBookingUseCase` creates a `Booking` aggregate and calls
`BookingSagaOrchestrator.execute(booking)`. The orchestrator:
1. Persists a `BookingSaga` record (`STARTED`).
2. For each step: creates a `BookingStep` row, calls the downstream HTTP
   service, updates step status to `COMPLETED` or `FAILED`.
3. On all steps `COMPLETED`: confirms the booking aggregate, persists, publishes
   `BookingConfirmed` to Kafka, updates saga to `COMPLETED`.
4. On any step `FAILED`: executes compensating calls in reverse order, persists
   saga to `COMPENSATED`, publishes `BookingCancelled` to Kafka, rethrows.

`BookingReadModelUpdater` listens on the NestJS `EventBus` for local
`BookingConfirmed` and `BookingCancelled` domain events and upserts
`booking_read_model` rows (denormalized, optimised for query).

All three downstream HTTP clients (Policy, Inventory, Payment) are wrapped
independently with opossum circuit breakers (50%/10req/30s) and
`axios-retry` (3×, exponential backoff, ±25% jitter).

## Microservice Patterns Applied

| Pattern              | Justification                                                                                      |
|----------------------|----------------------------------------------------------------------------------------------------|
| Database-per-service | `booking-db` is an isolated PostgreSQL schema accessed by no other service                         |
| CQRS                 | Write model (5 tables, full aggregate state) and read model (`booking_read_model`) are distinct; read traffic uses the optimised projection |
| Saga (Orchestration) | Multi-service distributed transaction (Policy + Inventory + Payment) requires durable step tracking and compensating transactions |
| Idempotency          | Saga steps persist status before and after calls; duplicate Kafka consumer events checked by `eventId` |
| Timeouts             | Each HTTP client has connect (2 s) and read (5 s) timeouts; unbounded calls would break the booking SLA |
| Retries with Backoff | Transient downstream failures retried 3× before escalating to circuit breaker                      |
| Circuit Breaker      | Policy / Inventory / Payment service unavailability must not cause unbounded waits; compensation is triggered immediately when CB is open |
| Outbox               | Not applied — PROJECT.md §6 opts out; direct Kafka publish after DB commit is mandated             |

## Assumptions

- `@travel/shared` v1 exports `AggregateRoot`, `DomainEvent`, `DomainEventProps`,
  `TypedId`, `DomainException`, `ConflictException`, `NotFoundException`,
  `generateUuid`, `isValidUuid`, `KafkaModule`, `KAFKA_PRODUCER`, `KAFKA_CONSUMER`.
- Policy Service is reachable at `POLICY_SERVICE_URL`, exposes
  `POST /policies/validate` and responds within 500 ms.
- Inventory Service is reachable at `INVENTORY_SERVICE_URL`, exposes
  `POST /inventory/reservations` and `DELETE /inventory/reservations/:id`.
- Payment Service is reachable at `PAYMENT_SERVICE_URL`, exposes
  `POST /payments/authorize`, `POST /payments/:id/capture`,
  `POST /payments/:id/refund`.
- JWT validation is performed by the API Gateway; this service trusts the
  decoded JWT payload forwarded as a header.
- `tsconfig.json` uses `exactOptionalPropertyTypes: true` and
  `noUncheckedIndexedAccess: true` (inherits from `tsconfig.base.json`).
- TypeORM migrations run on service start in development; separate migration
  step enforced in production CI.
- `@pact-foundation/pact` transitive deps are broken in this workspace;
  contract tests use the local `__pact_stub__.js` pattern established in
  `policy-service`.
- `prom-client` duplicate-registration errors prevented by calling
  `prom.register.clear()` in `beforeEach` in all metrics-related specs.

## Open Questions

- None — all architectural decisions resolved per session context.
