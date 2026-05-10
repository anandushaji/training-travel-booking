# Delta for expense-service — Expense Service (SM-08)

## ADDED Requirements

---

### Requirement: Automated Receipt Generation on Booking Confirmation

The system SHALL automatically create a structured receipt and expense record
when a `BookingConfirmed` event is consumed from the `booking-events` Kafka
topic.

#### Scenario: BookingConfirmed triggers receipt and expense creation

- GIVEN a `BookingConfirmed` event with a new `eventId` on `booking-events`
- WHEN the expense service consumes the event
- THEN a `receipts` row is inserted with `status=ACTIVE` and all booking fields
- AND an `expenses` row is inserted with `status=ACTIVE`, linked to the receipt
- AND a `processed_events` row is inserted for `eventId`
- AND `ReceiptGenerated` is published to `expense-events`
- AND `ExpenseRecorded` is published to `expense-events` with `status=ACTIVE`
- AND the Kafka offset is committed

#### Scenario: Receipt query returns created receipt

- GIVEN a receipt has been created for `travelerId=T`
- WHEN `GET /receipts` is called with a JWT for traveler T (EMPLOYEE role)
- THEN the response is HTTP 200 with the receipt in the `receipts` array

#### Scenario: Get receipt by ID

- GIVEN a receipt exists with `id=R`
- WHEN `GET /receipts/R` is called with a valid JWT
- THEN the response is HTTP 200 with the receipt details
- AND `id`, `receiptNumber`, `bookingId`, `amount`, `currency`, `status` are present

#### Scenario: Receipt not found returns 404

- GIVEN no receipt exists with `id=X`
- WHEN `GET /receipts/X` is called
- THEN the response is HTTP 404 with `error=RECEIPT_NOT_FOUND`

---

### Requirement: Receipt Voiding on Booking Cancellation

The system SHALL void the associated receipt and cancel the expense record
when a `BookingCancelled` event is consumed.

#### Scenario: BookingCancelled voids receipt

- GIVEN an `ACTIVE` receipt exists for `bookingId=B`
- AND a `BookingCancelled` event arrives for `aggregateId=B`
- WHEN the expense service processes the event
- THEN `receipts.status` is updated to `VOIDED` and `voided_at` is set
- AND `expenses.status` is updated to `CANCELLED`
- AND `processed_events` row is inserted for `eventId`
- AND `ExpenseRecorded` with `status=CANCELLED` is published to `expense-events`

#### Scenario: BookingCancelled with no associated receipt is a no-op

- GIVEN no receipt exists for `bookingId=B`
- AND a `BookingCancelled` event arrives for `aggregateId=B`
- WHEN the expense service processes the event
- THEN no DB writes are made (except `processed_events` insert)
- AND no events are published

---

### Requirement: Expense Report Queries

The system SHALL provide REST endpoints that allow authenticated users
to query expense data filtered by date range.

#### Scenario: Employee queries own expenses

- GIVEN receipts exist for `travelerId=T`
- WHEN `GET /expenses?startDate=2026-01-01&endDate=2026-12-31` is called
  with an EMPLOYEE JWT for traveler T
- THEN the response is HTTP 200
- AND `expenses` array contains only records for traveler T
- AND `summary.totalAmount` equals the sum of all matching expense amounts

#### Scenario: GET /expenses missing required date params returns 400

- GIVEN an authenticated request to `GET /expenses` without `startDate`
- WHEN the request is processed
- THEN the response is HTTP 400 with `error=VALIDATION_ERROR`

#### Scenario: GET /expenses/summary returns aggregated data

- GIVEN expenses exist for fiscal year 2026
- WHEN `GET /expenses/summary?fiscalYear=2026` is called
- THEN the response is HTTP 200
- AND the response body contains `totalExpenses`, `totalCount`
- AND `summary.byMonth` is an array of `{ month, amount, count }` entries
- AND `summary.byCategory` is an object keyed by category name with amounts

#### Scenario: GET /expenses/export returns CSV

