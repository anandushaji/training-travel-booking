# Tasks: Inventory / Flight Search Service (SM-04)

> Every task below follows the AC Verification Policy
> (`docs/workflow/acceptance-criteria.md`): every Acceptance Criterion is
> paired with a named, automatically executable verification artifact and a
> "Must fail if" note describing the THEN mutation it would detect.

---

## Implementation Checklist

- [x] T00: Install production and test dependencies
- [x] T01: Bootstrap NestJS app, environment config, TypeORM + PostgreSQL
- [x] T02: Domain layer — `FlightReservation` aggregate, value objects, domain events
- [x] T02a: Domain exceptions for Amadeus integration
- [x] T03: Database migration — `flight_reservations` table
- [x] T04: TypeORM entity + repository
- [x] T05: Amadeus OAuth2 token client (`AmadeusTokenService`)
- [x] T06: Amadeus HTTP client (`AmadeusHttpClient`): axios + circuit breaker + retry + timeout
- [x] T07: Redis search cache service (`FlightSearchCacheService`)
- [x] T08: Application use case — `SearchFlightsUseCase` (cache-aside)
- [x] T09: Application use case — `CreateReservationUseCase` (idempotency + Amadeus + DB + Kafka)
- [x] T10: Application use cases — `GetReservationUseCase`, `CancelReservationUseCase`
- [x] T11: Kafka event publisher (`InventoryEventPublisher`)
- [x] T12: Reservation expiry background job (`ReservationExpiryJob`)
- [x] T13: Presentation layer — controllers, DTOs, RBAC guards
- [x] T14: Observability instrumentation (Prometheus metrics, OTel traces)
- [x] T15: Integration tests (Testcontainers PostgreSQL + Redis + Amadeus mock)
- [x] T16: End-to-end wiring, smoke test, verify 80% coverage
- [x] T17: Kafka contract tests for `inventory-events` (FlightReserved, FlightReservationCancelled, FlightReservationExpired)

---

## Task Details

---

### T00: Install Production and Test Dependencies

**Files affected**:
- `inventory-service/package.json`

**Description**: Install all production and development dependencies required by the inventory-service. Run in `inventory-service/` directory:

```bash
npm install --save opossum@8.1.3 @types/opossum@8.1.1 axios@1.7.2 ioredis@5.3.2 prom-client@15.1.3 @nestjs/schedule@4.0.1 @opentelemetry/sdk-node@0.51.1 @opentelemetry/auto-instrumentations-node@0.46.1
npm install --save-dev nock@13.5.4 axios-mock-adapter@1.22.0 @testcontainers/postgresql@10.9.0 @testcontainers/redis@10.9.0 @pact-foundation/pact@13.1.3
```

**Acceptance criteria**:
- AC-01: `npm install` completes without error and all packages above appear in `node_modules/`.

**Verification artifacts**:
- AC-01 → Manual verification: `node -e "require('opossum'); require('nock'); console.log('ok')"` in `inventory-service/` directory outputs `ok`.
  - Must fail if: any package above is not listed in `package.json` dependencies.

---

### T01: Bootstrap NestJS App, Environment Config, TypeORM + PostgreSQL

**Files affected**:
- `inventory-service/src/main.ts`
- `inventory-service/src/app.module.ts`
- `inventory-service/src/config/inventory.config.ts`
- `inventory-service/package.json`
- `inventory-service/.env.example`
- `inventory-service/tsconfig.json`

**Description**: Initialise the NestJS application on port 3005. Register `ConfigModule` (with validation via `Joi` schema in `src/config/env.validation.ts`, consistent with `traveler-service` — use `Joi.object({ PORT: Joi.number().default(3005), DATABASE_URL: Joi.string().required(), ... })`), `TypeOrmModule` (PostgreSQL 15, pool max 20, schema `inventory`), `ScheduleModule`, and `ThrottlerModule`. Required env vars: `PORT`, `DATABASE_URL`, `REDIS_URL`, `KAFKA_BROKERS`, `AMADEUS_BASE_URL`, `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET`, `RESERVATION_HOLD_MINUTES` (default 15). Global exception filter registering `DomainException` → appropriate HTTP status. Global `ValidationPipe` (whitelist, forbidNonWhitelisted).

**Acceptance criteria**:
- AC-01: Application starts on the configured `PORT` and the `/api/v1/health` endpoint returns HTTP 200 with `{ status: "ok", service: "inventory-service" }`.
- AC-02: Starting the application with a missing required env var (`DATABASE_URL`) throws a `ConfigValidationError` at startup and the process exits with code 1.

**Verification artifacts**:
- AC-01 → `inventory-service/src/app.module.spec.ts::should respond 200 on /api/v1/health` (layer: integration)
  - Must fail if: the health endpoint is removed or returns a non-200 status code.
- AC-02 → `inventory-service/src/config/inventory.config.spec.ts::should throw ConfigValidationError when DATABASE_URL is missing` (layer: unit)
  - Must fail if: the config schema does not declare `DATABASE_URL` as required or the validation is bypassed.

---

### T02: Domain Layer — FlightReservation Aggregate, Value Objects, Domain Events

**Files affected**:
- `inventory-service/src/domain/aggregates/flight-reservation.aggregate.ts`
- `inventory-service/src/domain/value-objects/flight-reservation-id.value-object.ts`
- `inventory-service/src/domain/value-objects/flight-segment.value-object.ts`
- `inventory-service/src/domain/value-objects/passenger-details.value-object.ts`
- `inventory-service/src/domain/value-objects/reservation-status.value-object.ts`
- `inventory-service/src/domain/events/flight-reserved.event.ts`
- `inventory-service/src/domain/events/flight-reservation-cancelled.event.ts`
- `inventory-service/src/domain/events/flight-reservation-expired.event.ts`
- `inventory-service/src/domain/repositories/flight-reservation.repository.interface.ts`

