# Spec: Payment Service (SM-06)

**Change ID**: payment-service  
**Domain**: `payment-service`  
**Type**: DELTA — ADDED requirements only (new microservice, no existing spec to modify)  
**Status**: DRAFT  
**Author**: spec-generator  
**Date**: 2026-05-02

---

## REQ-PAY-001: Payment Aggregate and State Machine

**Summary**: The `Payment` aggregate enforces a strict state machine (PENDING → AUTHORIZED → CAPTURED / FAILED / CANCELLED; CAPTURED → REFUNDED). Invalid state transitions must throw a `DomainException`.

### AC-001-1: Successful authorization transitions to AUTHORIZED

```
GIVEN a Payment in PENDING status
WHEN authorize() is called with a valid stripePaymentIntentId
THEN the Payment status becomes AUTHORIZED
  AND a PaymentAuthorized domain event is raised
  AND the stripePaymentIntentId is stored on the aggregate
```

**Verification artifact**: `src/domain/aggregates/payment.aggregate.spec.ts`  
Test case: `should transition to AUTHORIZED when authorize() is called on PENDING payment`  
Must fail if: `payment.status` is not `AUTHORIZED` after calling `authorize()`, or no `PaymentAuthorized` event is raised.

### AC-001-2: Invalid state transition throws DomainException

```
GIVEN a Payment in CAPTURED status
WHEN authorize() is called again
THEN a DomainException is thrown with code INVALID_STATE_TRANSITION
  AND the Payment status remains CAPTURED
```

**Verification artifact**: `src/domain/aggregates/payment.aggregate.spec.ts`  
Test case: `should throw DomainException when authorize() is called on CAPTURED payment`  
Must fail if: no exception is thrown, or `payment.status` changes from `CAPTURED`.

### AC-001-3: AUTHORIZED payment can be marked as FAILED

```
GIVEN a Payment in AUTHORIZED status
WHEN markFailed(reason) is called
THEN the Payment status becomes FAILED
  AND failureReason is set to the provided reason
  AND a PaymentFailed domain event is raised
```

**Verification artifact**: `src/domain/aggregates/payment.aggregate.spec.ts`  
Test case: `should transition to FAILED when markFailed() is called on AUTHORIZED payment`  
Must fail if: `payment.status` is not `FAILED` or `payment.failureReason` is null.

### AC-001-4: Money value object rejects non-positive amounts

```
GIVEN a Money value object creation request
WHEN amount is 0 or negative
THEN a DomainException is thrown with code INVALID_MONEY_AMOUNT
```

**Verification artifact**: `src/domain/value-objects/money.vo.spec.ts`  
Test case: `should throw DomainException when Money is created with zero or negative amount`  
Must fail if: `Money` constructor accepts `amount <= 0`.

---

## REQ-PAY-002: PaymentMethod Management

**Summary**: Travelers can attach Stripe-tokenized payment methods, list their own, and detach (soft-delete) them. Raw card data is never stored.

### AC-002-1: Attach payment method stores Stripe token reference

```
GIVEN an authenticated traveler with a valid JWT
WHEN POST /api/v1/payment-methods is called with { stripePaymentMethodId, cardBrand, last4, expiryMonth, expiryYear }
THEN a new PaymentMethod record is created with the travelerId from the JWT
  AND the response body contains paymentMethodId, cardBrand, last4, expiryMonth, expiryYear
  AND the response body does NOT contain stripePaymentMethodId
  AND HTTP 201 is returned
```

**Verification artifact**: `test/integration/payment-method.integration.spec.ts`  
Test case: `should attach payment method and return 201 without stripePaymentMethodId in response`  
Must fail if: response contains `stripePaymentMethodId`, or `HTTP 201` is not returned, or record is not persisted.

### AC-002-2: List payment methods returns only the authenticated traveler's methods

```
GIVEN two travelers A and B each with one payment method
WHEN traveler A calls GET /api/v1/payment-methods
THEN only traveler A's payment method is returned
  AND traveler B's payment method is NOT included
```

**Verification artifact**: `test/integration/payment-method.integration.spec.ts`  
Test case: `should return only the authenticated traveler's payment methods`  
Must fail if: another traveler's payment methods appear in the response.

### AC-002-3: Detach payment method deactivates the record

