# Delta for booking-service — Booking Service (SM-07)

## ADDED Requirements

---

### Requirement: Create Booking (Saga Orchestration)

The system SHALL allow an authenticated user to create a booking by submitting
a flight offer and itinerary. The service SHALL orchestrate a four-step saga
(policy validation → reservation → payment authorization → confirmation).
On any step failure the service SHALL execute compensating transactions in
reverse order and return a structured error.

#### Scenario: Create booking — saga succeeds

- GIVEN an authenticated user with `travelerId=T`
- AND a valid `flightOfferId` and `itinerary`
- WHEN `POST /bookings` is called
- THEN a `bookings` row is persisted with `status=CONFIRMED`
- AND a `booking_sagas` row is persisted with `status=COMPLETED`
- AND four `booking_saga_steps` rows are persisted, each `status=COMPLETED`
- AND `BookingConfirmed` is published to Kafka topic `booking-events`
- AND a `booking_read_model` row is upserted
- AND the response is HTTP 201 with the booking including `id`, `status=CONFIRMED`

#### Scenario: Create booking — policy validation fails

- GIVEN the Policy Service returns a violation for the request
- WHEN `POST /bookings` is called
- THEN the booking is persisted with `status=FAILED`
- AND the saga is persisted with `status=COMPENSATED`
- AND no reservation or payment is created
- AND the response is HTTP 422 with `error: "POLICY_VIOLATION"`

#### Scenario: Create booking — reservation fails after policy passes

- GIVEN the Policy Service approves and the Inventory Service returns an error
- WHEN `POST /bookings` is called
- THEN the booking is persisted with `status=FAILED`
- AND no compensation is needed for policy (read-only step)
- AND the response is HTTP 422 with `error: "RESERVATION_FAILED"`

#### Scenario: Create booking — payment fails after reservation succeeds

- GIVEN policy passes, reservation is created, and the Payment Service returns an error
- WHEN `POST /bookings` is called
- THEN the reservation is cancelled via `DELETE /inventory/reservations/:id`
- AND the booking is persisted with `status=FAILED`
- AND the response is HTTP 422 with `error: "PAYMENT_FAILED"`

#### Scenario: Create booking — downstream circuit breaker OPEN

- GIVEN any downstream CB is OPEN when `POST /bookings` is called
- THEN the service does not call the open service
- AND executes compensating transactions for already-completed steps
- AND returns HTTP 503 with `error: "SERVICE_UNAVAILABLE"`

#### Scenario: Create booking — invalid input (missing required field)

- GIVEN an authenticated user
- WHEN `POST /bookings` is called with a request body that omits the required `travelerId` field
- THEN the response is HTTP 400
- AND the response body contains `error: "ValidationError"` and a `details` array identifying the missing field

#### Scenario: Circuit breaker opens after sustained failures

- GIVEN the Policy Service returns HTTP 503 on 10 consecutive requests within the CB window
- WHEN the 11th `POST /bookings` request is received
- THEN the CB transitions to OPEN state
- AND the Policy Service is not called for the 11th request
- AND the response is HTTP 503 with `error: "SERVICE_UNAVAILABLE"`
- AND `downstream_cb_state{service="policy", state="open"}` gauge is set to 1

#### Scenario: Circuit breaker recovers after reset window

- GIVEN the Policy Service CB is OPEN
- AND 30 seconds have elapsed since the CB opened
- WHEN a new `POST /bookings` request arrives (CB probe)
- AND the Policy Service returns HTTP 200 for the probe
- THEN the CB transitions to CLOSED
- AND normal booking flow resumes for subsequent requests
- AND `downstream_cb_state{service="policy", state="closed"}` gauge is set to 0

---

### Requirement: Get Booking

The system SHALL allow authenticated users to retrieve a booking by ID from
the read model.

#### Scenario: Get booking — found

- GIVEN a booking with `id=X` exists in `booking_read_model`
- WHEN `GET /bookings/X` is called
- THEN the response is HTTP 200 with the booking details

#### Scenario: Get booking — not found

- GIVEN no booking with `id=X` exists
- WHEN `GET /bookings/X` is called
- THEN the response is HTTP 404 with `error: "NOT_FOUND"`

---

### Requirement: List Bookings

The system SHALL allow authenticated users to list bookings from the read model
with optional `status` filter and pagination.

#### Scenario: List bookings — success

- GIVEN one or more bookings exist
- WHEN `GET /bookings?page=1&limit=20` is called
- THEN the response is HTTP 200 with `{ bookings: [...], pagination: { ... } }`

#### Scenario: List bookings — status filter

- GIVEN bookings exist with various statuses
- WHEN `GET /bookings?status=CONFIRMED` is called
- THEN only bookings with `status=CONFIRMED` are returned

---

### Requirement: Cancel Booking

The system SHALL allow authenticated users to cancel a booking. Cancellation
SHALL trigger compensating transactions: refund the payment and cancel the
reservation.