**Description**: Implement the `FlightReservation` aggregate extending `@travel/shared`'s `AggregateRoot`. Implement all four value objects (immutable, validated in constructor). Implement `FlightReserved`, `FlightReservationCancelled`, `FlightReservationExpired` domain events extending `DomainEvent`. Implement the `IFlightReservationRepository` interface. All domain code must be pure TypeScript with zero I/O dependencies.

**Acceptance criteria**:
- AC-01: `FlightReservation.create(props)` returns a new aggregate with `status = PENDING`, `expiresAt = createdAt + RESERVATION_HOLD_MINUTES`, and exactly one uncommitted `FlightReserved` event.
- AC-02: Calling `expire()` on a PENDING aggregate transitions `status` to `EXPIRED` and raises `FlightReservationExpired`; calling `expire()` on a non-PENDING aggregate throws `DomainException` with code `INVALID_STATUS_TRANSITION`.
- AC-03: Calling `cancel()` on an EXPIRED aggregate throws `DomainException` with code `INVALID_STATUS_TRANSITION` and emits no domain event.
- AC-04: `FlightSegment` value object throws when `origin === destination`.
- AC-05: `FlightSegment` value object throws when `departureDate >= arrivalDate`.

**Verification artifacts**:
- AC-01 → `inventory-service/src/domain/aggregates/flight-reservation.aggregate.spec.ts::should create reservation with PENDING status and FlightReserved event` (layer: unit)
  - Must fail if: the factory does not set `status = PENDING` or omits adding `FlightReserved` to uncommitted events.
- AC-02 → `inventory-service/src/domain/aggregates/flight-reservation.aggregate.spec.ts::should transition to EXPIRED and raise FlightReservationExpired when expire() called on PENDING aggregate` (layer: unit)
  - Must fail if: `expire()` does not change status to `EXPIRED` or does not raise the domain event.
- AC-02b → `inventory-service/src/domain/aggregates/flight-reservation.aggregate.spec.ts::should throw INVALID_STATUS_TRANSITION when expire() called on CONFIRMED aggregate` (layer: unit)
  - Must fail if: `expire()` allows transition from non-PENDING states.
- AC-03 → `inventory-service/src/domain/aggregates/flight-reservation.aggregate.spec.ts::should throw INVALID_STATUS_TRANSITION when cancel() called on EXPIRED aggregate` (layer: unit)
  - Must fail if: `cancel()` succeeds on an EXPIRED aggregate or emits a domain event.
- AC-04 → `inventory-service/src/domain/value-objects/flight-segment.value-object.spec.ts::should throw when origin equals destination` (layer: unit)
  - Must fail if: `FlightSegment` allows `origin === destination`.
- AC-05 → `inventory-service/src/domain/value-objects/flight-segment.value-object.spec.ts::should throw when departureDate is not before arrivalDate` (layer: unit)
  - Must fail if: `FlightSegment` allows `departureDate >= arrivalDate`.

---

### T02a: Domain Exception Types for Amadeus Integration

**Files affected**:
- `inventory-service/src/domain/exceptions/amadeus-unavailable.exception.ts`
- `inventory-service/src/domain/exceptions/amadeus-not-found.exception.ts`

**Description**: Implement `AmadeusUnavailableException` extending `DomainException` from `@travel/shared` with `code = 'AmadeusUnavailable'` and `statusCode = 503`. Implement `AmadeusNotFoundException` extending `DomainException` with `code = 'AmadeusNotFound'` and `statusCode = 404`. Both are pure domain exception types with no I/O dependencies.

**Acceptance criteria**:
- AC-01: `new AmadeusUnavailableException()` produces an exception with `code = 'AmadeusUnavailable'` and `statusCode = 503`.
- AC-02: `new AmadeusNotFoundException()` produces an exception with `code = 'AmadeusNotFound'` and `statusCode = 404`.

**Verification artifacts**:
- AC-01 → `inventory-service/src/domain/exceptions/amadeus-unavailable.exception.spec.ts::should have code AmadeusUnavailable and statusCode 503` (layer: unit)
  - Must fail if: `code` or `statusCode` does not match the expected values.
- AC-02 → `inventory-service/src/domain/exceptions/amadeus-not-found.exception.spec.ts::should have code AmadeusNotFound and statusCode 404` (layer: unit)
  - Must fail if: `code` or `statusCode` does not match the expected values.

---

### T03: Database Migration — flight_reservations Table

**Files affected**:
- `inventory-service/src/infrastructure/persistence/migrations/1700000000000-CreateFlightReservationsTable.ts`

**Description**: TypeORM migration creating the `flight_reservations` table with the following DDL:

```sql
CREATE TYPE reservation_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'EXPIRED');

CREATE TABLE flight_reservations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id              VARCHAR(64) NOT NULL,
  amadeus_order_id      VARCHAR(64),
  passenger_id          UUID        NOT NULL,
  passenger_first_name  VARCHAR(128) NOT NULL,
  passenger_last_name   VARCHAR(128) NOT NULL,
  passenger_dob         DATE,
  passport_number       TEXT,
  origin                CHAR(3)     NOT NULL,
  destination           CHAR(3)     NOT NULL,
  flight_number         VARCHAR(16) NOT NULL,
  carrier               VARCHAR(4)  NOT NULL,
  departure_at          TIMESTAMPTZ NOT NULL,
  arrival_at            TIMESTAMPTZ NOT NULL,
  cabin_class           VARCHAR(20) NOT NULL,
  status                reservation_status NOT NULL DEFAULT 'PENDING',
  idempotency_key       VARCHAR(36) NOT NULL UNIQUE,
  expires_at            TIMESTAMPTZ NOT NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_fr_status_expires ON flight_reservations (status, expires_at)
  WHERE status = 'PENDING';

CREATE INDEX idx_fr_passenger ON flight_reservations (passenger_id);

CREATE INDEX idx_fr_idempotency ON flight_reservations (idempotency_key);
```

Note: `passport_number` is `TEXT` (stores AES-256-CBC ciphertext); `amadeus_order_id` stores the Amadeus flight order ID needed for cancellation.

**Acceptance criteria**:
- AC-01: Running `npm run migration:run` against a fresh PostgreSQL instance creates the `flight_reservations` table with all expected columns, the `reservation_status` enum, and all three indexes.
- AC-02: Running `npm run migration:revert` drops the table and enum cleanly without orphaned objects.

**Verification artifacts**:
- AC-01 → `inventory-service/src/infrastructure/persistence/migrations/migration.spec.ts::should create flight_reservations table with correct schema after migration:run` (layer: integration, Testcontainers PostgreSQL)
  - Must fail if: any required column, enum value, or index is missing after migration.
- AC-02 → `inventory-service/src/infrastructure/persistence/migrations/migration.spec.ts::should drop flight_reservations table cleanly after migration:revert` (layer: integration, Testcontainers PostgreSQL)
  - Must fail if: revert leaves `flight_reservations` table or `reservation_status` enum in the database.

---

### T04: TypeORM Entity + Repository

**Files affected**:
- `inventory-service/src/infrastructure/persistence/entities/flight-reservation.typeorm-entity.ts`
- `inventory-service/src/infrastructure/persistence/repositories/flight-reservation.typeorm-repository.ts`

**Description**: Implement `FlightReservationTypeOrmEntity` with `@Entity`, `@Column` decorators matching the migration schema. Implement `FlightReservationTypeOrmRepository` implementing `IFlightReservationRepository`. Methods required: `findById(id)`, `save(aggregate)`, `findPendingExpired(now: Date)` (query: `status = PENDING AND expires_at < :now`). Mapper converts between TypeORM entity and domain aggregate. DB query timeout: 5 s (TypeORM `commandTimeout`).

**Acceptance criteria**:
- AC-01: `save(aggregate)` persists a new `FlightReservation` and `findById(id)` returns an aggregate with identical field values (including `status = PENDING`).
- AC-02: `findPendingExpired(now)` returns only reservations with `status = PENDING` and `expiresAt < now`; CONFIRMED, CANCELLED, EXPIRED, or future-expiry PENDING rows are excluded.

**Verification artifacts**:
- AC-01 → `inventory-service/src/infrastructure/persistence/repositories/flight-reservation.typeorm-repository.spec.ts::should persist and retrieve FlightReservation aggregate` (layer: integration, Testcontainers PostgreSQL)
  - Must fail if: the mapper loses any field during save/load roundtrip, or `findById` returns null for a just-saved aggregate.
- AC-02 → `inventory-service/src/infrastructure/persistence/repositories/flight-reservation.typeorm-repository.spec.ts::should return only PENDING reservations with expiresAt in the past` (layer: integration, Testcontainers PostgreSQL)
  - Must fail if: `findPendingExpired` returns CONFIRMED/CANCELLED/EXPIRED rows or future-expiry PENDING rows.

---

### T05: Amadeus OAuth2 Token Client (AmadeusTokenService)

**Files affected**:
- `inventory-service/src/infrastructure/amadeus/amadeus-token.service.ts`
- `inventory-service/src/infrastructure/amadeus/amadeus.module.ts`

**Description**: Implement `AmadeusTokenService` as a NestJS singleton injectable. Calls `POST ${AMADEUS_BASE_URL}/v1/security/oauth2/token` with `grant_type=client_credentials`, `client_id`, `client_secret` (from config). Caches the returned `access_token` in memory with an `expiresAt` derived from the `expires_in` field. Refreshes when `expiresAt - 60 s < now()`. Uses a pending-promise lock to prevent concurrent refresh stampede.

**Acceptance criteria**:
- AC-01: When a valid token is cached with `expiresAt > now() + 60 s`, `getToken()` returns the cached token without making an HTTP call.
- AC-02: When `expiresAt <= now() + 60 s`, `getToken()` calls the Amadeus token endpoint and updates the cache with the new token.
- AC-03: When two concurrent callers call `getToken()` simultaneously while the cache is empty, only one HTTP request is made to the token endpoint.

**Verification artifacts**:
- AC-01 → `inventory-service/src/infrastructure/amadeus/amadeus-token.service.spec.ts::should return cached token without HTTP call when token is still valid` (layer: unit, Jest mock for axios)
  - Must fail if: `getToken()` makes an HTTP call despite a valid cached token.
- AC-02 → `inventory-service/src/infrastructure/amadeus/amadeus-token.service.spec.ts::should refresh token when within 60s of expiry` (layer: unit, Jest mock for axios)
  - Must fail if: the service uses an expired/near-expired token without refreshing.
- AC-03 → `inventory-service/src/infrastructure/amadeus/amadeus-token.service.spec.ts::should make only one token request when called concurrently with empty cache` (layer: unit, Jest mock for axios)
  - Must fail if: two concurrent `getToken()` calls result in two HTTP requests to the token endpoint.