```
GIVEN an authenticated traveler who owns paymentMethodId X
WHEN DELETE /api/v1/payment-methods/:X is called
THEN HTTP 204 is returned
  AND payment_methods.is_active for record X is set to FALSE
  AND subsequent GET /payment-methods does NOT include record X
```

**Verification artifact**: `test/integration/payment-method.integration.spec.ts`  
Test case: `should soft-delete payment method and return 204`  
Must fail if: record is hard-deleted, or still appears in GET response, or HTTP status != 204.

### AC-002-4: Attach fails if stripePaymentMethodId is already attached

```
GIVEN a payment method with stripePaymentMethodId "pm_xxx" already exists for any traveler
WHEN POST /api/v1/payment-methods is called with the same stripePaymentMethodId
THEN HTTP 409 Conflict is returned
  AND no duplicate record is created
```

**Verification artifact**: `test/integration/payment-method.integration.spec.ts`  
Test case: `should return 409 when stripePaymentMethodId is already attached`  
Must fail if: HTTP 201 is returned or a duplicate record is created.

---

## REQ-PAY-003: Payment Authorization

**Summary**: `POST /payments` creates a Stripe PaymentIntent with `capture_method: manual`, stores the payment as AUTHORIZED, and publishes a `PaymentAuthorized` Kafka event.

### AC-003-1: Successful authorization returns AUTHORIZED payment

```
GIVEN an authenticated traveler with a valid payment method
WHEN POST /api/v1/payments is called with { paymentMethodId, amount, currency, bookingId, description }
  AND Idempotency-Key header is provided
  AND Stripe returns a PaymentIntent with status requires_capture
THEN HTTP 201 is returned
  AND response contains status: "AUTHORIZED", stripePaymentIntentId, paymentId
  AND a payment record is persisted in the database with status AUTHORIZED
  AND a PaymentAuthorized event is published to topic payment.authorized
```

**Verification artifact**: `test/integration/payment.integration.spec.ts`  
Test case: `should create AUTHORIZED payment and publish PaymentAuthorized event`  
Must fail if: `payment.status` is not `AUTHORIZED`, or Kafka event is not published, or HTTP != 201.

### AC-003-2: Missing Idempotency-Key header returns 400

```
GIVEN an authenticated traveler
WHEN POST /api/v1/payments is called without an Idempotency-Key header
THEN HTTP 400 is returned
  AND error message indicates Idempotency-Key is required
  AND no PaymentIntent is created in Stripe
```

**Verification artifact**: `src/presentation/controllers/payment.controller.spec.ts`  
Test case: `should return 400 when Idempotency-Key header is missing`  
Must fail if: HTTP 201 is returned without the header.

### AC-003-3: Stripe card-declined (402) returns 402 and publishes PaymentFailed

```
GIVEN an authenticated traveler with a card that will be declined
WHEN POST /api/v1/payments is called
  AND Stripe returns HTTP 402 (card_declined)
THEN HTTP 402 is returned to the client
  AND a Payment record is saved with status FAILED
  AND a PaymentFailed event is published to topic payment.failed
  AND the Stripe call is NOT retried
```

**Verification artifact**: `src/application/use-cases/authorize-payment/authorize-payment.use-case.spec.ts`  
Test case: `should return 402 and publish PaymentFailed when Stripe returns card_declined`  
Must fail if: the Stripe call is retried, or `payment.status` is not `FAILED`, or no `PaymentFailed` event is raised.

### AC-003-4: Stripe 429 (rate-limit) triggers retry and eventually succeeds

```
GIVEN an authenticated traveler
WHEN POST /api/v1/payments is called
  AND Stripe returns HTTP 429 on the first 2 attempts then 201 on the 3rd
THEN the use case retries up to 3 times
  AND HTTP 201 is eventually returned
  AND retry_count metric is incremented for each retry
```

**Verification artifact**: `src/infrastructure/stripe/stripe-client.service.spec.ts`  
Test case: `should retry on Stripe 429 and succeed on 3rd attempt`  
Must fail if: no retry occurs, or request fails after 429, or `retry_count` metric is not incremented.

---

## REQ-PAY-004: Payment Capture

**Summary**: `POST /payments/:paymentId/capture` captures an AUTHORIZED PaymentIntent via Stripe (full amount only in v1), transitions the aggregate to CAPTURED, and publishes a `PaymentCaptured` event. The caller must be the owner of the payment (`travelerId` from JWT).

### AC-004-1: Successful capture transitions to CAPTURED

