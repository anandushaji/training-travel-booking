# Design: Booking Service (SM-07)

## Pattern Selection Log

| Pattern              | Decision         | Rationale                                                                                                      |
|----------------------|------------------|----------------------------------------------------------------------------------------------------------------|
| Database-per-service | Applied          | Booking data belongs exclusively to this bounded context; no other service accesses the DB directly            |
| CQRS                 | Applied          | Write load (saga orchestration) and read load (booking lists/details) have different shapes; read model is denormalized for low-latency queries |
| Saga (Orchestration) | Applied          | Three cross-service mutations (policy validation, reservation, payment) must be atomic with compensating rollback |
| Saga (Choreography)  | Not applicable   | Orchestration is preferred here — the booking service is the origin of truth for the transaction; choreography would distribute this responsibility |
| Outbox               | Not applicable   | PROJECT.md §6 explicitly opts out of the outbox relay; direct Kafka publish after DB commit is mandated        |
| Idempotency          | Applied          | Kafka `PaymentCaptured` / `PaymentFailed` consumer checks `eventId` in `processed_events`-equivalent logic before acting |
| Timeouts             | Applied          | Downstream HTTP calls to Policy/Inventory/Payment must be bounded; unbounded calls would break booking SLA     |
| Retries with Backoff | Applied          | Transient network blips to downstream services should be retried before escalating to circuit breaker           |
| Circuit Breaker      | Applied          | Each downstream service (Policy, Inventory, Payment) has an independent opossum CB; open CB triggers saga compensation immediately |
| Bulkheads            | Not applicable   | Three separate CB instances already provide isolation; separate thread pools add no benefit at expected load    |
| Cache-aside          | Not applicable   | Booking data is highly dynamic; caching would add stale-read risk without significant latency benefit           |
| Cache Invalidation   | Not applicable   | No cache applied                                                                                               |

**Applied patterns**: Database-per-service, CQRS, Saga (Orchestration), Idempotency, Timeouts, Retries with Backoff, Circuit Breaker

---

## Architecture Overview

```
                        ┌─────────────────────────────────────────────────────┐
                        │              booking-service  :3001                  │
                        │                                                      │
  API Gateway ──────────▶  POST /bookings   → CreateBookingUseCase            │
                        │  GET  /bookings   → BookingQueryService             │
                        │  GET  /bookings/:id → BookingQueryService           │
                        │  POST /bookings/:id/cancel → CancelBookingUseCase   │
                        │  PATCH /bookings/:id → UpdateBookingUseCase         │
                        │                                                      │
                        │  ┌─────────────────────────────────────────────┐    │
                        │  │       BookingSagaOrchestrator                │    │
                        │  │  1. Validate Policy                          │    │
                        │  │  2. Create Reservation                       │    │
                        │  │  3. Authorize Payment                        │    │
                        │  │  4. Confirm + Capture                        │    │
                        │  │  ↳ Compensate on failure (reverse order)     │    │
                        │  └─────────────────────────────────────────────┘    │
                        │                                                      │
                        │  ┌─────────────┐  ┌──────────────────────────────┐  │
                        │  │ PostgreSQL  │  │  Kafka Consumer               │  │
                        │  │ booking-db  │  │  payment-events               │  │
                        │  │  5 tables   │  │  PaymentCaptured→confirm      │  │
                        │  └─────────────┘  │  PaymentFailed→compensate     │  │
                        │                   └──────────────────────────────┘  │
                        └─────────────────────────────────────────────────────┘
                              │           │           │             │
                    POST /policies  POST /inventory  POST /payments  booking-events
                       /validate    /reservations     /authorize      (Kafka publish)
                              ▼           ▼           ▼
                        Policy Svc  Inventory Svc  Payment Svc
                        :3002       :3005          :3004
```

---

## Data Model / Schema Changes

### PostgreSQL — `booking_service` schema