---

### T06: Amadeus HTTP Client (AmadeusHttpClient) — Circuit Breaker, Retry, Timeout

**Files affected**:
- `inventory-service/src/infrastructure/amadeus/amadeus-http.client.ts`
- `inventory-service/src/infrastructure/amadeus/amadeus.module.ts`

**Description**: Implement `AmadeusHttpClient` using axios with: connect timeout 2 s, read timeout 15 s. Request interceptor injects Bearer token from `AmadeusTokenService`. Response interceptor normalises errors. Wrap with opossum `CircuitBreaker` (errorThresholdPercentage: 50, volumeThreshold: 10, resetTimeout: 30 000 ms; fallback: throw `AmadeusUnavailableException`). Apply retry decorator: 3 retries, exponential backoff (base 200 ms, max 5 000 ms, jitter ±50%), retryable on [500, 502, 503, 504, 408], non-retryable on [400, 401, 403, 404, 422]. Methods: `searchFlights(params)`, `createOrder(body)`, `cancelOrder(orderId)`.

**Acceptance criteria**:
- AC-01: When Amadeus returns 503 twice then 200, `searchFlights()` returns the successful response and `retry_count{outcome="success"}` is incremented.
- AC-02: When Amadeus returns 404, no retry is performed and `AmadeusNotFoundException` is thrown immediately.
- AC-03: After 10 requests with ≥ 50% error rate within 30 s, the circuit opens and the next call throws `AmadeusUnavailableException` without making an HTTP request.
- AC-04: When the Amadeus call exceeds 15 s, the request is aborted and the error is treated as retryable (500-class).

**Verification artifacts**:
- AC-01 → `inventory-service/src/infrastructure/amadeus/amadeus-http.client.spec.ts::should retry on 503 and succeed on second attempt` (layer: unit, nock or axios-mock-adapter)
  - Must fail if: retry logic is not implemented or does not retry on 503.
- AC-02 → `inventory-service/src/infrastructure/amadeus/amadeus-http.client.spec.ts::should not retry on 404 and throw AmadeusNotFoundException` (layer: unit)
  - Must fail if: the client retries on 404 or swallows the error.
- AC-03 → `inventory-service/src/infrastructure/amadeus/amadeus-http.client.spec.ts::should open circuit after 10 requests with ≥50% errors in 30s window` (layer: unit, opossum test harness)
  - Must fail if: the circuit breaker threshold is not configured or the circuit does not open.
- AC-04 → `inventory-service/src/infrastructure/amadeus/amadeus-http.client.spec.ts::should abort request and count as retryable after 15s read timeout` (layer: unit)
  - Must fail if: the timeout is not set to 15 s or timeouts are treated as non-retryable.

---

### T07: Redis Flight Search Cache Service (FlightSearchCacheService)

**Files affected**:
- `inventory-service/src/infrastructure/cache/flight-search-cache.service.ts`

**Description**: Implement `FlightSearchCacheService` using ioredis 5.x. Method `get(params: SearchParams): Promise<FlightOffer[] | null>` — computes SHA-256 hash of canonical params (sorted JSON with dates normalised to `YYYY-MM-DD`), fetches `inventory:flight-search:<hash>` from Redis, returns parsed array or null on miss/error. Method `set(params, offers: FlightOffer[]): Promise<void>` — writes JSON to same key with `EX 300`. On Redis connection error, both methods log a `warn` and return gracefully (`get` returns null, `set` is a no-op).

**Acceptance criteria**:
- AC-01: `get(params)` returns `null` when no matching Redis key exists.
- AC-02: After `set(params, offers)`, `get(params)` returns the same array of offers.
- AC-03: `get()` and `set()` produce the same hash key for `departureDate = "2026-07-01"` and `departureDate = "2026-07-01T00:00:00Z"` (date normalisation).
- AC-04: When Redis throws a connection error, `get()` returns `null` without propagating the exception.

**Verification artifacts**:
- AC-01 → `inventory-service/src/infrastructure/cache/flight-search-cache.service.spec.ts::should return null on cache miss` (layer: unit, ioredis mock)
  - Must fail if: the service throws instead of returning null on miss.
- AC-02 → `inventory-service/src/infrastructure/cache/flight-search-cache.service.spec.ts::should return stored offers after set` (layer: unit, ioredis mock)
  - Must fail if: `set` does not store with key `inventory:flight-search:<hash>` or TTL ≠ 300.
- AC-03 → `inventory-service/src/infrastructure/cache/flight-search-cache.service.spec.ts::should produce same hash key for ISO date with and without time component` (layer: unit)
  - Must fail if: the canonical param builder does not normalise dates before hashing.
- AC-04 → `inventory-service/src/infrastructure/cache/flight-search-cache.service.spec.ts::should return null and log warn when Redis is unavailable` (layer: unit, ioredis mock throws)
  - Must fail if: the service propagates the Redis connection error to the caller.

---

### T08: Application Use Case — SearchFlightsUseCase (Cache-aside)

**Files affected**:
- `inventory-service/src/application/use-cases/search-flights/search-flights.use-case.ts`
- `inventory-service/src/application/use-cases/search-flights/search-flights.command.ts`
- `inventory-service/src/application/use-cases/search-flights/search-flights.result.ts`