```
GIVEN a Payment with status AUTHORIZED owned by the authenticated traveler
WHEN POST /api/v1/payments/:paymentId/capture is called by the payment owner
  AND Stripe successfully captures the PaymentIntent (full amount)
THEN HTTP 200 is returned
  AND response contains status: "CAPTURED", capturedAmount
  AND payment record status is updated to CAPTURED in the database
  AND a PaymentCaptured event is published to topic payment.captured
```

**Verification artifact**: `test/integration/payment.integration.spec.ts`  
Test case: `should capture AUTHORIZED payment and publish PaymentCaptured event`  
Must fail if: `payment.status` is not `CAPTURED`, or Kafka event is not published, or HTTP != 200.

### AC-004-2: Capture fails if payment is not AUTHORIZED

```
GIVEN a Payment with status CAPTURED (already captured)
WHEN POST /api/v1/payments/:paymentId/capture is called
THEN HTTP 409 Conflict is returned
  AND error code is INVALID_STATE_TRANSITION
  AND no Stripe API call is made
```

**Verification artifact**: `src/application/use-cases/capture-payment/capture-payment.use-case.spec.ts`  
Test case: `should return 409 when attempting to capture an already CAPTURED payment`  
Must fail if: HTTP 200 is returned, or a Stripe API call is made.

### AC-004-3: Capture fails if payment does not belong to the caller

```
GIVEN a Payment owned by traveler A
WHEN traveler B calls POST /api/v1/payments/:paymentId/capture
THEN HTTP 403 Forbidden is returned
  AND no Stripe API call is made
```

**Verification artifact**: `src/presentation/controllers/payment.controller.spec.ts`  
Test case: `should return 403 when traveler attempts to capture another traveler's payment`  
Must fail if: HTTP 200 is returned for an unauthorized caller.

### AC-004-4: Capture request body is ignored — full capture always applied

```
GIVEN a Payment with status AUTHORIZED
WHEN POST /api/v1/payments/:paymentId/capture is called with any request body (e.g. { "amountToCapture": 100 })
THEN the endpoint captures the full authorized amount regardless of any body content
  AND the amountToCapture field is silently ignored
  AND HTTP 200 is returned with the full capturedAmount
```

**Verification artifact**: `src/application/use-cases/capture-payment/capture-payment.use-case.spec.ts`  
Test case: `should always capture the full authorized amount regardless of any amountToCapture in command`  
Must fail if: a partial amount is passed to Stripe or `capturedAmount` differs from the authorized amount.

---

## REQ-PAY-005: Payment Refund

**Summary**: `POST /payments/:paymentId/refund` creates a Stripe refund for a CAPTURED payment, transitions the aggregate to REFUNDED, and publishes a `PaymentRefunded` event. The caller must be the owner of the payment (`travelerId` from JWT).

### AC-005-1: Successful refund transitions to REFUNDED

```
GIVEN a Payment with status CAPTURED owned by the authenticated traveler
WHEN POST /api/v1/payments/:paymentId/refund is called with { amount, reason }
  AND Stripe successfully creates the refund
THEN HTTP 200 is returned
  AND response contains status: "REFUNDED", refundedAmount
  AND payment record status is updated to REFUNDED in the database
  AND a PaymentRefunded event is published to topic payment.refunded
```

**Verification artifact**: `test/integration/payment.integration.spec.ts`  
Test case: `should refund CAPTURED payment and publish PaymentRefunded event`  
Must fail if: `payment.status` is not `REFUNDED`, or Kafka event is not published, or HTTP != 200.

### AC-005-2: Refund fails if payment is not CAPTURED

```
GIVEN a Payment with status AUTHORIZED (not yet captured)
WHEN POST /api/v1/payments/:paymentId/refund is called
THEN HTTP 409 Conflict is returned
  AND error code is INVALID_STATE_TRANSITION
  AND no Stripe API call is made
```

**Verification artifact**: `src/application/use-cases/refund-payment/refund-payment.use-case.spec.ts`  
Test case: `should return 409 when attempting to refund an AUTHORIZED (non-captured) payment`  
Must fail if: HTTP 200 is returned, or a Stripe refund API call is made.

### AC-005-3: Refund fails if payment does not belong to the caller

```
GIVEN a Payment owned by traveler A
WHEN traveler B calls POST /api/v1/payments/:paymentId/refund
THEN HTTP 403 Forbidden is returned
  AND no Stripe API call is made
```

