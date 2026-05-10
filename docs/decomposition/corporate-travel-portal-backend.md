# Feature Decomposition: Corporate Travel Portal — Backend

## Summary

The Corporate Travel Portal backend is a greenfield microservices system built with Node.js 20 + NestJS 10 + TypeScript, applying Domain-Driven Design across six bounded contexts: Booking (core), Policy (core), Traveler (supporting), Payment (supporting), Inventory (generic), and Expense (supporting). Each bounded context maps to an independent NestJS service with its own database. Cross-service communication uses synchronous REST calls (via an API Gateway) and asynchronous Kafka events. This decomposition covers all eight backend implementation units — from the shared domain foundation through each microservice — sequenced to unblock parallel development while respecting hard dependency constraints.

## Source Documents

- `docs/ddd/DDD-Architecture.md` — Primary architecture reference (DDD model, C4 diagrams, folder structure, DB schema, event schemas, Docker Compose, observability)
- `PROJECT.md` — Repository structure, tech stack, team size, NFRs

---

## Sub-Modules

### [SM-01] Shared Domain Foundation

**OpenSpec Domain**: `shared-domain-foundation`

**Scope**: Implement all cross-service shared primitives: `AggregateRoot`, `Entity`, `ValueObject`, and `DomainEvent` base classes; common value objects (`Money`, `UUID`-typed IDs); shared repository and use-case interfaces; utility helpers (`uuid.util.ts`, `date.util.ts`); and the shared Kafka module (`KafkaModule`) that provides `KAFKA_PRODUCER` and `KAFKA_CONSUMER` injection tokens. This module is published as an internal shared library (or a `shared/` workspace package) consumed by every service.

**Key Requirements Addressed**:
- DDD Section 4.1.2: `Money` and `Itinerary` value objects with equality and validation semantics
- DDD Section 4.1.4: `IBookingRepository` interface pattern replicated for all services
- DDD Section 7.2: Reusable `KafkaModule` with producer/consumer factories
- DDD Section 11.1: `DomainEvent` base class with `eventId`, `correlationId`, `causationId`, `occurredOn`
- AGENTS.md §8: Shared base-classes at `shared/base-classes/`

**Contracts / Interfaces**:
- Exports: `AggregateRoot<T>`, `Entity<T>`, `ValueObject<T>`, `DomainEvent`
- Exports: `IRepository<T, ID>`, `IUseCase<TIn, TOut>`
- Exports: `Money`, `KafkaModule`, `uuid.util`, `date.util`
- DB tables: none (no persistence)
- Kafka topics: none (produces/consumes setup only)

**Prerequisites**: None

**Implementation Notes**: Publish as a workspace-local package (`@travel/shared`) so all services import consistently. Use `@nestjs/cqrs` `AggregateRoot` as the base if the team adopts NestJS CQRS module — otherwise implement a custom base. `Money` must enforce same-currency checks and immutability. Optimistic locking via a `version` field must be part of `AggregateRoot`.

---

### [SM-02] API Gateway Service

**OpenSpec Domain**: `api-gateway`

**Scope**: Implement the NestJS API Gateway (port 4000) that acts as the single entry point for the React SPA. Covers JWT authentication guard (validates tokens, extracts `JwtPayload`), RBAC roles guard, rate limiting middleware, circuit breaker for downstream services, request logging interceptor, and HTTP reverse-proxy routing to all six microservices. Includes health-check endpoint and `X-Correlation-ID` header propagation.

**Key Requirements Addressed**:
- DDD Section 6.4: API Gateway layer with Auth, Rate Limit, Circuit Breaker, Request Logging
- AGENTS.md §12: JWT tokens (8-hour expiry), RBAC (Employee/Manager/Admin)
- PROJECT.md §3: `api-gateway/src/auth/`, `rate-limit/`, `routing/`, `circuit-breaker/`
- DDD Section 9.3: Docker Compose `api-gateway` service with env vars for all downstream URLs

