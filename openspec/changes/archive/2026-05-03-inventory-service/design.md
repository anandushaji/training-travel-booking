# Design: Inventory / Flight Search Service (SM-04)

## Pattern Selection Log

| Pattern | Decision | Rationale |
|---|---|---|
| Database-per-service | Applied | `inventory-service` owns its own PostgreSQL schema (`inventory`); only `flight_reservations` is persisted; no other service has direct DB access (ADR-001, ADR-004) |
| CQRS | Not applicable | Flight search returns live Amadeus data — there is no persistent read model; reservation queries are simple primary-key lookups that do not justify a separate read projection |
| Saga (Choreography) | Not applicable | Reservation hold is a single local operation; cross-service saga coordination lives in `booking-service` (SM-05); this service only publishes events for the saga to consume |
| Saga (Orchestration) | Not applicable | Same reasoning as Choreography — no orchestration role in this bounded context |
| Outbox | Not applicable | Outbox relay not implemented per PROJECT.md §6; direct Kafka publish after DB commit is the accepted approach |
| Idempotency | Applied | `POST /flights/reservations` must be idempotent by `Idempotency-Key` header to prevent duplicate seat holds on client retry; stored in Redis with 24 h TTL (ADR-011) |
| Timeouts | Applied | All Amadeus HTTP calls carry explicit connect timeout (2 s) and read timeout (15 s per PROJECT.md inventory-service override) via axios config (ADR-011) |
| Retries | Applied | Amadeus calls retry 3× with exponential backoff (base 200 ms, max 5 s, jitter) on codes 500/502/503/504/408; codes 400/401/403/404/422 fail immediately (ADR-011) |
| Circuit Breaker | Applied | opossum wraps the Amadeus HTTP client; threshold 50% errors / 10 req / 30 s; half-open probe 30 s; fallback returns 503 immediately when open (ADR-011) |
| Bulkheads | Not applicable | Single external dependency (Amadeus); circuit breaker provides sufficient isolation; no competing thread pools to partition |
| Cache-aside | Applied | Flight search results cached in Redis `inventory:flight-search:<SHA-256(canonical params)>` TTL 5 min; reduces Amadeus API cost and p95 latency (ADR-002, ADR-004) |
| Read-through | Not applicable | Application code manages the cache directly (cache-aside pattern); no transparent caching proxy |
| Write-through | Not applicable | Flight search results are never written to DB; cache entries are write-once from Amadeus response |
| Cache Invalidation | Not applicable | Flight search cache expires naturally by TTL (5 min); no write path exists that would require explicit invalidation |

**Applied patterns**: Database-per-service, Idempotency, Timeouts, Retries, Circuit Breaker (Amadeus), Cache-aside

**Architectural assumptions**:
- `@travel/shared` provides `KafkaModule`, `AggregateRoot`, `DomainEvent`, `IRepository`, `TypedId`
- Amadeus base URL is supplied via `AMADEUS_BASE_URL` env var (default: `https://test.api.amadeus.com`)
- PostgreSQL 15 instance dedicated to `inventory-service` (schema: `inventory`)
- Redis 7 available at `REDIS_URL`
- Kafka topic `inventory-events` is pre-created with replication factor 2

---

## Architecture Overview

```
                         ┌─────────────────────────────────────────────────────┐
                         │               inventory-service  :3005               │
                         │                                                       │
  API Gateway (JWT) ────▶│  FlightsController   ReservationsController          │
                         │        │                      │                      │
                         │  SearchFlightsUseCase  CreateReservationUseCase      │
                         │        │              GetReservationUseCase           │
                         │        │              CancelReservationUseCase        │
                         │        │                      │                      │
                         │  ┌─────┴──────┐    ┌──────────┴──────────┐          │
                         │  │  Redis     │    │  FlightReservation   │          │
                         │  │  Cache     │    │  Aggregate (Domain)  │          │
                         │  │  (5 min)   │    └──────────┬──────────┘          │
                         │  └─────┬──────┘               │                     │
                         │        │ miss               TypeORM                  │
                         │  AmadeusHttpClient      PostgreSQL 15                │
                         │  (CB + Retry + TLS)     flight_reservations          │
                         │        │                                             │
                         │  ReservationExpiryJob  InventoryEventPublisher       │
                         │  (@Cron every min)     (KafkaJS)                     │
                         └─────────┬──────────────────────┬──────────────────-─┘
                                   │                       │
                             Amadeus GDS            Kafka topic:
                           (OAuth2 REST API)        inventory-events
                                                    (FlightReserved,
                                                    FlightReservationCancelled,
                                                    FlightReservationExpired)
```