**`bookings`**
```sql
CREATE TABLE bookings (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id           UUID NOT NULL,
  offer_id              VARCHAR(255) NOT NULL,
  status                VARCHAR(50) NOT NULL,
  itinerary             JSONB NOT NULL,
  policy_validation_id  UUID,
  reservation_id        VARCHAR(255),
  payment_id            UUID,
  total_amount          DECIMAL(10,2) NOT NULL,
  currency              VARCHAR(3) NOT NULL DEFAULT 'USD',
  special_requests      TEXT,
  confirmed_at          TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  cancel_reason         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version               INT NOT NULL DEFAULT 1,
  CONSTRAINT chk_status CHECK (
    status IN ('PENDING','RESERVED','PAYMENT_PROCESSING','CONFIRMED','CANCELLED','FAILED')
  )
);
CREATE INDEX idx_bookings_traveler_id ON bookings(traveler_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
```

`itinerary` JSONB schema:
```json
{
  "origin":        "JFK",
  "destination":   "LAX",
  "departureDate": "2024-06-15",
  "returnDate":    "2024-06-20",
  "cabinClass":    "ECONOMY",
  "passengers":    1
}
```

**`booking_sagas`**
```sql
CREATE TABLE booking_sagas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID NOT NULL REFERENCES bookings(id),
  status       VARCHAR(50) NOT NULL,
  current_step INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_saga_status CHECK (
    status IN ('STARTED','IN_PROGRESS','COMPLETED','COMPENSATING','COMPENSATED','COMPENSATED_WITH_ERRORS','FAILED')
  )
);
```

**`booking_saga_steps`**
```sql
CREATE TABLE booking_saga_steps (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saga_id       UUID NOT NULL REFERENCES booking_sagas(id),
  step_number   INT NOT NULL,
  step_name     VARCHAR(100) NOT NULL,
  status        VARCHAR(50) NOT NULL,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ,
  error_message TEXT,
  retry_count   INT NOT NULL DEFAULT 0,
  CONSTRAINT chk_step_status CHECK (
    status IN ('PENDING','IN_PROGRESS','COMPLETED','FAILED','COMPENSATING','COMPENSATED')
  )
);
```

**`event_store`** (append-only audit log)
```sql
CREATE TABLE event_store (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_id   UUID NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  event_type     VARCHAR(100) NOT NULL,
  event_data     JSONB NOT NULL,
  event_version  INT NOT NULL,
  occurred_on    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id UUID,
  causation_id   UUID
);
CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_id, event_version);
CREATE INDEX idx_event_store_type ON event_store(event_type);
CREATE INDEX idx_event_store_correlation ON event_store(correlation_id);
```

**`booking_read_model`** (CQRS query side)
```sql
CREATE TABLE booking_read_model (
  id              UUID PRIMARY KEY,
  traveler_id     UUID NOT NULL,
  traveler_name   VARCHAR(255),
  traveler_email  VARCHAR(255),
  status          VARCHAR(50) NOT NULL,
  origin          VARCHAR(3) NOT NULL,
  destination     VARCHAR(3) NOT NULL,
  departure_date  DATE NOT NULL,
  return_date     DATE,
  cabin_class     VARCHAR(50),
  total_amount    DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(3) NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL
);
CREATE INDEX idx_read_model_traveler ON booking_read_model(traveler_id, created_at DESC);
CREATE INDEX idx_read_model_status ON booking_read_model(status);
CREATE INDEX idx_read_model_dates ON booking_read_model(departure_date);
```

### Redis

Not used in this service (no caching).

---

## API / Interface Contracts

See `docs/contracts/openapi/openapi-booking-service.yaml` for the authoritative
contract. Summary:

| Method | Path                          | Auth          | Description                  |
|--------|-------------------------------|---------------|------------------------------|
| GET    | /health                       | None          | Liveness check               |
| GET    | /ready                        | None          | Readiness (DB check)         |
| GET    | /bookings                     | JWT (any)     | List bookings (read model)   |
| POST   | /bookings                     | JWT (any)     | Create booking (Saga)        |
| GET    | /bookings/:id                 | JWT (any)     | Get booking by ID            |
| PATCH  | /bookings/:id                 | JWT (any)     | Update specialRequests       |
| POST   | /bookings/:id/cancel          | JWT (any)     | Cancel booking (Saga comp.)  |

### Kafka events published (topic: `booking-events`)