**Contracts / Interfaces**:
- Exposes: `POST /auth/login`, `POST /auth/refresh`, `GET /health`
- Proxies: all `/bookings`, `/policies`, `/travelers`, `/payments`, `/inventory`, `/expenses` routes
- Depends on: `@travel/shared` (JWT payload types, correlation ID utilities)
- Environment: `JWT_SECRET`, `BOOKING_SERVICE_URL`, `POLICY_SERVICE_URL`, `TRAVELER_SERVICE_URL`, `PAYMENT_SERVICE_URL`, `INVENTORY_SERVICE_URL`, `EXPENSE_SERVICE_URL`, `REDIS_URL`

**Prerequisites**: [SM-01]

**Implementation Notes**: Use `@nestjs/passport` + `passport-jwt` for JWT guard. Use `nestjs-rate-limiter` or `@nestjs/throttler` for rate limiting backed by Redis. Circuit breaker can use `opossum` library. All downstream HTTP calls must forward `X-Correlation-ID`. OpenAPI spec for the gateway should document auth endpoints only; downstream service specs document their own endpoints.

---

### [SM-03] Traveler Service

**OpenSpec Domain**: `traveler-service`

**Scope**: Implement the Traveler bounded context (port 3003) covering the `Traveler` aggregate root with value objects `TravelerId`, `Email`, `EmployeeId`, and `TravelerPreferences`. `Manager` role is represented as the `MANAGER` enum value on the `Traveler.role` field (no separate `Manager` entity). `TravelerProfile` is inlined into `Traveler` (single aggregate, no separate profile entity). Covers all 9 REST endpoints: `GET /travelers`, `POST /travelers`, `GET /travelers/:id`, `PATCH /travelers/:id`, `DELETE /travelers/:id`, `GET /travelers/:id/preferences`, `PUT /travelers/:id/preferences`, `POST /travelers/sync` (HR bulk upsert — REST endpoint backed by `SyncTravelersUseCase`, not a background-only job), and `GET /admin/travelers`. GDPR: soft-delete (`deletedAt`) + nightly NestJS `@Cron` PII anonymisation after 30 days. PostgreSQL persistence via TypeORM with single `travelers` table. Redis cache-aside (TTL 1 h). Circuit Breaker + Retry on HR SOAP stub.

**Key Requirements Addressed**:
- DDD Section 3.2.3: Traveler Context — aggregates, entities, value objects, domain events
- DDD Section 1.3: Traveler Management — employee profiles and preferences
- AGENTS.md §12: GDPR right to access, erasure, portability for personal data
- AGENTS.md §9: `TravelerCreated`, `TravelerUpdated`, `TravelerDeleted` event schema with `eventId`, `aggregateId`, `occurredOn`, `correlationId`

**Contracts / Interfaces**:
- REST endpoints (9 total): `GET /travelers`, `POST /travelers`, `GET /travelers/:id`, `PATCH /travelers/:id`, `DELETE /travelers/:id`, `GET /travelers/:id/preferences`, `PUT /travelers/:id/preferences`, `POST /travelers/sync`, `GET /admin/travelers`
- Kafka events published: fine-grained topics — `traveler.created` (`TravelerCreated`), `traveler.updated` (`TravelerUpdated`), `traveler.deleted` (`TravelerDeleted`)
- DB: PostgreSQL `traveler-db` — single table: `travelers` (all profile data incl. preferences JSONB column)
- OpenAPI spec: `docs/contracts/openapi/openapi-traveler-service.yaml`
- Shared: `TravelerId` value object (from [SM-01])

**Design Decisions** (documented scope changes from initial estimate):
- `TravelerProfile` and `Manager` entities consolidated into `Traveler` aggregate + `role` enum — reduces join complexity and is consistent with DDD bounded-context cohesion principle.
- `PreferencesUpdated` event renamed to `TravelerUpdated` (with `changedFields` discriminator) — single event type for all profile mutations reduces consumer coupling.
- HR sync exposed as REST endpoint `POST /travelers/sync` (not background-only) — allows external trigger and observable response payload.
- EMPLOYEE role may only update their own preferences (`travelerId` in path must match JWT subject).
- Soft-deleted profiles silently excluded from non-admin list (`GET /travelers`) — no `deleted: true` flag exposed to non-admin callers.