**Layers**:
1. **Domain** — `FlightReservation` aggregate, value objects, domain events; pure business logic with no I/O
2. **Application** — use cases orchestrate domain + infrastructure; all I/O via interfaces
3. **Infrastructure** — TypeORM repositories, Redis services, Amadeus clients, Kafka publisher, expiry job
4. **Presentation** — NestJS controllers, request/response DTOs, RBAC guards, exception filters

---

## Folder Structure

```
inventory-service/src/
├── domain/
│   ├── aggregates/
│   │   └── flight-reservation.aggregate.ts
│   ├── value-objects/
│   │   ├── flight-reservation-id.value-object.ts
│   │   ├── flight-segment.value-object.ts
│   │   ├── passenger-details.value-object.ts
│   │   └── reservation-status.value-object.ts
│   ├── events/
│   │   ├── flight-reserved.event.ts
│   │   ├── flight-reservation-cancelled.event.ts
│   │   └── flight-reservation-expired.event.ts
│   └── repositories/
│       └── flight-reservation.repository.interface.ts
├── application/
│   ├── use-cases/
│   │   ├── search-flights/
│   │   │   ├── search-flights.use-case.ts
│   │   │   ├── search-flights.command.ts
│   │   │   └── search-flights.result.ts
│   │   ├── create-reservation/
│   │   │   ├── create-reservation.use-case.ts
│   │   │   ├── create-reservation.command.ts
│   │   │   └── create-reservation.result.ts
│   │   ├── get-reservation/
│   │   │   ├── get-reservation.use-case.ts
│   │   │   └── get-reservation.query.ts
│   │   └── cancel-reservation/
│   │       ├── cancel-reservation.use-case.ts
│   │       └── cancel-reservation.command.ts
│   └── dto/
│       ├── flight-offer.dto.ts
│       ├── reservation-response.dto.ts
│       └── search-flights-request.dto.ts
├── infrastructure/
│   ├── persistence/
│   │   ├── entities/
│   │   │   └── flight-reservation.typeorm-entity.ts
│   │   ├── repositories/
│   │   │   └── flight-reservation.typeorm-repository.ts
│   │   └── migrations/
│   │       └── 1700000000000-CreateFlightReservationsTable.ts
│   ├── amadeus/
│   │   ├── amadeus-token.service.ts
│   │   ├── amadeus-http.client.ts
│   │   └── amadeus.module.ts
│   ├── cache/
│   │   └── flight-search-cache.service.ts
│   ├── idempotency/
│   │   └── idempotency.service.ts
│   ├── kafka/
│   │   └── inventory-event.publisher.ts
│   └── jobs/
│       └── reservation-expiry.job.ts
├── presentation/
│   ├── controllers/
│   │   ├── flights.controller.ts
│   │   └── reservations.controller.ts
│   ├── dto/
│   │   ├── search-flights-request.dto.ts
│   │   ├── create-reservation-request.dto.ts
│   │   └── reservation-response.dto.ts
│   └── guards/
│       └── roles.guard.ts
├── config/
│   └── inventory.config.ts
├── app.module.ts
└── main.ts
```

---

## Domain Model

### `FlightReservation` Aggregate

Root entity managed by `FlightReservationId`. Enforces invariants: only a PENDING reservation may be confirmed or cancelled; only PENDING reservations are eligible for expiry.

