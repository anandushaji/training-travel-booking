# Design: Expense Service (SM-08)

## Pattern Selection Log

| Pattern | Decision | Rationale |
|---|---|---|
| Database-per-service | **Applied** | Expense bounded context owns `expense-db` (PostgreSQL); no cross-service DB access per ADR-001 |
| CQRS | **Not applicable** | Simple domain with two aggregates; read and write use the same tables; no projection complexity justifying a separate read model |
| Saga (Choreography) | **Applied** | Service reacts to `BookingConfirmed`/`BookingCancelled` events without an orchestrator; per ADR-003 choreography pattern |
| Saga (Orchestration) | **Not applicable** | No multi-step transactions that require an orchestrator; expense creation is atomic within the service |
| Outbox | **Not applicable** | PROJECT.md §6 states outbox relay is not implemented project-wide; direct publish after DB commit (same decision as booking-service, driven by project constraint not local choice) |
| Idempotency | **Applied** | Kafka delivers at-least-once; `processed_events` table guards against duplicate receipt/expense creation |
| Timeouts | **Applied** | DB query timeouts (5s per ADR-008 defaults) applied via TypeORM; no outbound HTTP calls |
| Retries | **Not applicable** | Service makes no synchronous outbound HTTP calls; Kafka handles redelivery automatically |
| Circuit Breaker | **Not applicable** | No synchronous calls to external services; not required per microservice-patterns.md |
| Bulkheads | **Not applicable** | No heavy concurrent downstream calls; connection pooling (TypeORM max 20) is sufficient |
| Cache-aside | **Not applicable** | Deferred to v2 per PROJECT.md §12 (24h TTL for immutable receipts); v1 query volume does not justify complexity |
| Read-through | **Not applicable** | No caching in v1 |
| Write-through | **Not applicable** | No caching in v1 |
| Cache Invalidation | **Not applicable** | No caching in v1 |

**Applied patterns**: Database-per-service, Saga (Choreography), Idempotency, Timeouts  
**Architectural assumptions**: `BookingConfirmed` carries all fields needed for receipt generation; no sync calls to other services required

---

## Architecture Overview

```
booking-events (Kafka)
        │
        ▼
 ┌──────────────────────────────────┐
 │        expense-service (3006)    │
 │                                  │
 │  BookingEventConsumer            │
 │    └─► idempotency check         │
 │    └─► GenerateReceiptUseCase    │──► receipts table
 │    └─► VoidReceiptUseCase        │──► expenses table
 │                                  │──► processed_events table
 │  ExpenseEventPublisher           │
 │    └─► expense-events (Kafka)    │
 │                                  │
 │  ReceiptController               │
 │  ExpenseController               │◄─── API Gateway (JWT)
 └──────────────────────────────────┘
              │
              ▼
         expense-db (PostgreSQL)
```

The expense service has no outbound synchronous HTTP calls.
All inputs arrive via Kafka events or inbound REST requests (proxied
by the API Gateway, which validates JWT before forwarding).

---

## Data Model / Schema Changes

### New tables in `expense-db`

#### `receipts`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Generated |
| `receipt_number` | VARCHAR(20) UNIQUE | `RCP-YYYY-NNNNNN` |
| `booking_id` | UUID UNIQUE | FK concept (no cross-DB FK) |
| `traveler_id` | UUID NOT NULL | Indexed |
| `traveler_name` | VARCHAR(255) | From event payload |
| `traveler_email` | VARCHAR(255) | From event payload |
| `amount` | DECIMAL(10,2) NOT NULL | |
| `currency` | VARCHAR(3) NOT NULL | Default 'USD' |
| `origin` | VARCHAR(3) NOT NULL | IATA code |
| `destination` | VARCHAR(3) NOT NULL | IATA code |
| `departure_date` | DATE NOT NULL | |
| `status` | VARCHAR(20) NOT NULL | `ACTIVE` \| `VOIDED` |
| `generated_at` | TIMESTAMPTZ NOT NULL | |
| `voided_at` | TIMESTAMPTZ NULL | Set on cancellation |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