**Prerequisites**: [SM-01]

**Implementation Notes**: GDPR PII anonymisation runs as NestJS `@Cron('0 2 * * *')` inside the service (nightly, 02:00 UTC). HR SOAP stub wraps the external HR system behind an anticorruption layer — `HR_SYSTEM_URL` is a single endpoint for all HR operations. Circuit Breaker (opossum, 50%/10req/30s) wraps the SOAP stub. `TravelerId` is the canonical cross-service traveler identifier.

---

### [SM-04] Inventory Service

**OpenSpec Domain**: `inventory-service`

**Scope**: Implement the Inventory bounded context (port 3005) covering the `FlightOffer` and `Reservation` aggregates, `Segment` and `Pricing` entities, `Airport` and `FlightNumber` value objects, and the `AmadeusAdapter` anticorruption layer. Covers flight search use case (calls Amadeus API, maps to domain offers, caches results in Redis), reservation creation/cancellation, and `OfferExpired` / `ReservationCreated` Kafka events. MongoDB persistence via Mongoose.

**Key Requirements Addressed**:
- DDD Section 3.2.5: Inventory Context — Amadeus anticorruption layer, reservation lifecycle
- DDD Section 1.3: Travel Search & Booking — find flights via Amadeus API
- DDD Section 6.4: Inventory Service uses MongoDB (flexible schema for Amadeus offer data)
- AGENTS.md §8: Retries + Circuit Breaker pattern for Amadeus external calls

**Contracts / Interfaces**:
- REST endpoints: `GET /inventory/offers?origin=&destination=&date=`, `POST /inventory/reservations`, `DELETE /inventory/reservations/:id`
- Kafka events published: `inventory-events` topic — `ReservationCreated`, `OfferExpired`
- DB: MongoDB `inventory-db` — collections: `flight_offers`, `reservations`
- Cache: Redis for offer search results (TTL = offer expiry window)
- OpenAPI spec: `docs/contracts/openapi/inventory-service.yaml`
- External: Amadeus API (REST, API key + secret)

**Prerequisites**: [SM-01]

**Implementation Notes**: `AmadeusAdapter` is the only code that knows the Amadeus schema — translate all external types at the boundary. Use `amadeus` npm SDK. Offer cache TTL must align with Amadeus offer expiry (typically 15 minutes). Reservation has a time-to-live; expired reservations must be compensated automatically. Apply Circuit Breaker (opossum) around Amadeus calls.

---

### [SM-05] Policy Service

**OpenSpec Domain**: `policy-service`

**Scope**: Implement the Policy bounded context (port 3002) covering the `TravelPolicy` and `PolicyRule` aggregates, `PolicyViolation` and `ApprovalWorkflow` entities, `PolicyConstraints` and `ValidationResult` value objects, and the `PolicyValidator` and `ApprovalEngine` domain services. Covers CRUD for policies and rules, synchronous policy-validation endpoint called by the Booking Service, budget availability check (via HTTP call to a future Budget Context or inline budget table), and Kafka publishing of `PolicyValidated` / `PolicyViolationDetected` events. PostgreSQL persistence.

**Key Requirements Addressed**:
- DDD Section 3.2.2: Policy Context — enforce travel policies, manage approvals
- DDD Section 4.2: `TravelPolicy` aggregate, `PolicyRule` entity, `PolicyValidator` domain service
- DDD Section 1.3: Policy Management — define and enforce travel policies; Budget Management — track budgets
- AGENTS.md §12: Manager/Admin roles required for policy CRUD