#### Scenario: Cancel booking — success

- GIVEN a booking with `id=X` in status `CONFIRMED`
- WHEN `POST /bookings/X/cancel` is called with `{ "reason": "Change of plans" }`
- THEN the reservation is cancelled via Inventory Service
- AND the payment is refunded via Payment Service
- AND the booking `status` is updated to `CANCELLED`
- AND `BookingCancelled` is published to Kafka topic `booking-events`
- AND the response is HTTP 200 with the updated booking

#### Scenario: Cancel booking — already cancelled

- GIVEN a booking with `id=X` in status `CANCELLED`
- WHEN `POST /bookings/X/cancel` is called
- THEN the response is HTTP 409 with `error: "BOOKING_ALREADY_CANCELLED"`

#### Scenario: Cancel booking — booking not found

- GIVEN no booking with `id=X` exists
- WHEN `POST /bookings/X/cancel` is called
- THEN the response is HTTP 404 with `error: "NOT_FOUND"`

#### Scenario: Cancel booking — concurrent requests (optimistic lock)

- GIVEN a booking with `id=X` in status `CONFIRMED`
- WHEN two `POST /bookings/X/cancel` requests are received simultaneously
- THEN exactly one succeeds with HTTP 200 and status `CANCELLED`
- AND the other receives HTTP 409 with `error: "CONFLICT"` due to optimistic lock version mismatch

---

### Requirement: Saga Durability

The saga SHALL be durable across service restarts. Any saga step that is
`IN_PROGRESS` when the service restarts SHALL be detectable and compensatable
on recovery.

#### Scenario: Service restart mid-saga — saga schema supports detection

- GIVEN a `booking_sagas` row exists with `status=IN_PROGRESS`
- AND a `booking_saga_steps` row exists with `status=IN_PROGRESS`
- AND the booking service is restarted
- WHEN `GET /bookings/:id` is called for that booking after restart
- THEN the booking is returned with its current `status` (as persisted before restart)
- AND the `booking_sagas` row is readable with `status=IN_PROGRESS`
- AND the stale saga is detectable by the `started_at` timestamp on the saga step
  (full saga recovery is future scope; the schema supports it without migration)

---

### Requirement: Update Booking (Special Requests)

The system SHALL allow an authenticated user to update the `specialRequests`
text field on a booking.

#### Scenario: Update special requests — success

- GIVEN a booking with `id=X` exists
- WHEN `PATCH /bookings/X` is called with `{ "specialRequests": "Window seat" }`
- THEN the `bookings.special_requests` column is updated
- AND the response is HTTP 200 with the updated booking

---

### Requirement: Read Model Projection

The service SHALL maintain a `booking_read_model` table projected from domain
events. The read model SHALL be updated by the `BookingReadModelUpdater`
event handler.

#### Scenario: Projection on BookingConfirmed

- GIVEN a `BookingConfirmed` domain event is emitted
- THEN a row is upserted in `booking_read_model` with denormalized
  `travelerName`, `travelerEmail`, and all booking fields

#### Scenario: Projection on BookingCancelled

- GIVEN a `BookingCancelled` domain event is emitted
- THEN the `booking_read_model` row for that booking is updated with
  `status=CANCELLED`

---

### Requirement: Kafka Consumer Idempotency

The Kafka consumer processing `PaymentCaptured` and `PaymentFailed` events
SHALL be idempotent — processing the same event twice SHALL have no effect
beyond the first processing.

#### Scenario: Duplicate PaymentCaptured event

- GIVEN a booking with `id=X` is already in `status=CONFIRMED`
- WHEN `PaymentCaptured` for booking `X` is received again
- THEN the event is acknowledged with no state mutation
- AND no duplicate `BookingConfirmed` event is published

---

### Requirement: Health and Readiness

#### Scenario: Health check

- GIVEN the service is running
- WHEN `GET /health` is called (no authentication)
- THEN the response is HTTP 200 with `{ "status": "healthy", "timestamp": "..." }`

#### Scenario: Readiness check — ready

- GIVEN the PostgreSQL database is reachable
- WHEN `GET /ready` is called
- THEN the response is HTTP 200 with `{ "status": "ready", "database": "connected" }`

#### Scenario: Readiness check — not ready

- GIVEN the PostgreSQL database is unreachable
- WHEN `GET /ready` is called
- THEN the response is HTTP 503

---

### Requirement: Observability

The service SHALL emit Prometheus metrics, OpenTelemetry traces, and
structured Winston logs per ADR-007.

#### Scenario: Metrics on booking creation

- GIVEN a booking is created successfully
- THEN `bookings_created_total` is incremented by 1
- AND `bookings_confirmed_total` is incremented by 1 on confirmation
- AND `booking_saga_duration_seconds` records the saga execution time

#### Scenario: Circuit breaker state metric

- GIVEN the Policy Service circuit breaker transitions to OPEN
- THEN `downstream_cb_state{service="policy", state="open"}` gauge is set to 1
