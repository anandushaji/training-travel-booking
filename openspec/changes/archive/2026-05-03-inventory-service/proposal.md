# Proposal: Inventory / Flight Search Service (SM-04)

## Intent

Implement the `inventory-service` (port 3005) — a NestJS microservice that wraps the Amadeus GDS REST API to provide real-time flight search and seat reservation capabilities for the Corporate Travel Portal. The service enables employees to search available flights, hold a seat for 15 minutes while the booking flow completes, and release or cancel reservations. It enforces cache-aside for flight search results to reduce Amadeus API cost and latency, and publishes Kafka events so the `booking-service` Saga can react to reservation lifecycle transitions.

## Scope

### In Scope

- NestJS application bootstrap: port 3005, environment config, TypeORM + PostgreSQL 15 connection, Redis (ioredis), KafkaJS producer
- `FlightReservation` aggregate with value objects: `FlightReservationId`, `FlightSegment`, `PassengerDetails`, `ReservationStatus` (PENDING / CONFIRMED / CANCELLED / EXPIRED)
- Domain events: `FlightReserved`, `FlightReservationCancelled`, `FlightReservationExpired`
- PostgreSQL migration and TypeORM entity for `flight_reservations` table
- Amadeus OAuth2 client (`AmadeusTokenService`): client_credentials grant, in-memory token cache with TTL
- Amadeus HTTP client (`AmadeusHttpClient`): axios + opossum circuit breaker (50% / 10 req / 30 s) + retry (3×, exponential backoff 200 ms / 5 s / jitter) + timeouts (connect 2 s, read 15 s per PROJECT.md inventory-service override)
- Redis flight-search cache service (`FlightSearchCacheService`): key `inventory:flight-search:<SHA-256(canonical params)>`, TTL 5 min
- Idempotency guard on `POST /flights/reservations`: Redis key `inventory:idempotency:<Idempotency-Key>`, TTL 24 h
- Application use cases: `SearchFlightsUseCase`, `CreateReservationUseCase`, `GetReservationUseCase`, `CancelReservationUseCase`
- Kafka event publisher (`InventoryEventPublisher`): topic `inventory-events`
- Reservation expiry background job (`ReservationExpiryJob`): `@Cron('* * * * *')`, marks PENDING reservations with `expiresAt < now()` as EXPIRED, publishes `FlightReservationExpired`
- Presentation layer: `FlightsController`, `ReservationsController`, request/response DTOs, JWT RBAC guards (`Employee`, `Manager`, `Admin` roles)
- Observability: Prometheus counters/histograms, OpenTelemetry spans, Winston JSON structured logs with `correlationId`
- Integration tests with Testcontainers (PostgreSQL + Redis + Amadeus mock server)
- 80% test coverage enforcement

### Out of Scope

- Hotel, car, or rail inventory (separate bounded contexts)
- Pricing logic, fare calculation, ancillary upsell
- Payment handling (owned by `payment-service`, SM-06)
- Booking orchestration and Saga coordination (owned by `booking-service`, SM-05)
- Frontend SPA components and RTK Query API definitions
- Outbox relay (not implemented per PROJECT.md §6 — direct Kafka publish)
- Read model / CQRS projection (no separate read store needed)
- MongoDB-backed flexible flight schema (PROJECT.md notes MongoDB for inventory, but per SM-04 spec the service owns a PostgreSQL reservations table; flight search results are not persisted at all)
- Consumer-side idempotency for incoming Kafka events (no subscriptions in this service)

## Deviation from Decomposition

The SM-04 entry in `docs/decomposition/corporate-travel-portal-backend.md` specified:
- **MongoDB 7** persistence (`inventory-db`) with `flight_offers` and `reservations` collections
- **Two aggregates**: `FlightOffer` (with `Segment` and `Pricing` entities) and `Reservation`
- **REST endpoints** at `/inventory/offers` and `/inventory/reservations`
- **Kafka topic** `inventory-events` with events `ReservationCreated` / `OfferExpired`

**This change deviates from the decomposition as follows:**

| Area | Decomposition | This Change | Decision |
|---|---|---|---|
| Persistence | MongoDB 7 | PostgreSQL 15 | PostgreSQL adopted: SM-04 scope only persists `FlightReservation` aggregates (structured relational data); flight offers are not persisted at all (ephemeral DTOs). MongoDB's flexible schema is unnecessary for this scope. ADR-004 amendment filed (see `docs/adr/ADR-004-Amendment-01.md`). |
| Aggregates | `FlightOffer` + `Reservation` | `FlightReservation` only | `FlightOffer` aggregate omitted: Amadeus offers are not persisted; the aggregate was unneeded. `Reservation` renamed `FlightReservation` for clarity. |
| REST paths | `/inventory/offers`, `/inventory/reservations` | `/api/v1/flights/search`, `/api/v1/flights/reservations` | Paths aligned with API Gateway versioning convention (`/api/v1/`). |
| Kafka topic | `inventory-events` (single) | `inventory-events` (single) | Single topic retained per ADR-003. Event names updated: `ReservationCreated` → `FlightReserved`, `ReservationCancelled` → `FlightReservationCancelled`, `OfferExpired` → `FlightReservationExpired`. |