**Contracts / Interfaces**:
- REST endpoints: `POST /policies`, `GET /policies/:id`, `PUT /policies/:id`, `POST /policies/validate` (called by Booking Service)
- Kafka events published: `policy-events` topic — `PolicyValidated`, `PolicyViolationDetected`
- DB: PostgreSQL `policy-db` — tables: `travel_policies`, `policy_rules`, `policy_violations`, `approval_workflows`, `departmental_budgets`
- OpenAPI spec: `docs/contracts/openapi/policy-service.yaml`
- Depends on: `TravelerId` (from [SM-01] shared types); Traveler Service (`GET /travelers/:id`) for department resolution

**Prerequisites**: [SM-01], [SM-03]

**Implementation Notes**: Budget tracking is owned by the Policy Service (not a separate microservice, per current bounded context map). `POST /policies/validate` must be synchronous and respond within 500ms SLA. `PolicyRule` evaluation uses a strategy pattern keyed on `RuleType`. Approval workflow is async — `REQUIRES_APPROVAL` violations create an `ApprovalWorkflow` record and notify the manager (future notification hook).

---

### [SM-06] Payment Service

**OpenSpec Domain**: `payment-service`

**Scope**: Implement the Payment bounded context (port 3004) covering the `Payment` aggregate, `PaymentMethod` and `Refund` entities, `Money` and `CardDetails` value objects, and the `StripeAdapter` anticorruption layer. Covers payment authorization (create Stripe PaymentIntent with `capture_method: manual`), capture on booking confirmation, refund on cancellation, and Kafka publishing of `PaymentAuthorized`, `PaymentCaptured`, `PaymentFailed`, and `PaymentRefunded` events. PostgreSQL persistence.

**Key Requirements Addressed**:
- DDD Section 3.2.4: Payment Context — process payments via Stripe
- DDD Section 4.3: `Payment` aggregate, `StripeAdapter`, `PaymentMethod` value object (PCI-DSS compliant)
- DDD Section 1.3: Payment Processing — secure payment via Stripe
- AGENTS.md §12: PCI-DSS — never store full card numbers; use Stripe tokenization

**Contracts / Interfaces**:
- REST endpoints: `POST /payments/authorize`, `POST /payments/:id/capture`, `POST /payments/:id/refund`, `GET /payments/:id`
- Kafka events published: `payment-events` topic — `PaymentAuthorized`, `PaymentCaptured`, `PaymentFailed`, `PaymentRefunded`
- DB: PostgreSQL `payment-db` — tables: `payments`, `payment_methods`, `refunds`
- External: Stripe API (stripe npm SDK, `STRIPE_API_KEY` env var)
- OpenAPI spec: `docs/contracts/openapi/payment-service.yaml`
- Shared: `Money` value object (from [SM-01])

**Prerequisites**: [SM-01]

**Implementation Notes**: Never log or persist full card numbers — store only Stripe `paymentMethodId` and `last4`/`brand` from Stripe response. Authorization (manual capture) allows the Booking Service saga to capture only on confirmed booking or void on cancellation. Implement idempotency: check `eventId` before processing Kafka-triggered payment actions. Use Stripe webhook validation for inbound Stripe events (future scope — not in initial cut).

---

### [SM-07] Booking Service

**OpenSpec Domain**: `booking-service`

**Scope**: Implement the Booking bounded context (port 3001) — the core domain service that orchestrates the full booking lifecycle via the `BookingSagaOrchestrator`. Covers the `Booking` aggregate root, `BookingSaga` entity, `BookingStep` entity, `Itinerary` and `TripDetails` value objects, CQRS split (command side with `CreateBookingUseCase` / `CancelBookingUseCase`; query side with `BookingQueryService` and `BookingReadModel`), and Kafka publishing of `BookingCreated`, `BookingConfirmed`, `BookingCancelled`. PostgreSQL persistence (write model + read model) with event store table for event sourcing.