**Description**: Implement `SearchFlightsUseCase`. Steps: (1) validate command; (2) call `FlightSearchCacheService.get(params)` — on hit, return with `source: "CACHE"`; (3) on miss, call `AmadeusHttpClient.searchFlights(params)`; (4) call `FlightSearchCacheService.set(params, result)`; (5) return with `source: "LIVE"`. Increment `cache_hit_total` or `cache_miss_total` counter.

**Acceptance criteria**:
- AC-01: When the cache contains a matching entry, `execute()` returns the cached offers with `source = "CACHE"` and zero Amadeus calls.
- AC-02: When the cache misses, `execute()` calls Amadeus, stores the result in cache, and returns with `source = "LIVE"`.
- AC-03: When Amadeus returns an error and cache is empty, the error propagates to the caller (no silent swallow).

**Verification artifacts**:
- AC-01 → `inventory-service/src/application/use-cases/search-flights/search-flights.use-case.spec.ts::should return cached offers and not call Amadeus on cache hit` (layer: unit, Jest mocks for cache + Amadeus client)
  - Must fail if: the use case calls Amadeus when the cache returns a non-null result.
- AC-02 → `inventory-service/src/application/use-cases/search-flights/search-flights.use-case.spec.ts::should call Amadeus, populate cache, and return LIVE source on cache miss` (layer: unit)
  - Must fail if: the use case does not populate the cache after an Amadeus call.
- AC-03 → `inventory-service/src/application/use-cases/search-flights/search-flights.use-case.spec.ts::should propagate Amadeus error when cache is empty and Amadeus fails` (layer: unit)
  - Must fail if: the use case swallows the Amadeus error and returns an empty/null result.

---

### T09: Application Use Case — CreateReservationUseCase (Idempotency + Amadeus + DB + Kafka)

**Files affected**:
- `inventory-service/src/infrastructure/idempotency/idempotency.service.ts`
- `inventory-service/src/application/use-cases/create-reservation/create-reservation.use-case.ts`
- `inventory-service/src/application/use-cases/create-reservation/create-reservation.command.ts`
- `inventory-service/src/application/use-cases/create-reservation/create-reservation.result.ts`

**Description**: Implement `IdempotencyService`: `get(key): Promise<ReservationResponse | null>` (Redis `inventory:idempotency:<key>`), `set(key, response, ttlSeconds)`. Implement `CreateReservationUseCase.execute(command)`: (1) check idempotency — if hit, return cached response (HTTP 200); (2) call `AmadeusHttpClient.createOrder(offerId, passengerId, cabinClass)`; (3) create `FlightReservation` aggregate; (4) `reservationRepo.save(aggregate)`; (5) publish `FlightReserved` event; (6) write idempotency response to Redis; (7) return `ReservationResponse` (HTTP 201). On Amadeus failure at step 2, abort — no DB insert or event.

**Acceptance criteria**:
- AC-01: When `IdempotencyService.get(key)` returns a cached response, `execute()` returns that response without calling Amadeus, the DB, or Kafka.
- AC-02: On a fresh key, after successful Amadeus call, the aggregate is saved, `FlightReserved` is published, and the response is cached in Redis.
- AC-03: When Amadeus returns 422 at step 2, no row is inserted in `flight_reservations` and no Kafka event is published.

**Verification artifacts**:
- AC-01 → `inventory-service/src/application/use-cases/create-reservation/create-reservation.use-case.spec.ts::should return idempotent response without side effects on duplicate idempotency key` (layer: unit)
  - Must fail if: the use case calls Amadeus or the repository when an idempotency cache hit is returned.
- AC-02 → `inventory-service/src/application/use-cases/create-reservation/create-reservation.use-case.spec.ts::should save aggregate, publish FlightReserved, and cache idempotency response on first call` (layer: unit)
  - Must fail if: any of save, publish, or idempotency cache write is skipped.
- AC-03 → `inventory-service/src/application/use-cases/create-reservation/create-reservation.use-case.spec.ts::should not persist aggregate or publish event when Amadeus returns 422` (layer: unit)
  - Must fail if: the repository `save` or event publisher `publish` is called when Amadeus fails.

---

### T10: Application Use Cases — GetReservationUseCase, CancelReservationUseCase

**Files affected**:
- `inventory-service/src/application/use-cases/get-reservation/get-reservation.use-case.ts`
- `inventory-service/src/application/use-cases/get-reservation/get-reservation.query.ts`
- `inventory-service/src/application/use-cases/cancel-reservation/cancel-reservation.use-case.ts`
- `inventory-service/src/application/use-cases/cancel-reservation/cancel-reservation.command.ts`

**Description**: `GetReservationUseCase.execute(query)`: loads aggregate by `reservationId`; throws `NotFoundException` if not found; maps to `ReservationResponse`. `CancelReservationUseCase.execute(command)`: loads aggregate; calls `aggregate.cancel()` (throws `DomainException` for invalid state); calls `AmadeusHttpClient.cancelOrder(amadeusOrderId)`; saves aggregate; publishes `FlightReservationCancelled` event.

**Acceptance criteria**:
- AC-01: `GetReservationUseCase` returns the correct `ReservationResponse` when the reservation exists.
- AC-02: `GetReservationUseCase` throws `NotFoundException` when the reservation does not exist.
- AC-03: `CancelReservationUseCase` calls Amadeus cancel, saves CANCELLED status, and publishes `FlightReservationCancelled` for a PENDING reservation.
- AC-04: `CancelReservationUseCase` throws `DomainException` with code `INVALID_STATUS_TRANSITION` when the reservation is EXPIRED and makes no Amadeus call.