**Verification artifact**: `src/presentation/controllers/payment.controller.spec.ts`  
Test case: `should return 403 when traveler attempts to refund another traveler's payment`  
Must fail if: HTTP 200 is returned for an unauthorized caller.

### AC-005-4: Refund reason must be one of the allowed values

```
GIVEN an authenticated traveler calling POST /api/v1/payments/:paymentId/refund
WHEN the request body contains reason: "not_an_allowed_value"
THEN HTTP 400 is returned
  AND the error message indicates that reason must be one of: duplicate, fraudulent, requested_by_customer
  AND no Stripe refund API call is made
```

**Verification artifact**: `src/presentation/controllers/payment.controller.spec.ts`  
Test case: `should return 400 when refund reason is not one of duplicate | fraudulent | requested_by_customer`  
Must fail if: the refund is processed with an invalid reason, or HTTP 200 is returned.

---

## REQ-PAY-006: Stripe Webhook Reconciliation

**Summary**: `POST /api/v1/webhooks/stripe` receives Stripe async events, verifies the Stripe-Signature HMAC, and reconciles payment status for failed and cancelled PaymentIntents. Deduplication is handled by checking `Payment.status` before applying transitions — no separate `stripe_webhook_events` table is used (OQ-1 resolved).

### AC-006-1: Valid webhook signature processes payment_intent.payment_failed

```
GIVEN a Payment in AUTHORIZED status with stripePaymentIntentId pi_xxx
WHEN POST /api/v1/webhooks/stripe is received
  AND event type is payment_intent.payment_failed
  AND Stripe-Signature header is valid
THEN HTTP 200 is returned to Stripe
  AND the Payment status is updated to FAILED
  AND failureReason is stored
  AND a PaymentFailed event is published to topic payment.failed
```

**Verification artifact**: `test/integration/payment.integration.spec.ts`  
Test case: `should process payment_intent.payment_failed webhook and publish PaymentFailed event`  
Must fail if: HTTP != 200, or `payment.status` is not `FAILED`, or no Kafka event is published.

### AC-006-2: Invalid webhook signature returns 400

```
GIVEN a webhook POST request to /api/v1/webhooks/stripe
WHEN the Stripe-Signature header is missing or has an invalid HMAC
THEN HTTP 400 is returned
  AND no payment state transition occurs
  AND a warning log entry is emitted with the correlationId
```

**Verification artifact**: `src/presentation/controllers/stripe-webhook.controller.spec.ts`  
Test case: `should return 400 when Stripe-Signature header is invalid or missing`  
Must fail if: HTTP 200 is returned with invalid signature, or any payment record is modified.

### AC-006-3: Duplicate webhook event is idempotently ignored (via status check)

```
GIVEN a Payment already in FAILED status (previously failed via webhook)
WHEN the same payment_intent.payment_failed webhook is delivered again by Stripe's retry
THEN HTTP 200 is returned to Stripe
  AND the Payment status remains FAILED (no double transition)
  AND no duplicate PaymentFailed event is published
  AND no stripe_webhook_events table lookup is required — idempotency is achieved by checking payments.status
```

**Verification artifact**: `src/presentation/controllers/stripe-webhook.controller.spec.ts`  
Test case: `should idempotently return 200 for duplicate payment_intent.payment_failed webhook`  
Must fail if: a second `PaymentFailed` Kafka event is published, or a domain exception is thrown.

### AC-006-4: Stripe retry of same event produces identical idempotent result

```
GIVEN a payment_intent.payment_failed webhook was processed successfully (Payment → FAILED)
WHEN Stripe retries the same event (identical payload and stripe_payment_intent_id)
  AND the handler looks up payment by stripe_payment_intent_id
  AND payment.status is already FAILED
THEN HTTP 200 is returned without calling Payment.markFailed() again
  AND no additional Kafka PaymentFailed event is published
  AND the payments table is not modified
```

**Verification artifact**: `src/presentation/controllers/stripe-webhook.controller.spec.ts`  
Test case: `should skip re-processing and return 200 when Stripe retries an already-FAILED event`  
Must fail if: `Payment.markFailed()` is called a second time, or the record's `updated_at` changes on retry.

### AC-006-5: Valid webhook processes payment_intent.canceled and transitions to CANCELLED with no Kafka event