**Key Requirements Addressed**:
- DDD Section 3.2.1: Booking Context — orchestrate trip bookings using Saga pattern
- DDD Section 4.1: `Booking` aggregate, `BookingSagaOrchestrator`, `BookingSaga`, value objects
- DDD Section 5.2–5.3: `CreateBookingUseCase`, `BookingCommandService`, `BookingQueryService`, `BookingReadModel`
- DDD Section 12.1: Full DB schema — `bookings`, `booking_sagas`, `booking_saga_steps`, `event_store`, `booking_read_model`
- AGENTS.md §9: Choreography-based saga; compensating transactions on failure

**Contracts / Interfaces**:
- REST endpoints: `POST /bookings`, `GET /bookings/:id`, `GET /bookings?travelerId=`, `POST /bookings/:id/cancel`
- Kafka events published: `booking-events` topic — `BookingCreated`, `BookingConfirmed`, `BookingCancelled`
- Kafka events consumed: `payment-events` (`PaymentCaptured`, `PaymentFailed`) to advance/compensate saga
- DB: PostgreSQL `booking-db` — tables per DDD §12.1
- Synchronous HTTP calls: Policy Service `POST /policies/validate`, Inventory Service `POST /inventory/reservations`, Payment Service `POST /payments/authorize` + `POST /payments/:id/capture`
- OpenAPI spec: `docs/contracts/openapi/booking-service.yaml`
- Shared: `Money`, `Itinerary`, `TravelerId`, `BookingId` (from [SM-01])

**Prerequisites**: [SM-01], [SM-03], [SM-04], [SM-05], [SM-06]

**Implementation Notes**: The saga must be durable — persist each step's status so it survives service restarts. Compensating transactions: cancel reservation (Inventory), void payment (Payment) in reverse order. Read model (`booking_read_model`) is updated by `BookingReadModelUpdater` event handler consuming local `BookingConfirmed` events — denormalize `travelerName` from the event payload. Apply optimistic locking (`@VersionColumn`) on `bookings` table to prevent concurrent mutation. All outbound HTTP calls must have retry (3×, exponential backoff) and circuit breaker.

---

### [SM-08] Expense Service

**OpenSpec Domain**: `expense-service`

**Scope**: Implement the Expense bounded context (port 3006) covering the `Receipt` and `Expense` aggregates, `ExpenseReport` entity, `ReceiptLine` and `TaxInfo` value objects, and `ReceiptGenerator` and `ExpenseReporter` domain services. Consumes `BookingConfirmed` and `BookingCancelled` Kafka events to automatically generate receipts and record expenses. Provides expense report queries per traveler/department. PostgreSQL persistence.

**Key Requirements Addressed**:
- DDD Section 3.2.6: Expense Context — generate receipts, track expenses, provide reports
- DDD Section 7.2: `BookingEventListener` consumes `BookingConfirmed` → `GenerateReceiptUseCase`
- DDD Section 1.3: Expense Tracking — automated receipt generation and reporting
- AGENTS.md §10: Idempotency — check `eventId` before processing to avoid duplicate receipts

**Contracts / Interfaces**:
- REST endpoints: `GET /expenses?travelerId=`, `GET /expenses/reports?departmentId=&from=&to=`, `GET /receipts/:id`
- Kafka events consumed: `booking-events` topic — `BookingConfirmed`, `BookingCancelled`
- Kafka events published: `expense-events` topic — `ReceiptGenerated`, `ExpenseRecorded`
- DB: PostgreSQL `expense-db` — tables: `receipts`, `expenses`, `expense_reports`, `processed_events` (idempotency table)
- OpenAPI spec: `docs/contracts/openapi/expense-service.yaml`
- Shared: `Money` (from [SM-01])

**Prerequisites**: [SM-01], [SM-07]

**Implementation Notes**: Consumer must be idempotent — insert `eventId` into `processed_events` table and skip if already present. Receipt generation should produce a structured receipt record (not a PDF file in v1; PDF export is a future enhancement). `BookingCancelled` event should mark the associated receipt as void and update the expense status. Expense reports aggregate by `departmentId` derived from the traveler data embedded in the `BookingConfirmed` event payload.

---

## Dependency Order (Suggested Implementation Sequence)