- GIVEN expenses exist for the requested period
- WHEN `GET /expenses/export?startDate=2026-01-01&endDate=2026-12-31` is called
- THEN the response is HTTP 200 with `Content-Type: text/csv`
- AND the body contains a header row and one data row per expense

---

### Requirement: Idempotent Event Processing   [Idempotency]

The system SHALL process a Kafka event with a given `eventId` exactly
once, regardless of redelivery.

#### Scenario: Duplicate BookingConfirmed is a no-op

- GIVEN a `BookingConfirmed` event with `eventId=E` has already been processed
  (receipt and expense created, `processed_events` row exists)
- WHEN the same event is consumed again
- THEN no new `receipts` or `expenses` rows are inserted
- AND no new events are published
- AND the Kafka offset is committed (message is acknowledged)

#### Scenario: Duplicate BookingCancelled is a no-op

- GIVEN a `BookingCancelled` event with `eventId=E` has already been processed
- WHEN the same event is consumed again
- THEN no DB writes occur
- AND the Kafka offset is committed

---

### Requirement: Kafka Choreography — Expense Event Publishing

The system SHALL publish `ReceiptGenerated` and `ExpenseRecorded` events
to the `expense-events` Kafka topic after successful DB commit.

#### Scenario: ReceiptGenerated conforms to ADR-003 envelope

- GIVEN a receipt is created for `bookingId=B`
- WHEN `ReceiptGenerated` is published
- THEN the message body contains `eventId`, `eventType=ReceiptGenerated`,
  `aggregateId` (receiptId), `occurredOn`, `correlationId`, `causationId`,
  `version=1.0`, and `data.bookingId`, `data.travelerId`, `data.amount`

#### Scenario: Kafka publish error is logged and does not fail the consumer

- GIVEN the Kafka broker is temporarily unavailable during publish
- WHEN the expense service tries to publish after DB commit
- THEN the error is logged at ERROR level with `correlationId`
- AND the Kafka consumer offset IS committed (receipt/expense were persisted)

#### Scenario: Transient DB error during BookingConfirmed processing — offset not committed

- GIVEN a `BookingConfirmed` event arrives
- AND the database throws a transient error on the receipt insert
- WHEN the consumer processes the message
- THEN the consumer does NOT commit the Kafka offset
- AND no partial receipt or expense row is persisted (transaction rolled back)
- AND an ERROR log is emitted with `bookingId` and `correlationId`

---

### Requirement: Role-Based Data Access

The system SHALL enforce that EMPLOYEE users can only access their own
receipts and expenses, while MANAGER and ADMIN users may access all records.

#### Scenario: EMPLOYEE cannot see another traveler's receipts

- GIVEN a JWT with `sub=T1` and `role=EMPLOYEE`
- WHEN `GET /receipts` is called
- THEN the response contains only receipts where `travelerId=T1`

#### Scenario: EMPLOYEE cannot access another traveler's receipt by ID

- GIVEN Employee A has JWT with `sub=T1` and `role=EMPLOYEE`
- AND receipt `R2` belongs to traveler `T2`
- WHEN `GET /receipts/R2` is called with Employee A's JWT
- THEN the response is HTTP 403 with `error=FORBIDDEN`
- AND no receipt data is included in the response body

#### Scenario: MANAGER can query any traveler's expenses

- GIVEN a JWT with `role=MANAGER`
- WHEN `GET /expenses?travelerId=T2&startDate=2026-01-01&endDate=2026-12-31`
  is called
- THEN the response contains expenses for traveler T2

---

### Requirement: Service Health and Readiness

The system SHALL expose `/health` and `/ready` endpoints that do not
require authentication.

#### Scenario: GET /health returns 200

- GIVEN the service is running
- WHEN `GET /health` is called without a JWT
- THEN the response is HTTP 200 with `{ status: "healthy" }`

#### Scenario: GET /ready returns 503 when DB is unavailable

- GIVEN the database connection is down
- WHEN `GET /ready` is called
- THEN the response is HTTP 503