```
GIVEN a Payment in AUTHORIZED status with stripePaymentIntentId pi_xxx
WHEN POST /api/v1/webhooks/stripe is received
  AND event type is payment_intent.canceled
  AND Stripe-Signature header is valid
THEN HTTP 200 is returned to Stripe
  AND the Payment status is updated to CANCELLED
  AND NO Kafka event is published (CANCELLED is a terminal state with no downstream saga step)
  AND the payment record's updated_at is refreshed in the database
```

**Verification artifact**: `src/presentation/controllers/stripe-webhook.controller.spec.ts`  
Test case: `should transition payment to CANCELLED on payment_intent.canceled webhook and NOT publish a Kafka event`  
Must fail if: any Kafka event is published for the CANCELLED transition, or `payment.status` is not `CANCELLED`, or HTTP != 200.

---

## REQ-PAY-007: Circuit Breaker on Stripe Calls

**Summary**: All Stripe SDK calls are wrapped in an opossum circuit breaker configured at 50% error rate / 10 requests / 30s window. When open, the fallback returns HTTP 503.

### AC-007-1: Circuit breaker opens after threshold and returns 503

```
GIVEN the circuit breaker is configured with errorThresholdPercentage=50, volumeThreshold=10
WHEN 6 out of 10 consecutive Stripe calls fail with HTTP 500
THEN the circuit breaker transitions to OPEN state
  AND subsequent calls return HTTP 503 immediately (without calling Stripe)
  AND circuit_state metric is set to 1 (open)
```

**Verification artifact**: `src/infrastructure/stripe/stripe-client.service.spec.ts`  
Test case: `should open circuit and return 503 fallback after error threshold is exceeded`  
Must fail if: Stripe API is still called after circuit opens, or HTTP 503 is not returned.

### AC-007-2: Circuit breaker recovers after reset timeout

```
GIVEN the circuit breaker is in OPEN state
WHEN 30 seconds elapse (resetTimeout)
THEN the circuit transitions to HALF-OPEN state
  AND the next Stripe call is attempted
  AND if it succeeds the circuit transitions to CLOSED
  AND circuit_state metric is set to 0 (closed)
```

**Verification artifact**: `src/infrastructure/stripe/stripe-client.service.spec.ts`  
Test case: `should recover to CLOSED state after successful call in HALF-OPEN state`  
Must fail if: circuit does not transition to HALF-OPEN after reset timeout, or does not close after successful call.

---

## REQ-PAY-008: Idempotency for Payment Authorization

**Summary**: `POST /payments` is idempotent by `Idempotency-Key` header. Duplicate requests with the same key return the existing payment record without creating a duplicate Stripe PaymentIntent.

### AC-008-1: Duplicate Idempotency-Key returns existing record with 200

```
GIVEN a Payment was successfully created with Idempotency-Key "uuid-abc"
WHEN POST /api/v1/payments is called again with the same Idempotency-Key "uuid-abc"
THEN HTTP 200 is returned (not 201)
  AND the response body is identical to the original response
  AND no new Stripe PaymentIntent is created
  AND no duplicate database record is created
```

**Verification artifact**: `test/integration/payment.integration.spec.ts`  
Test case: `should return 200 with existing payment on duplicate Idempotency-Key`  
Must fail if: HTTP 201 is returned on duplicate, or a new record is created, or Stripe is called twice.

### AC-008-2: Concurrent requests with same Idempotency-Key are serialized

```
GIVEN two simultaneous POST /payments requests with the same Idempotency-Key
WHEN both requests arrive concurrently before either commits to DB
THEN exactly one Payment record is created
  AND the second request receives HTTP 200 with the record created by the first
  AND no duplicate Stripe PaymentIntent is created
```

**Verification artifact**: `test/integration/payment.integration.spec.ts`  
Test case: `should handle concurrent duplicate Idempotency-Key requests correctly`  
Must fail if: two records are created, or two Stripe PaymentIntents are created.

---

## REQ-PAY-009: PCI-DSS Compliance

**Summary**: The payment service must never store raw card data (PAN, CVV, expiry in unmasked form) and must never log sensitive card fields. Only Stripe token references (`pm_xxx`) are persisted.

### AC-009-1: Raw card number is never stored in the database