| Wave | Sub-Modules | Reason |
|------|-------------|--------|
| Wave 1 | **SM-01** (Shared Foundation) | No dependencies; all other modules import from here |
| Wave 2 | **SM-02** (API Gateway), **SM-03** (Traveler), **SM-04** (Inventory), **SM-06** (Payment) | All depend only on SM-01; can be developed in parallel |
| Wave 3 | **SM-05** (Policy) | Depends on SM-01 + SM-03 (department resolution via Traveler API) |
| Wave 4 | **SM-07** (Booking) | Depends on all prior services: SM-03, SM-04, SM-05, SM-06 |
| Wave 5 | **SM-08** (Expense) | Depends on SM-01 + SM-07 (consumes `BookingConfirmed` events) |

```
SM-01
├── SM-02 (parallel)
├── SM-03 (parallel)
│   └── SM-05
│       └── SM-07
│           └── SM-08
├── SM-04 (parallel)
│   └── SM-07
└── SM-06 (parallel)
    └── SM-07
```

---

## Cross-Cutting Concerns

### Authentication & Authorization
Every service controller (except `/health` and `/metrics`) must apply the `JwtAuthGuard` and `RolesGuard`. JWT payload must carry `userId`, `roles`, and `departmentId`. The API Gateway validates tokens centrally; downstream services re-validate the forwarded JWT for defense-in-depth.

### Observability (per AGENTS.md §11)
Each service must expose:
- **Prometheus metrics** at `GET /metrics`: `http_requests_total`, `http_request_duration_seconds`, and at least one business counter (e.g., `bookings_created_total`).
- **Jaeger traces**: auto-instrumented via `@opentelemetry/auto-instrumentations-node` for HTTP, DB, and Kafka spans.
- **Winston structured logs**: JSON format with `timestamp`, `level`, `service`, `correlationId`, `message`, `context` fields.
- `X-Correlation-ID` header must be propagated through all synchronous HTTP calls and embedded in all Kafka event headers (`correlation-id`).

### Error Handling
All services must implement an NestJS `HttpExceptionFilter` that serializes errors to `{ statusCode, message, errorCode, correlationId }`. Domain exceptions (e.g., `PolicyViolationException`, `InvalidStateException`) must map to appropriate HTTP status codes (422, 409 respectively).

### Database Migrations
Every service uses TypeORM migrations (or Mongoose scripts for Inventory). Migrations live at `infrastructure/persistence/migrations/`. No `synchronize: true` in production. Migration files follow naming: `<timestamp>-<description>.ts`.

### Testing Standards (per AGENTS.md §10, ADR-010)
- **Unit tests** (70%): test aggregates, value objects, use cases — no external deps, all mocked.
- **Integration tests** (20%): test repositories with real PostgreSQL/MongoDB via Testcontainers; test Kafka handlers.
- **E2E tests** (10%): critical path — booking creation flow, policy validation, payment capture.
- **Coverage target**: 80% minimum enforced in CI.

### Security
- Never commit secrets; use `.env` for development, Kubernetes Secrets for production.
- Stripe: use `capture_method: manual`; never log card data.
- GDPR: `DELETE /travelers/:id` anonymizes PII in-place.
- All inter-service HTTP must run over TLS in production (Kubernetes `mTLS` via service mesh).

### Shared Kafka Topics

| Topic | Producers | Consumers |
|-------|-----------|-----------|
| `booking-events` | Booking Service | Expense Service, read-model updater |
| `payment-events` | Payment Service | Booking Service (saga advance/compensate) |
| `policy-events` | Policy Service | (future — audit log) |
| `inventory-events` | Inventory Service | (future — offer expiry notifications) |
| `traveler-events` | Traveler Service | (future — notification service) |
| `expense-events` | Expense Service | (future — finance reporting) |

---

## Recommended Next Step

Run the `spec-generator` skill, passing this decomposition and `docs/ddd/DDD-Architecture.md` as source documents. Start with Wave 1 — **SM-01 (Shared Domain Foundation)** — to unblock all parallel Wave 2 work.