**Verification artifacts**:
- AC-01 → `inventory-service/src/application/use-cases/get-reservation/get-reservation.use-case.spec.ts::should return ReservationResponse for existing reservation` (layer: unit)
  - Must fail if: the mapper drops any field from the aggregate.
- AC-02 → `inventory-service/src/application/use-cases/get-reservation/get-reservation.use-case.spec.ts::should throw NotFoundException when reservation does not exist` (layer: unit)
  - Must fail if: the use case returns null/undefined instead of throwing.
- AC-03 → `inventory-service/src/application/use-cases/cancel-reservation/cancel-reservation.use-case.spec.ts::should cancel PENDING reservation and publish FlightReservationCancelled` (layer: unit)
  - Must fail if: Amadeus cancel or the repository save is not called, or the event is not published.
- AC-04 → `inventory-service/src/application/use-cases/cancel-reservation/cancel-reservation.use-case.spec.ts::should throw DomainException and not call Amadeus when reservation is EXPIRED` (layer: unit)
  - Must fail if: the use case calls Amadeus or saves the aggregate when `cancel()` throws.

---

### T11: Kafka Event Publisher (InventoryEventPublisher)

**Files affected**:
- `inventory-service/src/infrastructure/kafka/inventory-event.publisher.ts`

**Description**: Implement `InventoryEventPublisher` using `@travel/shared`'s `KafkaModule`. Method `publish(event: DomainEvent): Promise<void>`. Maps `FlightReserved → inventory-events`, `FlightReservationCancelled → inventory-events`, `FlightReservationExpired → inventory-events`. Serialises using ADR-003 schema (all required fields). On Kafka producer error, logs `error` with `kafka_publish_failed` message, increments `kafka_events_published_total{status="failure"}`, and re-throws.

**Acceptance criteria**:
- AC-01: Publishing a `FlightReserved` event produces a message to topic `inventory-events` with all ADR-003 required fields present (`eventId`, `eventType`, `aggregateId`, `occurredOn`, `correlationId`, `causationId`).
- AC-02: When the Kafka producer throws, the exception is re-thrown by `publish()` and `kafka_events_published_total{topic="inventory-events", eventType="FlightReserved", status="failure"}` is incremented.

**Verification artifacts**:
- AC-01 → `inventory-service/src/infrastructure/kafka/inventory-event.publisher.spec.ts::should produce FlightReserved message to inventory-events topic with complete ADR-003 schema` (layer: unit, KafkaJS mock)
  - Must fail if: any ADR-003 required field is absent from the produced message, or the wrong topic is used.
- AC-02 → `inventory-service/src/infrastructure/kafka/inventory-event.publisher.spec.ts::should re-throw and increment failure counter when Kafka producer fails` (layer: unit)
  - Must fail if: the error is swallowed or the failure metric is not incremented.

---

### T12: Reservation Expiry Background Job (ReservationExpiryJob)

**Files affected**:
- `inventory-service/src/infrastructure/jobs/reservation-expiry.job.ts`

**Description**: Implement `ReservationExpiryJob` with `@Cron('* * * * *')`. Calls `reservationRepo.findPendingExpired(new Date())`. For each result: calls `reservation.expire()`, saves, publishes `FlightReservationExpired`, increments `reservations_expired_total`. On per-item error: log `error` with `reservationId` context and continue to next item (no batch abort).

**Acceptance criteria**:
- AC-01: When two PENDING expired reservations exist, both are updated to `EXPIRED` and two `FlightReservationExpired` events are published.
- AC-02: When Kafka publish fails for the first reservation, the second reservation is still processed and its event is published.
- AC-03: When no PENDING expired reservations exist, no DB updates and no events are emitted.

**Verification artifacts**:
- AC-01 → `inventory-service/src/infrastructure/jobs/reservation-expiry.job.spec.ts::should expire all PENDING expired reservations and publish FlightReservationExpired for each` (layer: unit)
  - Must fail if: not all expired reservations are processed, or events are not published for each.
- AC-02 → `inventory-service/src/infrastructure/jobs/reservation-expiry.job.spec.ts::should continue processing remaining reservations when Kafka publish fails for one` (layer: unit)
  - Must fail if: a Kafka error for one item aborts processing of remaining items.
- AC-03 → `inventory-service/src/infrastructure/jobs/reservation-expiry.job.spec.ts::should be a no-op when no expired reservations exist` (layer: unit)
  - Must fail if: the job calls `save` or `publish` when `findPendingExpired` returns an empty array.

---

### T13: Presentation Layer — Controllers, DTOs, RBAC Guards

**Files affected**:
- `inventory-service/src/presentation/controllers/flights.controller.ts`
- `inventory-service/src/presentation/controllers/reservations.controller.ts`
- `inventory-service/src/presentation/dto/search-flights-request.dto.ts`
- `inventory-service/src/presentation/dto/create-reservation-request.dto.ts`
- `inventory-service/src/presentation/dto/reservation-response.dto.ts`
- `inventory-service/src/presentation/guards/roles.guard.ts`

**Description**: Implement `FlightsController` with `GET /api/v1/flights/search` (requires `Employee | Manager | Admin`). Implement `ReservationsController` with `POST /api/v1/flights/reservations` (extract `Idempotency-Key` header; 400 if missing or invalid UUID), `GET /api/v1/flights/reservations/:reservationId`, `DELETE /api/v1/flights/reservations/:reservationId`. All DTOs validated with `class-validator`. `RolesGuard` reads role from `X-User-Role` header (injected by API Gateway). Global exception filter maps `DomainException` to 422, `NotFoundException` to 404.