```
GIVEN any request to POST /payment-methods with Stripe-tokenized card data
WHEN the payment method is persisted to PostgreSQL
THEN the payment_methods table contains only stripePaymentMethodId (pm_xxx), last4, cardBrand, expiryMonth, expiryYear
  AND no column in payment_methods or payments contains a full 16-digit card number
  AND no column contains a CVV or CVC value
```

**Verification artifact**: `test/integration/payment-method.integration.spec.ts`  
Test case: `should not persist any raw card number or CVV in payment_methods table`  
Must fail if: any column stores a full PAN or CVV value.

### AC-009-2: Sensitive card fields are never written to application logs

```
GIVEN any payment or payment method operation that produces log output
WHEN the operation is executed with a Stripe payment method containing card data
THEN no log entry contains cardNumber, cvv, cvc, full PAN, or STRIPE_SECRET_KEY value
  AND log sanitization middleware strips any accidental sensitive field before writing
```

**Verification artifact**: `src/infrastructure/logging/log-sanitizer.spec.ts`  
Test case: `should strip cardNumber, cvv, cvc, and secret key from log context objects`  
Must fail if: any of the forbidden fields appear in captured log output.

### AC-009-3: GET /payment-methods response never includes stripePaymentMethodId

```
GIVEN a traveler with an attached payment method
WHEN GET /api/v1/payment-methods is called
THEN the response body does NOT contain stripePaymentMethodId for any item
  AND the response contains only: paymentMethodId, cardBrand, last4, expiryMonth, expiryYear, createdAt
```

**Verification artifact**: `src/presentation/controllers/payment-method.controller.spec.ts`  
Test case: `should not include stripePaymentMethodId in GET /payment-methods response`  
Must fail if: `stripePaymentMethodId` appears in the response body.

---

## REQ-PAY-010: Kafka Event Publishing

**Summary**: After each successful state transition, the service publishes a domain event to the corresponding Kafka topic with the ADR-003 event schema.

### AC-010-1: PaymentAuthorized event is published after successful authorization

```
GIVEN a successful POST /payments authorization
WHEN the Payment is saved with status AUTHORIZED
THEN a PaymentAuthorized event is published to topic payment.authorized
  AND the event contains: eventId, eventType="PaymentAuthorized", aggregateId=paymentId, occurredOn, correlationId, causationId, data.bookingId, data.amount, data.currency
  AND kafka_events_published_total metric is incremented with label event_type=PaymentAuthorized
```

**Verification artifact**: `src/infrastructure/events/payment-event.publisher.spec.ts`  
Test case: `should publish PaymentAuthorized event with correct schema to payment.authorized topic`  
Must fail if: event is not published, schema is incomplete, or metric is not incremented.

### AC-010-2: Kafka publish failure does not corrupt payment state

```
GIVEN a Payment that was saved as AUTHORIZED
WHEN the Kafka publish call throws an error
THEN the payment record remains in AUTHORIZED status (not rolled back)
  AND the error is logged with correlationId
  AND HTTP 201 is still returned (at-least-once delivery: Kafka failure is non-fatal for the API response)
  AND a stripe_api_errors metric is NOT incremented (this is a Kafka error, not Stripe)
```

**Verification artifact**: `src/application/use-cases/authorize-payment/authorize-payment.use-case.spec.ts`  
Test case: `should persist payment and return 201 even when Kafka publish fails`  
Must fail if: payment is rolled back on Kafka failure, or HTTP 500 is returned due to Kafka error.

---

## REQ-PAY-011: Observability

**Summary**: The service must emit all required Prometheus metrics, OTel traces, and structured Winston logs for payment lifecycle events and Stripe integration.

### AC-011-1: Payment lifecycle metrics are emitted

```
GIVEN a complete payment lifecycle (authorize → capture → refund)
WHEN each operation is successfully executed
THEN payments_created_total is incremented on authorization
  AND payments_captured_total is incremented on capture
  AND payments_refunded_total is incremented on refund
  AND each metric includes the currency label
```

**Verification artifact**: `src/presentation/controllers/payment.controller.spec.ts`  
Test case: `should increment payments_created_total, payments_captured_total, payments_refunded_total metrics`  
Must fail if: any lifecycle metric is not incremented after its corresponding operation.

### AC-011-2: Stripe API call metrics are emitted

```
GIVEN a Stripe SDK call (createPaymentIntent, capture, or refund)
WHEN the call succeeds
THEN stripe_api_calls_total is incremented with labels operation and outcome=success
WHEN the call fails
THEN stripe_api_errors_total is incremented with labels operation and error_type
```

