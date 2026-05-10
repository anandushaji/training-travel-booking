# Proposal: Expense Service (SM-08)

## Intent

Automate receipt generation and expense tracking for corporate travel
bookings. When a booking is confirmed, the service creates a structured
receipt and an expense record. When a booking is cancelled, the receipt
is voided and the expense is cancelled. REST APIs let employees query
their own receipts and expense reports; managers and admins can query
by department or traveler.

## Scope

### In Scope

- Kafka consumer on `booking-events` topic
  - `BookingConfirmed` → create `Receipt` + `Expense`, publish `ReceiptGenerated` + `ExpenseRecorded`
  - `BookingCancelled` → void `Receipt` + cancel `Expense`, publish `ExpenseRecorded` (voided)
- `Receipt` aggregate — structured receipt record (no PDF in v1)
- `Expense` aggregate — expense entry linked to a receipt
- `ReceiptGenerated` and `ExpenseRecorded` events published to `expense-events` topic
- REST query APIs: `GET /receipts`, `GET /receipts/:id`, `GET /expenses`,
  `GET /expenses/summary`, `GET /expenses/export` (CSV), `GET /categories`
- Idempotency: `processed_events` table keyed on Kafka `eventId`
- `JwtAuthGuard` + role-based scoping (EMPLOYEE sees own; MANAGER/ADMIN sees department/all)
- Prometheus metrics, Winston structured logs, health/ready endpoints

### Out of Scope

- PDF receipt generation (`pdfkit`) and `GET /receipts/:id/download` — v2
- `POST /receipts/:id/regenerate` — v2
- Expense approval workflow (`REQUIRES_APPROVAL` → `APPROVED/REJECTED`) — v2
- `departmentId` grouping in expense reports (not present in `BookingConfirmed` event payload in v1)
- Redis caching (noted in PROJECT.md §12 for v2; receipts are immutable but volume does not justify cache in v1)
- Outbox relay (PROJECT.md §6 — not implemented project-wide)

## Approach

The expense service is a pure event-consumer + query service. It has
no synchronous dependencies on other services at runtime — all data
required for receipt generation is carried in the `BookingConfirmed`
event payload (`travelerId`, `travelerName`, `travelerEmail`,
`totalAmount`, `currency`, `origin`, `destination`, `departureDate`).

At-least-once Kafka delivery is made safe by an idempotency guard:
before processing any event, the service checks whether `eventId` exists
in `processed_events`; if so, it acks and returns without side effects.

Patterns applied: **Database-per-service**, **Saga Choreography**,
**Idempotency**.

## Microservice Patterns Applied

| Pattern | Justification |
|---|---|
| Database-per-service | Expense service owns `expense-db` (PostgreSQL); no other service accesses it directly |
| Saga (Choreography) | Reacts to `BookingConfirmed`/`BookingCancelled` events; no orchestrator required |
| Idempotency | Kafka at-least-once delivery; `processed_events` table guards against duplicate processing |

## Assumptions

- `BookingConfirmed` event data carries: `travelerId`, `travelerName`,
  `travelerEmail`, `totalAmount`, `currency`, `origin`, `destination`,
  `departureDate` (per booking-service T05 and Pact contract).
- `BookingCancelled` event data carries: `travelerId`, `reason`.
- Both events carry the standard ADR-003 envelope: `eventId`, `eventType`,
  `aggregateId` (bookingId), `occurredOn`, `correlationId`, `causationId`.
- Receipt numbers follow pattern `RCP-YYYY-NNNNNN` (year + zero-padded DB sequence).
- All travel bookings default to category `Flight` in v1.
- `departmentId` is NOT in the `BookingConfirmed` payload; department filtering
  on expense reports is deferred to v2.

## Open Questions

- (None — all decisions resolved from decomposition and PROJECT.md)