**Acceptance criteria**:
- AC-01: `GET /api/v1/flights/search` with a valid token and all required query params returns HTTP 200.
- AC-02: `GET /api/v1/flights/search` with a missing required query param (`origin`) returns HTTP 400 with `details` listing the field.
- AC-03: `POST /api/v1/flights/reservations` with a missing `Idempotency-Key` header returns HTTP 400.
- AC-04: Any endpoint called with role `Employee` returns HTTP 200/201/204; called with no role returns HTTP 403.

**Verification artifacts**:
- AC-01 → `inventory-service/src/presentation/controllers/flights.controller.spec.ts::should return 200 with valid search params` (layer: integration, NestJS testing module with mocked use case)
  - Must fail if: the controller rejects valid params or the use case is not called.
- AC-02 → `inventory-service/src/presentation/controllers/flights.controller.spec.ts::should return 400 when origin query param is missing` (layer: integration)
  - Must fail if: `class-validator` is not applied or the DTO does not mark `origin` as required.
- AC-03 → `inventory-service/src/presentation/controllers/reservations.controller.spec.ts::should return 400 when Idempotency-Key header is absent` (layer: integration)
  - Must fail if: the controller does not validate the presence of `Idempotency-Key`.
- AC-04 → `inventory-service/src/presentation/guards/roles.guard.spec.ts::should allow Employee role and reject missing role` (layer: unit)
  - Must fail if: `RolesGuard` does not enforce role presence or allows unauthenticated access.

---

### T14: Observability Instrumentation (Prometheus Metrics, OTel Traces)

**Files affected**:
- `inventory-service/src/infrastructure/observability/metrics.service.ts`
- All use case files (add metric increment calls)
- `inventory-service/src/infrastructure/amadeus/amadeus-http.client.ts` (circuit state gauge)
- `inventory-service/src/main.ts` (OTel SDK init, Prometheus middleware)
- `inventory-service/src/presentation/controllers/metrics.controller.ts`

**Description**: Register all Prometheus metrics listed in design.md using `prom-client`: `http_requests_total`, `http_request_duration_seconds`, `cache_hit_total`, `cache_miss_total`, `amadeus_api_calls_total`, `amadeus_api_errors_total`, `circuit_state`, `circuit_breaker_errors_total`, `retry_count`, `kafka_events_published_total`, `reservations_expired_total`, `db_query_duration_seconds`. Initialise OpenTelemetry SDK with Jaeger exporter. Register opossum event listeners to update `circuit_state` gauge (open=1, halfOpen=0.5, close=0). Expose `/metrics` endpoint for Prometheus scraping. Create `MetricsController` at `src/presentation/controllers/metrics.controller.ts` with a `GET /metrics` route that returns `metricsService.getMetrics()` as `text/plain; version=0.0.4` content type.

**Acceptance criteria**:
- AC-01: After a cache-hit flight search, `cache_hit_total{cache="flight-search"}` is incremented by 1 and `cache_miss_total` is not incremented.
- AC-02: When the Amadeus circuit transitions to OPEN, `circuit_state{service="amadeus"}` gauge reads 1; on HALF-OPEN reads 0.5; on CLOSED reads 0.
- AC-03: After publishing a Kafka event successfully, `kafka_events_published_total{topic="inventory-events", eventType="FlightReserved", status="success"}` is incremented.
- AC-04: The `/metrics` endpoint responds with HTTP 200 and a Prometheus text body containing all registered metric names.

**Verification artifacts**:
- AC-01 → `inventory-service/src/infrastructure/observability/metrics.service.spec.ts::should increment cache_hit_total on cache hit and not increment cache_miss_total` (layer: unit)
  - Must fail if: `cache_hit_total` is not incremented or `cache_miss_total` is incorrectly incremented.
- AC-02 → `inventory-service/src/infrastructure/amadeus/amadeus-http.client.spec.ts::should set circuit_state gauge to 1 on open, 0.5 on half-open, 0 on closed` (layer: unit)
  - Must fail if: opossum event listeners do not update the gauge on state change.
- AC-03 → `inventory-service/src/infrastructure/kafka/inventory-event.publisher.spec.ts::should increment kafka_events_published_total success counter on successful publish` (layer: unit)
  - Must fail if: the success counter is not incremented after a successful Kafka produce.
- AC-04 → `inventory-service/src/presentation/controllers/metrics.controller.spec.ts::should expose /metrics endpoint with all required metric names` (layer: integration)
  - Must fail if: the `/metrics` endpoint is not registered or any required metric name is absent from the output.

---

### T15: Integration Tests (Testcontainers PostgreSQL + Redis + Amadeus Mock)

**Files affected**:
- `inventory-service/src/infrastructure/persistence/repositories/flight-reservation.typeorm-repository.integration.spec.ts`
- `inventory-service/src/infrastructure/cache/flight-search-cache.service.integration.spec.ts`
- `inventory-service/src/application/use-cases/create-reservation/create-reservation.use-case.integration.spec.ts`
- `inventory-service/src/application/use-cases/search-flights/search-flights.use-case.integration.spec.ts`
- `inventory-service/src/infrastructure/jobs/reservation-expiry.job.integration.spec.ts`

**Description**: Integration tests using Testcontainers (`@testcontainers/postgresql`, `@testcontainers/redis`). Amadeus API mocked with `nock`. Tests cover: full repository roundtrip (save + findById + findPendingExpired), full cache roundtrip (set + get + TTL expiry), full `CreateReservationUseCase` flow with real DB and Redis (idempotency duplicate, Amadeus mock 422), expiry job with real DB rows.