**Verification artifact**: `src/infrastructure/stripe/stripe-client.service.spec.ts`  
Test case: `should increment stripe_api_calls_total on success and stripe_api_errors_total on error`  
Must fail if: metrics are not incremented, or labels are missing.

### AC-011-3: X-Correlation-ID is propagated in all log entries

```
GIVEN an HTTP request with X-Correlation-ID header "trace-abc-123"
WHEN any log entry is emitted during that request's processing
THEN the log entry contains correlationId: "trace-abc-123"
  AND all child spans (Stripe call, DB query, Kafka publish) inherit the same correlationId
```

**Verification artifact**: `src/presentation/controllers/payment.controller.spec.ts`  
Test case: `should propagate X-Correlation-ID to all log entries within a request scope`  
Must fail if: any log entry during the request is missing `correlationId`.

---

## REQ-PAY-012: Performance and Availability SLA

**Summary**: The payment service SHALL meet documented performance and availability targets to ensure reliable payment processing within the corporate travel platform.

### AC-012-1: POST /payments p95 response time is within SLA under normal load

```
GIVEN the payment service is processing requests at normal load (≤ 100 concurrent requests)
WHEN POST /api/v1/payments is called (Stripe mock responding within 500ms)
THEN the p95 response time SHALL be ≤ 2 000 ms
  AND the p99 response time SHALL be ≤ 5 000 ms
  AND stripe_api_call_duration_seconds histogram metric records the latency
```

**Verification artifact**: `src/infrastructure/stripe/stripe-client.service.spec.ts`  
Test case: `should complete payment authorization within 2000ms p95 under mocked Stripe latency`  
Must fail if: the histogram metric is not emitted, or known slow paths (retry storms) are not rate-limited.

### AC-012-2: Service maintains 99.9% monthly availability via circuit breaker fallback

```
GIVEN the Stripe API is intermittently unavailable (circuit breaker trips)
WHEN a request arrives while the circuit is OPEN
THEN the service SHALL return HTTP 503 within 100ms (without waiting for Stripe timeout)
  AND circuit_state metric is set to 1 (open)
  AND the circuit breaker reset timer allows recovery within 30 seconds
```

**Verification artifact**: `src/infrastructure/stripe/stripe-client.service.spec.ts`  
Test case: `should return 503 within 100ms when circuit is open (no Stripe timeout wait)`  
Must fail if: the service blocks for the full Stripe timeout when the circuit is open.

---

## REQ-PAY-013: Get Payment by ID

**Summary**: `GET /payments/:paymentId` returns the current state of a payment for the authenticated traveler who owns it. This endpoint enables the Booking Service and frontend to poll payment status.

### AC-013-1: Authenticated owner retrieves payment by ID

```
GIVEN a Payment with paymentId "pay-uuid-1" owned by the authenticated traveler
WHEN GET /api/v1/payments/pay-uuid-1 is called
THEN HTTP 200 is returned
  AND the response body contains paymentId, status, amount, currency, bookingId, createdAt
  AND the response body does NOT contain stripePaymentIntentId or stripePaymentMethodId
```

**Verification artifact**: `src/presentation/controllers/payment.controller.spec.ts`  
Test case: `should return payment details without Stripe token fields for the authenticated owner`  
Must fail if: Stripe token fields are exposed in the response, or HTTP != 200.

### AC-013-2: Non-owner cannot retrieve another traveler's payment

```
GIVEN a Payment owned by traveler A
WHEN traveler B calls GET /api/v1/payments/:paymentId
THEN HTTP 403 Forbidden is returned
  AND no payment data is included in the response body
```

**Verification artifact**: `src/presentation/controllers/payment.controller.spec.ts`  
Test case: `should return 403 when a traveler attempts to retrieve another traveler's payment`  
Must fail if: payment data is returned to an unauthorized caller.

### AC-013-3: Non-existent payment returns 404

```
GIVEN no payment exists with the requested paymentId
WHEN GET /api/v1/payments/:paymentId is called by any authenticated traveler
THEN HTTP 404 is returned
  AND the error body contains error code NOT_FOUND
```

**Verification artifact**: `src/application/use-cases/get-payment/get-payment.use-case.spec.ts`  
Test case: `should throw NotFoundException when payment does not exist`  
Must fail if: HTTP 200 is returned for a non-existent paymentId.