```typescript
class FlightReservation extends AggregateRoot {
  id: FlightReservationId           // TypedId (UUID v4)
  offerId: string                   // Amadeus offer ID (external reference)
  segment: FlightSegment            // immutable value object
  passenger: PassengerDetails       // immutable value object
  status: ReservationStatus         // PENDING | CONFIRMED | CANCELLED | EXPIRED
  cabinClass: CabinClass            // ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST
  idempotencyKey: string            // stored for 24h Redis lookup
  amadeusOrderId: string            // Amadeus flight order ID — required for cancel via DELETE /v1/booking/flight-orders/{orderId}
  expiresAt: Date                   // createdAt + 15 min (RESERVATION_HOLD_MINUTES)
  createdAt: Date
  updatedAt: Date

  // Factory
  static create(props): FlightReservation  // raises FlightReserved

  // Commands
  confirm(): void                   // PENDING → CONFIRMED
  cancel(): void                    // PENDING | CONFIRMED → CANCELLED, raises FlightReservationCancelled
  expire(): void                    // PENDING → EXPIRED, raises FlightReservationExpired

  // Query
  isExpired(): boolean              // expiresAt < now()
}
```

### Value Objects

| Value Object | Fields | Invariants |
|---|---|---|
| `FlightReservationId` | `value: string` (UUID v4) | non-empty, valid UUID |
| `FlightSegment` | `origin: string` (IATA), `destination: string` (IATA), `departureDate: Date`, `arrivalDate: Date`, `flightNumber: string`, `carrier: string` | origin ≠ destination; departureDate < arrivalDate |
| `PassengerDetails` | `passengerId: string`, `firstName: string`, `lastName: string`, `dateOfBirth: Date`, `passportNumber?: string` | passengerId non-empty; firstName/lastName non-empty |
| `ReservationStatus` | `value: 'PENDING' \| 'CONFIRMED' \| 'CANCELLED' \| 'EXPIRED'` | enumerated set only |

---

## API Contracts

All endpoints sit under `/api/v1`. JWT Bearer required. Pre-validated by API Gateway; roles enforced locally via `RolesGuard`.

### `GET /api/v1/flights/search`

**Roles**: `Employee`, `Manager`, `Admin`

Query parameters:

| Param | Type | Required | Notes |
|---|---|---|---|
| `origin` | string (IATA, 3-char) | Yes | |
| `destination` | string (IATA, 3-char) | Yes | |
| `departureDate` | string (YYYY-MM-DD) | Yes | |
| `returnDate` | string (YYYY-MM-DD) | No | Omit for one-way |
| `passengers` | integer (1–9) | Yes | |
| `cabinClass` | `ECONOMY \| PREMIUM_ECONOMY \| BUSINESS \| FIRST` | No | Default: `ECONOMY` |

Response `200`:
```json
{
  "data": [
    {
      "offerId": "string",
      "carrier": "string",
      "flightNumber": "string",
      "origin": "string",
      "destination": "string",
      "departureAt": "ISO 8601",
      "arrivalAt": "ISO 8601",
      "cabinClass": "string",
      "price": { "amount": "decimal", "currency": "string" },
      "seatsAvailable": "integer",
      "source": "LIVE | CACHE"
    }
  ],
  "meta": { "count": "integer", "cachedAt": "ISO 8601 | null" }
}
```

### `POST /api/v1/flights/reservations`

**Roles**: `Employee`, `Manager`, `Admin`  
**Headers**: `Idempotency-Key: <UUID>` (required)

Request body:
```json
{
  "offerId": "string",
  "passengerId": "string (UUID)",
  "cabinClass": "ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST"
}
```

Response `201`:
```json
{
  "reservationId": "string (UUID)",
  "status": "PENDING",
  "expiresAt": "ISO 8601",
  "segment": { "origin": "string", "destination": "string", "departureAt": "ISO 8601", "arrivalAt": "ISO 8601", "flightNumber": "string", "carrier": "string" },
  "passenger": { "passengerId": "string", "firstName": "string", "lastName": "string" },
  "cabinClass": "string",
  "createdAt": "ISO 8601"
}
```

Response `200` (idempotent duplicate): same `ReservationResponse` from Redis cache.

### `GET /api/v1/flights/reservations/:reservationId`

**Roles**: `Employee`, `Manager`, `Admin`