**Acceptance criteria**:
- AC-01: `CreateReservationUseCase` integration test: first call inserts DB row, second call with same `Idempotency-Key` returns cached response without inserting a second row.
- AC-02: `ReservationExpiryJob` integration test: after inserting a PENDING reservation with `expiresAt = now() - 2 min`, the job marks it EXPIRED and the DB row reflects `status = EXPIRED`.
- AC-03: `FlightSearchCacheService` integration test: `get()` returns null before `set()`, returns stored offers after `set()`, and returns null again after the 300 s TTL (simulated with `DEBUG_TTL=1` for test speed).

**Verification artifacts**:
- AC-01 → `inventory-service/src/application/use-cases/create-reservation/create-reservation.use-case.integration.spec.ts::should not insert duplicate row on second call with same Idempotency-Key` (layer: integration, Testcontainers)
  - Must fail if: a second call with the same key inserts a second `flight_reservations` row.
- AC-02 → `inventory-service/src/infrastructure/jobs/reservation-expiry.job.integration.spec.ts::should update status to EXPIRED for past-due PENDING reservation` (layer: integration, Testcontainers)
  - Must fail if: the job does not update the row status or the DB query does not select the correct rows.
- AC-03 → `inventory-service/src/infrastructure/cache/flight-search-cache.service.integration.spec.ts::should return null before set, offers after set, and null after TTL expires` (layer: integration, Testcontainers Redis)
  - Must fail if: TTL is not set on the key or the serialisation/deserialisation is lossy.

---

### T16: End-to-End Wiring, Smoke Test, Coverage Verification

**Files affected**:
- `inventory-service/src/app.module.ts` (final module wiring)
- `inventory-service/jest.config.ts` (coverage thresholds)
- `inventory-service/package.json` (test:coverage script)

**Description**: Wire all modules into `AppModule`. Confirm all providers are registered and no circular dependency warnings appear at startup. Run `npm run test:coverage` and verify ≥ 80% coverage for lines/branches/functions/statements (enforced via Jest `coverageThreshold`). Run a smoke test: start service locally, call `GET /api/v1/health` → 200, `GET /api/v1/flights/search?origin=LHR&destination=JFK&departureDate=2026-07-01&passengers=1` → 200 (with Amadeus mock), `POST /api/v1/flights/reservations` → 201.

**Acceptance criteria**:
- AC-01: `npm run test:coverage` passes with ≥ 80% line, branch, function, and statement coverage.
- AC-02: The application starts without circular dependency warnings or unresolved provider errors.
- AC-03: Smoke test: `GET /api/v1/flights/search` with valid params returns HTTP 200 with a non-empty `data` array.

**Verification artifacts**:
- AC-01 → Jest `coverageThreshold` configuration in `jest.config.ts` (`lines: 80, branches: 80, functions: 80, statements: 80`) enforced automatically on `npm run test:coverage` (layer: unit + integration aggregate)
  - Must fail if: any coverage dimension drops below 80%.
- AC-02 → `inventory-service/src/app.module.spec.ts::should initialise AppModule without circular dependency errors` (layer: integration, NestJS `Test.createTestingModule`)
  - Must fail if: NestJS throws a circular dependency or unresolved provider exception on module init.
- AC-03 → `inventory-service/test/smoke.spec.ts::should return 200 with flight offers on GET /api/v1/flights/search` (layer: e2e, local HTTP with nock Amadeus mock)
  - Must fail if: the controller is not wired to the use case, or the use case is not wired to the Amadeus client.

---

### T17: Kafka Contract Tests for `inventory-events` Topic

**Files affected**:
- `inventory-service/src/contracts/inventory-events.contract.spec.ts`
- `inventory-service/src/contracts/pact-setup.ts`

**Description**: Implement Pact-based consumer-driven contract tests for all three event types published to `inventory-events` by `inventory-service` and consumed by `booking-service`. For each event (`FlightReserved`, `FlightReservationCancelled`, `FlightReservationExpired`): define a Pact message interaction that asserts all ADR-003 required fields are present in the published message. Verify the message shape conforms to `docs/contracts/openapi/inventory-service.yaml` event schema. Pact contract artefacts are written to `pacts/` directory.

**Acceptance criteria**:
- AC-01: The Pact consumer test for `FlightReserved` asserts all ADR-003 required fields (`eventId`, `eventType: "FlightReserved"`, `aggregateId`, `occurredOn`, `correlationId`, `causationId`, `data`) are present in the message.
- AC-02: The Pact consumer test for `FlightReservationCancelled` asserts all required fields including `data.cancelledAt` and `data.reason`.
- AC-03: The Pact consumer test for `FlightReservationExpired` asserts all required fields including `data.expiredAt`.

**Verification artifacts**:
- AC-01 → `inventory-service/src/contracts/inventory-events.contract.spec.ts::FlightReserved message has all required ADR-003 fields` (layer: contract, Pact MessageConsumerPact)
  - Must fail if: any ADR-003 required field is missing from the produced event message, or `eventType` ≠ `"FlightReserved"`.
- AC-02 → `inventory-service/src/contracts/inventory-events.contract.spec.ts::FlightReservationCancelled message has all required ADR-003 fields` (layer: contract, Pact MessageConsumerPact)
  - Must fail if: `data.cancelledAt` or `data.reason` is missing.
- AC-03 → `inventory-service/src/contracts/inventory-events.contract.spec.ts::FlightReservationExpired message has all required ADR-003 fields` (layer: contract, Pact MessageConsumerPact)
  - Must fail if: `data.expiredAt` is missing from the expired event payload.