#### `expenses`
| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | Generated |
| `booking_id` | UUID NOT NULL UNIQUE | Indexed |
| `receipt_id` | UUID NOT NULL | Indexed |
| `traveler_id` | UUID NOT NULL | Indexed |
| `traveler_name` | VARCHAR(255) | |
| `amount` | DECIMAL(10,2) NOT NULL | |
| `currency` | VARCHAR(3) NOT NULL | |
| `category` | VARCHAR(50) NOT NULL | Default `Flight` in v1 |
| `description` | VARCHAR(500) | `{origin} to {destination}` |
| `expense_date` | DATE NOT NULL | Departure date |
| `status` | VARCHAR(20) NOT NULL | `ACTIVE` \| `CANCELLED` |
| `cancelled_at` | TIMESTAMPTZ NULL | |
| `created_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

#### `expense_reports`
Reserved for pre-computed report caching (v2). In v1 the table exists
but reports are computed on-the-fly from the `expenses` table.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `period_start` | DATE NOT NULL | |
| `period_end` | DATE NOT NULL | |
| `generated_at` | TIMESTAMPTZ NOT NULL | |
| `payload` | JSONB | Cached report body |

#### `processed_events`
| Column | Type | Notes |
|---|---|---|
| `event_id` | UUID PK | ADR-003 `eventId` field |
| `event_type` | VARCHAR(100) NOT NULL | e.g. `BookingConfirmed` |
| `processed_at` | TIMESTAMPTZ NOT NULL DEFAULT now() | |

---

## API / Interface Contracts

### REST (per `openapi-expense-service.yaml`)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Liveness check |
| `GET` | `/ready` | None | Readiness (DB ping) |
| `GET` | `/receipts` | JWT | List receipts (travelerId scoped for EMPLOYEE) |
| `GET` | `/receipts/:id` | JWT | Get single receipt |
| `GET` | `/expenses` | JWT | Expense report (startDate, endDate required) |
| `GET` | `/expenses/summary` | JWT | Aggregate summary by fiscal year |
| `GET` | `/expenses/export` | JWT | CSV export of expenses |
| `GET` | `/categories` | JWT | Static list of expense categories |

> **v1 deferred**: `GET /receipts/:id/download` (PDF), `POST /receipts/:id/regenerate`

### Kafka events consumed (`booking-events`)

**BookingConfirmed** (ADR-003 envelope):
```json
{
  "eventId": "uuid",
  "eventType": "BookingConfirmed",
  "aggregateId": "<bookingId>",
  "occurredOn": "ISO8601",
  "correlationId": "uuid",
  "causationId": "uuid",
  "version": "1.0",
  "data": {
    "travelerId": "uuid",
    "travelerName": "Alice Smith",
    "travelerEmail": "alice@example.com",
    "totalAmount": 450.00,
    "currency": "USD",
    "origin": "JFK",
    "destination": "LAX",
    "departureDate": "2026-08-01"
  }
}
```

**BookingCancelled** (ADR-003 envelope):
```json
{
  "eventId": "uuid",
  "eventType": "BookingCancelled",
  "aggregateId": "<bookingId>",
  "occurredOn": "ISO8601",
  "correlationId": "uuid",
  "causationId": "uuid",
  "version": "1.0",
  "data": {
    "travelerId": "uuid",
    "reason": "string"
  }
}
```

### Kafka events published (`expense-events`)

**ReceiptGenerated**:
```json
{
  "eventId": "uuid",
  "eventType": "ReceiptGenerated",
  "aggregateId": "<receiptId>",
  "occurredOn": "ISO8601",
  "correlationId": "uuid",
  "causationId": "<bookingConfirmedEventId>",
  "version": "1.0",
  "data": {
    "bookingId": "uuid",
    "travelerId": "uuid",
    "receiptNumber": "RCP-2026-000001",
    "amount": 450.00,
    "currency": "USD"
  }
}
```

**ExpenseRecorded**:
```json
{
  "eventId": "uuid",
  "eventType": "ExpenseRecorded",
  "aggregateId": "<expenseId>",
  "occurredOn": "ISO8601",
  "correlationId": "uuid",
  "causationId": "<bookingConfirmedEventId>",
  "version": "1.0",
  "data": {
    "bookingId": "uuid",
    "travelerId": "uuid",
    "amount": 450.00,
    "currency": "USD",
    "status": "ACTIVE"
  }
}
```

---

## Transaction & Consistency Design

### Idempotency

**Key strategy**: ADR-003 `eventId` UUID (globally unique per event).  
**Dedup store**: `processed_events` table — PK uniqueness enforces exactly-once
  processing at the DB layer.  
**TTL**: None (permanent record; storage is bounded by retention policy).

**Processing flow (BookingConfirmed)**:
1. Check `processed_events` for `eventId` — if found, ack message and return.
2. Begin DB transaction:
   a. Insert `receipts` row.
   b. Insert `expenses` row.
   c. Insert `processed_events` row (`eventId`, `eventType`, `processedAt`).
3. Commit transaction.
4. Publish `ReceiptGenerated` + `ExpenseRecorded` to `expense-events` (best-effort,
   errors logged; direct publish per PROJECT.md §6).
5. Commit Kafka offset.

**Processing flow (BookingCancelled)**:
1. Check `processed_events` for `eventId` — if found, ack and return.
2. Look up receipt by `bookingId` — if not found (booking was never confirmed), ack and return.
3. Begin DB transaction:
   a. Update `receipts.status = VOIDED`, set `voided_at`.
   b. Update `expenses.status = CANCELLED`, set `cancelled_at`.
   c. Insert `processed_events` row.
4. Commit transaction.
5. Publish `ExpenseRecorded` (status: `CANCELLED`) to `expense-events`.
6. Commit Kafka offset.

### Saga Choreography Integration

The expense service is a **downstream choreography participant**. It reacts to
events produced by the booking-service and does not emit commands back to it.
The choreography contract is defined by the `BookingConfirmed` and
`BookingCancelled` event schemas above.

---

## Resilience Design

### Timeouts
- DB connection timeout: 5s (TypeORM `connectTimeoutMS: 5000`)
- DB query timeout (ADR-008): 5s via PostgreSQL `statement_timeout` and node-postgres
  `query_timeout` in the TypeORM `extra` block:
  ```typescript
  extra: { statement_timeout: 5000, query_timeout: 5000 }
  ```
- No outbound HTTP calls — no HTTP timeouts required

### Error Handling in Kafka Consumer
- **Transient DB error** during processing: do NOT commit Kafka offset; allow
  Kafka to redeliver. The idempotency check ensures reprocessing is safe.
- **Duplicate `eventId`** (already in `processed_events`): ack silently.
- **Missing required field in event payload**: log ERROR with `eventId` and
  `correlationId`; commit offset (poison-pill handling — do not block partition).

---

## Error Handling

| Exception | HTTP Status | Error Code |
|---|---|---|
| Receipt not found | 404 | `RECEIPT_NOT_FOUND` |
| Unauthorized (missing/invalid JWT) | 401 | `UNAUTHORIZED` |
| Forbidden (EMPLOYEE accessing other's data) | 403 | `FORBIDDEN` |
| Validation error (missing required query param) | 400 | `VALIDATION_ERROR` |
| DB unavailable on /ready | 503 | `SERVICE_UNAVAILABLE` |

---

## Security Considerations

- All REST routes (except `/health`, `/ready`) require `JwtAuthGuard`.
- EMPLOYEE role: scoped to own `travelerId` (from JWT `sub` field).
- MANAGER/ADMIN: can query any `travelerId` or omit it for all records.
- No PII logged beyond `correlationId` and `travelerId` (no email/name in logs).
- No secrets in source code; `DATABASE_URL`, `KAFKA_BROKERS` from env.

---

## Observability

### Metrics (Prometheus)
- `http_requests_total{method, route, status_code}` — Counter
- `http_request_duration_seconds{method, route}` — Histogram
- `receipts_generated_total` — Counter (incremented on successful receipt creation)
- `receipts_voided_total` — Counter (incremented on successful void)
- `expense_events_processed_total{event_type, outcome}` — Counter (labels: `BookingConfirmed`/`BookingCancelled`, `success`/`duplicate`/`error`)
- `kafka_messages_produced_total{topic}` — Counter (required per ADR-007/PROJECT.md §8; incremented on each publish to `expense-events`)
- `kafka_consumer_lag{topic, group}` — Gauge (required per ADR-007/PROJECT.md §8; reflects current consumer group lag on `booking-events`)

### Traces (Jaeger / OpenTelemetry)
- Span per HTTP request
- Span per DB query
- Span per Kafka message consumed/produced
- `correlationId` propagated via `X-Correlation-ID` header

### Logs (Winston / JSON)
- `INFO` on receipt generated: `{ eventId, bookingId, receiptId, receiptNumber }`
- `INFO` on receipt voided: `{ eventId, bookingId, receiptId }`
- `INFO` on duplicate event skipped: `{ eventId, eventType }`
- `ERROR` on event processing failure: `{ eventId, eventType, error }`

---

## Dependencies on Other Changes

| SM | What is needed |
|---|---|
| SM-01 | `@travel/shared`: `AggregateRoot`, `Entity`, `DomainEvent`, `generateUuid`, `DomainException`, `NotFoundException`, `KafkaModule` |
| SM-07 | `BookingConfirmed` and `BookingCancelled` event schemas (Pact contract defines the consumer-side shape) |