Response `200`: `ReservationResponse` (same shape as POST 201)  
Response `404`: standard error envelope

### `DELETE /api/v1/flights/reservations/:reservationId`

**Roles**: `Employee`, `Manager`, `Admin`

Response `204`: no body  
Response `404`: reservation not found  
Response `422`: reservation already CANCELLED or EXPIRED

---

## Database Schema

### Table: `flight_reservations`

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
  passport_number       TEXT,           -- AES-256-CBC ciphertext; plaintext never stored
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

**Index rationale**:
- `idx_fr_status_expires`: partial index for the expiry job — scans only PENDING rows
- `idx_fr_passenger`: supports passenger lookup queries
- `idx_fr_idempotency`: unique + fast lookup for idempotency guard (fallback to DB if Redis miss)

---

## Amadeus Client Design

### `AmadeusTokenService`

- Grant type: `client_credentials`
- Credentials: `AMADEUS_CLIENT_ID`, `AMADEUS_CLIENT_SECRET` (Kubernetes Secret)
- Token endpoint: `POST ${AMADEUS_BASE_URL}/v1/security/oauth2/token`
- In-memory cache: store `{ accessToken, expiresAt }` — refresh when `expiresAt - 60s < now()`
- Thread-safety: singleton NestJS provider; refresh is serialised by a pending-promise lock to avoid concurrent refresh stampede
- No Redis persistence (token refresh is cheap; avoids cross-pod token sharing complexity)

### `AmadeusHttpClient`

```
axios instance
  → baseURL: AMADEUS_BASE_URL
  → timeout: connect 2000 ms, read 15 000 ms (per PROJECT.md inventory-service override)
  → request interceptor: inject Bearer token from AmadeusTokenService
  → response interceptor: normalise error shape

  wrapped in opossum CircuitBreaker:
    errorThresholdPercentage: 50
    volumeThreshold: 10
    timeout: 15 000       (matches axios read timeout)
    resetTimeout: 30 000  (half-open after 30 s)
    fallback: () => throw new AmadeusUnavailableException()  → HTTP 503

  wrapped in retry decorator:
    maxAttempts: 3 (4 total)
    backoff: exponential, base 200 ms, max 5 000 ms, jitter ±50%
    retryOn: [500, 502, 503, 504, 408]
    noRetryOn: [400, 401, 403, 404, 422]
```

**Amadeus endpoints used**:
- `GET /v2/shopping/flight-offers` — flight search
- `POST /v1/booking/flight-orders` — seat reservation (hold)
- `DELETE /v1/booking/flight-orders/{orderId}` — cancel reservation

---

## Cache Design

### Flight Search Cache (Cache-aside)

- **Key**: `inventory:flight-search:<SHA-256(canonical_params)>`
- **Canonical params**: JSON-serialised sorted object `{ cabinClass, departureDate (YYYY-MM-DD), destination, origin, passengers, returnDate (YYYY-MM-DD or '') }` — all date params normalised to `YYYY-MM-DD` before hashing to eliminate format variation (resolves Open Question 3)
- **TTL**: 300 s (5 min)
- **Value**: JSON-serialised array of `FlightOffer` DTOs
- **On cache hit**: return immediately, `source: 'CACHE'`, `cachedAt` from stored metadata
- **On cache miss**: call Amadeus, store result in Redis, `source: 'LIVE'`, `cachedAt: null`
- **Cache unavailability**: if Redis is unreachable, `FlightSearchCacheService.get()` returns `null` (treated as miss); `set()` logs warning and continues — Amadeus is always called as fallback
- **Eviction**: LRU (Redis default for volatile keys); no explicit invalidation (TTL is the only expiry mechanism)

### Idempotency Cache

- **Key**: `inventory:idempotency:<Idempotency-Key UUID>`
- **TTL**: 86 400 s (24 h)
- **Value**: JSON-serialised `ReservationResponse`
- **On hit**: return 200 with cached response, skip all business logic
- **On miss**: process request, persist to DB, write to Redis, return 201
- **Key format validation**: must be a valid UUID v4; 400 returned if malformed

---

## Idempotency Design