All events conform to ADR-003 envelope:
```typescript
{
  eventId:       string;   // UUID v4
  eventType:     string;
  aggregateId:   string;   // booking ID
  occurredOn:    string;   // ISO-8601
  correlationId: string;
  causationId:   string;
  version:       string;   // "1.0" — ADR-003 schema versioning
  data:          object;
}
```

**`BookingCreated`**
```json
{
  "eventType": "BookingCreated",
  "data": {
    "travelerId":  "...",
    "offerId":     "...",
    "itinerary":   { "origin": "JFK", "destination": "LAX", ... },
    "totalAmount": 450.00,
    "currency":    "USD"
  }
}
```

**`BookingConfirmed`**
```json
{
  "eventType": "BookingConfirmed",
  "data": {
    "travelerId":    "...",
    "travelerName":  "...",
    "travelerEmail": "...",
    "reservationId": "AMADEUS-PNR-ABC123",
    "paymentId":     "...",
    "itinerary":     { ... },
    "totalAmount":   450.00,
    "currency":      "USD",
    "confirmedAt":   "2024-06-01T10:00:00Z"
  }
}
```

**`BookingCancelled`**
```json
{
  "eventType": "BookingCancelled",
  "data": {
    "travelerId":   "...",
    "reason":       "Change of plans",
    "cancelledAt":  "2024-06-01T12:00:00Z"
  }
}
```

### Kafka events consumed (topic: `payment-events`)

| Event type       | Action                                              |
|------------------|-----------------------------------------------------|
| `PaymentCaptured`| Advance saga to CONFIRMED; publish BookingConfirmed |
| `PaymentFailed`  | Trigger saga compensation; publish BookingCancelled |

---

## Resilience Design

### Timeouts (per HTTP client)

Each of the three downstream HTTP clients (Policy, Inventory, Payment) is
configured with:
- `timeout.connect`: 2 000 ms (`*_CONNECT_TIMEOUT_MS`, default `2000`)
- `timeout.response`: 5 000 ms (`*_READ_TIMEOUT_MS`, default `5000`)

### Retries with Backoff

`axios-retry` applied to each Axios instance:
- Max retries: **3**
- Delay formula: `min(200 * 2^attempt, 5000) * (1 ± 0.25 * random())`
- Retryable: network errors, `ECONNRESET`, `ETIMEDOUT`, HTTP 429, HTTP 5xx
- Non-retryable: HTTP 4xx (except 429)

### Circuit Breaker (opossum — one instance per downstream)

| Parameter                  | Value       |
|----------------------------|-------------|
| errorThresholdPercentage   | 50          |
| volumeThreshold            | 10 requests |
| timeout                    | 5 000 ms    |
| resetTimeout               | 30 000 ms   |
| Fallback                   | Throw `ServiceUnavailableException` — triggers saga compensation |

When CB is OPEN for Policy or Inventory, the saga compensates and the booking
is marked `FAILED`. When CB is OPEN for Payment, same behaviour.

---

### Transaction & Consistency Design

**Optimistic Locking**

`@VersionColumn()` on `BookingEntity` prevents concurrent mutation.
On version conflict, TypeORM throws `OptimisticLockVersionMismatchError`;
the application layer maps this to HTTP 409.

**Saga Durability**

Each `BookingStep` row is written to `booking_saga_steps` with `status=IN_PROGRESS`
**before** calling the downstream service. On success it is updated to `COMPLETED`.
On failure it is updated to `FAILED` and compensation begins.

This means if the service restarts mid-saga, a recovery job (future scope —
not in this iteration) can detect `IN_PROGRESS` steps older than N minutes
and compensate them. The schema supports this pattern.

**Compensation Failure Handling**

If a compensating transaction itself fails (e.g., `cancelReservation` returns 500
after 3 retries, or CB is OPEN for Inventory during compensation):
1. The failed compensation step is logged as `ERROR` with `bookingId`, `sagaId`,
   `stepName`, and the error message.
2. The saga is marked `COMPENSATED_WITH_ERRORS` (a new allowed status value).
3. A `booking_saga_compensation_failed_total` counter is incremented (Prometheus).
4. An `ERROR` log entry is emitted with the fields above — this is the manual
   intervention trigger; operators use the `bookingId` to manually reverse the
   partial reservation or payment via the downstream service's admin API.