**Impact on downstream services**: SM-07 (Booking Service) must be updated to subscribe to topic `inventory-events` with event types `FlightReserved`, `FlightReservationCancelled`, and `FlightReservationExpired` rather than `ReservationCreated` and `OfferExpired`. SM-07 REST integration must use `POST /api/v1/flights/reservations` rather than `POST /inventory/reservations`.

## Risks

### R-01 — SM-07 Booking Service Contract Divergence (HIGH)

The SM-07 (Booking Service) decomposition entry expects:
- REST endpoint: `POST /inventory/reservations`
- Kafka topic: `inventory-events`, event: `ReservationCreated`

This change delivers:
- REST endpoint: `POST /api/v1/flights/reservations`
- Kafka topic: `inventory-events`, event: `FlightReserved`

**Resolution**: SM-07's spec and implementation must be updated before the booking saga is implemented. The REST path change requires an API Gateway route mapping update. The event name change requires SM-07's saga to consume `FlightReserved` instead of `ReservationCreated`.

**Status**: Accepted — SM-07 will be updated at spec-generation time (not blocking SM-04 implementation).

## Approach

The service is built following the DDD 4-layer architecture (domain → application → infrastructure → presentation). Flight search results from Amadeus are served directly — they are never written to the database. Only `FlightReservation` aggregates are persisted (PostgreSQL). Redis cache-aside reduces repeated Amadeus calls for identical search queries within a 5-minute window. All Amadeus HTTP calls are protected by a circuit breaker (opossum), retry with exponential backoff, and explicit timeouts, conforming to ADR-011. `POST /flights/reservations` is made idempotent via `Idempotency-Key` header to prevent double-hold on client retry. Kafka events are published directly after DB commit (no Outbox). A NestJS scheduled job polls every minute to expire stale PENDING reservations.

## Microservice Patterns Applied

| Pattern | Justification |
|---|---|
| Database-per-service | `inventory-service` owns its own PostgreSQL schema; no other service queries it directly (ADR-001, ADR-004) |
| Idempotency | `POST /flights/reservations` with `Idempotency-Key` header prevents duplicate seat holds on client retry; stored in Redis 24 h (ADR-011) |
| Timeouts | All Amadeus HTTP calls have explicit connect (2 s) and read (15 s) timeouts (PROJECT.md inventory-service override, ADR-011) |
| Retries with Backoff | Amadeus calls retry 3× on retryable HTTP codes (500/502/503/504/408) with exponential backoff; non-retryable codes fail immediately (ADR-011) |
| Circuit Breaker | Amadeus HTTP client wrapped in opossum; 50% error rate / 10 req / 30 s window; fallback 503; half-open 30 s (ADR-011) |
| Cache-aside | Flight search results cached in Redis `inventory:flight-search:<hash>` TTL 5 min; cache miss triggers Amadeus call and repopulates cache (ADR-002, ADR-004) |

## Assumptions

- `@travel/shared` (SM-01) is published and provides: `KafkaModule`, `AggregateRoot`, `DomainEvent`, `IRepository`, `TypedId`.
- Amadeus test environment (`https://test.api.amadeus.com`) is accessible from the development cluster; base URL controlled by `AMADEUS_BASE_URL` env var.
- Redis 7 is available at `REDIS_URL`; used for both search cache and idempotency keys with separate key namespaces.
- PostgreSQL 15 instance dedicated to `inventory-service` is provisioned (schema: `inventory`).
- Kafka topic `inventory-events` is pre-created with replication factor 2.
- JWT validation is performed at the API Gateway; `inventory-service` receives pre-validated JWT claims in request headers.
- The 15-minute reservation hold duration is currently treated as a fixed constant (`RESERVATION_HOLD_MINUTES=15`); see Open Questions.

## Open Questions

1. **Amadeus environment strategy** — RESOLVED: Single `AMADEUS_BASE_URL` env var toggleing between sandbox and production per environment. One Kubernetes Secret per environment (`inventory-service-secrets`) with the appropriate base URL and credentials. Simpler to operate than maintaining two secret sets.
2. **Reservation hold duration configurability** — RESOLVED: Operator-configurable via `RESERVATION_HOLD_MINUTES` env var (default: 15). This allows operational adjustment without a code deploy. Configurable values ≤ 30 min are supported; changes exceeding 30 min require review as they impact Amadeus seat hold guarantees.
3. **Cache key collision risk on date format variation**: If callers pass `departureDate` in different ISO formats (e.g., `2026-06-01` vs `2026-06-01T00:00:00Z`), SHA-256 hashes will differ despite representing the same date. Should the service canonicalise date params to `YYYY-MM-DD` before hashing, and if so, reject non-conforming inputs with 400 or silently normalise them?
4. **MongoDB vs PostgreSQL** — RESOLVED: PostgreSQL only. SM-04 only persists `FlightReservation` aggregates (structured relational data); Amadeus flight offers are ephemeral (not persisted). MongoDB is unnecessary for this scope. ADR-004 amendment filed. See "Deviation from Decomposition" section.