1. Presentation layer extracts `Idempotency-Key` header (UUID v4, required on POST).
2. `CreateReservationUseCase` calls `IdempotencyService.get(key)`.
3. If found → return cached `ReservationResponse` with HTTP 200 (no DB/Amadeus calls).
4. If not found → execute full business logic → persist reservation → publish Kafka event → call `IdempotencyService.set(key, response, 86400)`.
5. Concurrent duplicate requests: first request acquires a Redis `SET NX EX 30` lock keyed `inventory:idempotency-lock:<key>`; second request receives 409 Conflict with `Retry-After: 1`.
6. Idempotency key stored in `flight_reservations.idempotency_key` column for durability beyond Redis TTL.

---

## Transaction & Consistency Design

Direct Kafka publish (no Outbox). Sequence:
1. Begin PostgreSQL transaction.
2. Insert `flight_reservations` row (status: PENDING).
3. Commit transaction.
4. Publish `FlightReserved` Kafka event.
5. Write idempotency response to Redis.

**Failure window**: If step 4 fails after step 3, the reservation exists in DB but no Kafka event is emitted. The `booking-service` Saga will time out and cancel. This is accepted per PROJECT.md §6 (no Outbox). The operator can manually reprocess or the Saga compensates.

---

## Expiry Job Design

```typescript
@Cron('* * * * *')   // every minute
async expireReservations(): Promise<void> {
  const expired = await reservationRepo.findPendingExpired(new Date());
  for (const reservation of expired) {
    reservation.expire();                          // domain state → EXPIRED
    await reservationRepo.save(reservation);       // DB update
    await eventPublisher.publish(                  // Kafka event
      new FlightReservationExpired(reservation)
    );
  }
}
```

- `findPendingExpired(now)`: `SELECT * FROM flight_reservations WHERE status = 'PENDING' AND expires_at < $1` (uses `idx_fr_status_expires`)
- Each reservation processed individually to isolate failures; errors are logged and do not abort the batch
- Job is idempotent: calling it twice for the same reservation is safe because `expire()` is a no-op if status ≠ PENDING

---

## Event Schema

All events follow ADR-003 schema:

```typescript
interface InventoryEvent {
  eventId: string;          // UUID v4
  eventType: string;        // see below
  aggregateId: string;      // reservationId (UUID v4)
  occurredOn: string;       // ISO 8601
  correlationId: string;    // from X-Correlation-ID header
  causationId: string;      // triggering command/event ID
  data: Record<string, unknown>;
}
```

### `FlightReserved` → topic `inventory-events`, `eventType: "FlightReserved"`

```json
{
  "eventType": "FlightReserved",
  "data": {
    "reservationId": "uuid",
    "offerId": "string",
    "passengerId": "uuid",
    "origin": "IATA",
    "destination": "IATA",
    "flightNumber": "string",
    "carrier": "string",
    "departureAt": "ISO 8601",
    "arrivalAt": "ISO 8601",
    "cabinClass": "string",
    "expiresAt": "ISO 8601"
  }
}
```

### `FlightReservationCancelled` → topic `inventory-events`, `eventType: "FlightReservationCancelled"`

```json
{
  "eventType": "FlightReservationCancelled",
  "data": {
    "reservationId": "uuid",
    "passengerId": "uuid",
    "cancelledAt": "ISO 8601",
    "reason": "USER_REQUESTED | SAGA_COMPENSATED"
  }
}
```

### `FlightReservationExpired` → topic `inventory-events`, `eventType: "FlightReservationExpired"`

```json
{
  "eventType": "FlightReservationExpired",
  "data": {
    "reservationId": "uuid",
    "passengerId": "uuid",
    "offerId": "string",
    "expiredAt": "ISO 8601"
  }
}
```

---

## Error Handling