This is a best-effort compensation model consistent with the project's direct-publish
approach (no outbox, no distributed transaction coordinator).

**Idempotency on Kafka Consumer**

Before processing `PaymentCaptured` or `PaymentFailed`, the consumer checks
`booking_sagas` for the booking's current saga status. If the saga is already
`COMPLETED` or `COMPENSATED`, the event is a no-op (idempotent).

---

## Error Handling

| Condition                                  | HTTP status | Error code                   |
|--------------------------------------------|-------------|------------------------------|
| Booking not found                          | 404         | `NOT_FOUND`                  |
| Policy validation failed                   | 422         | `POLICY_VIOLATION`           |
| Inventory reservation failed               | 422         | `RESERVATION_FAILED`         |
| Payment authorization failed               | 422         | `PAYMENT_FAILED`             |
| Booking already CANCELLED                  | 409         | `BOOKING_ALREADY_CANCELLED`  |
| Booking not cancellable (CONFIRMED w/ no refund) | 409   | `BOOKING_CANNOT_BE_CANCELLED`|
| Optimistic lock conflict                   | 409         | `CONFLICT`                   |
| JWT missing / invalid                      | 401         | `UNAUTHORIZED`               |
| Downstream service CB OPEN                 | 503         | `SERVICE_UNAVAILABLE`        |

All unhandled exceptions are caught by `HttpExceptionFilter`:
```json
{ "error": "<code>", "message": "<message>", "details": [] }
```

---

## Security Considerations

- JWT validation delegated to API Gateway; this service trusts decoded payload headers.
- All authenticated endpoints require valid JWT (`JwtAuthGuard`).
- No PCI-DSS data stored — payment tokenization handled by Payment Service.
- `travelerId` from JWT subject must match `travelerId` in `POST /bookings` for
  EMPLOYEE role; MANAGER/ADMIN may book on behalf of any traveler.
- Input DTOs validated with `class-validator` (`whitelist: true, forbidNonWhitelisted: true`).
- Kafka credentials and DB connection string from environment variables only.

---

## Observability

Per ADR-007:

**Metrics (Prometheus)**
- `http_requests_total{method, route, status_code}` — Counter
- `http_request_duration_seconds{method, route}` — Histogram
- `bookings_created_total` — Counter
- `bookings_confirmed_total` — Counter
- `bookings_cancelled_total` — Counter
- `booking_saga_duration_seconds` — Histogram (full saga execution time)
- `booking_saga_compensation_failed_total` — Counter (incremented when compensation step fails)
- `downstream_retries_total{service: policy|inventory|payment}` — Counter
- `downstream_cb_state{service: policy|inventory|payment, state: closed|open|half-open}` — Gauge

**Traces (OpenTelemetry / Jaeger)**
- Span per HTTP request (auto-instrumented)
- Span per DB query (TypeORM instrumentation)
- Span per downstream HTTP call (per saga step)
- Span per Kafka event published/consumed
- `X-Correlation-ID` propagated on all outbound calls

**Logs (Winston / Elasticsearch)**
JSON structured, required fields: `timestamp, level, service: "booking-service", correlationId, message, context`

Key log events:
- `INFO` — booking created, confirmed, cancelled
- `INFO` — saga step completed/compensated
- `WARN` — downstream CB open; saga compensating
- `ERROR` — saga failed after compensation; unhandled exception

---

## Dependencies on Other Changes

| SM     | What is needed                                                                                     |
|--------|----------------------------------------------------------------------------------------------------|
| SM-01  | `@travel/shared` — `AggregateRoot`, `DomainEvent`, `KafkaModule`, exception classes, UUID utils   |
| SM-03  | Traveler Service (not called directly; `travelerId` UUID is trusted from JWT)                      |
| SM-04  | Inventory Service running at `INVENTORY_SERVICE_URL`; `POST /inventory/reservations`, `DELETE /inventory/reservations/:id` |
| SM-05  | Policy Service running at `POLICY_SERVICE_URL`; `POST /policies/validate`                          |
| SM-06  | Payment Service running at `PAYMENT_SERVICE_URL`; `POST /payments/authorize`, `POST /payments/:id/capture`, `POST /payments/:id/refund` |