| Situation | HTTP Status | Log Level | Notes |
|---|---|---|---|
| Amadeus circuit open | 503 | warn | Include `circuit_state: 'open'` in log context |
| Amadeus 404 (offer not found) | 404 | info | Non-retryable; propagate to caller |
| Amadeus 4xx validation | 422 | warn | Forward Amadeus message in error details |
| Reservation not found | 404 | info | |
| Cancel CANCELLED/EXPIRED reservation | 422 | info | |
| Redis unavailable (search cache) | — | warn | Degrade gracefully; call Amadeus directly |
| Redis unavailable (idempotency) | 500 | error | Cannot guarantee idempotency; reject with 503 |
| DB timeout | 500 | error | Retry at DB level not implemented; caller retries |
| Expiry job failure (single item) | — | error | Log and continue to next item |

---

## Security Considerations

- JWT validation delegated to API Gateway; `inventory-service` trusts `X-User-Id`, `X-User-Role` headers injected by gateway
- `RolesGuard` enforces `Employee | Manager | Admin` on all endpoints
- `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` stored in Kubernetes Secret `inventory-service-secrets`; never logged or exposed in API responses
- `passportNumber` stored encrypted at rest using **application-level AES-256-CBC encryption** before TypeORM insert; decrypted in the mapper on load. Encryption key `PASSPORT_ENCRYPTION_KEY` stored in Kubernetes Secret `inventory-service-secrets`. This approach requires no PostgreSQL extensions and is portable across database vendors.
- No full card numbers; no PII beyond passenger name/DOB/passport number
- Input validation via `class-validator` on all DTOs; unknown fields stripped via `class-transformer`
- Rate limiting enforced at API Gateway (30 req/min for search per PROJECT.md resilience defaults)

---

## Observability

### Prometheus Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` | All HTTP requests |
| `http_request_duration_seconds` | Histogram | `method`, `route` | p50, p95, p99 |
| `cache_hit_total` | Counter | `cache`, `operation` | Redis cache hits (cache=`flight-search`) |
| `cache_miss_total` | Counter | `cache`, `operation` | Redis cache misses |
| `amadeus_api_calls_total` | Counter | `endpoint`, `status` | Amadeus HTTP calls |
| `amadeus_api_errors_total` | Counter | `endpoint`, `error_type` | Amadeus errors (timeout, 4xx, 5xx) |
| `circuit_state` | Gauge | `service` (amadeus) | 0=closed, 0.5=half-open, 1=open |
| `circuit_breaker_errors_total` | Counter | `service` | Errors counted towards CB threshold |
| `retry_count` | Counter | `operation`, `outcome` | Retry attempts (outcome=`success\|exhausted`) |
| `kafka_events_published_total` | Counter | `topic`, `status` | Kafka publishes (status=`success\|failure`) |
| `reservations_expired_total` | Counter | — | Reservations marked EXPIRED by job |
| `db_query_duration_seconds` | Histogram | `operation` | TypeORM query durations |

### Tracing (OpenTelemetry)

- Span per HTTP request (auto-instrumented via `@opentelemetry/instrumentation-nestjs-core`)
- Span per Amadeus HTTP call: `amadeus.search_flights`, `amadeus.create_order`, `amadeus.cancel_order`
- Span per DB query (TypeORM auto-instrumentation)
- Span per Kafka event publish: `kafka.publish.<topic>`
- `correlationId` propagated as span attribute and baggage from `X-Correlation-ID` header

### Structured Logging (Winston)

All log lines include: `{ timestamp, level, service: "inventory-service", correlationId, message, context }`

Key log events:
- `info` — `flight_search_cache_hit`, `flight_search_cache_miss`, `reservation_created`, `reservation_cancelled`, `reservation_expired`
- `warn` — `amadeus_circuit_open`, `redis_unavailable`, `amadeus_retry_attempt`, `amadeus_4xx`
- `error` — `amadeus_circuit_tripped`, `kafka_publish_failed`, `expiry_job_item_failed`, `db_error`

---

## Dependencies on Other Changes

| Change | SM Ref | What is needed |
|---|---|---|
| `@travel/shared` package | SM-01 (DONE) | `KafkaModule`, `AggregateRoot`, `DomainEvent`, `IRepository`, `TypedId` |
| `booking-service` Saga | SM-05 (future) | Consumes `FlightReserved` to proceed with booking; cancels via `DELETE /flights/reservations/:id` |
