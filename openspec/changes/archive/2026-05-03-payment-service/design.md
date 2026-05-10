# Design: Payment Service (SM-06)

**Change ID**: payment-service  
**Domain**: `payment-service`  
**Status**: DRAFT  
**Author**: spec-generator  
**Date**: 2026-05-02

---

## 1. Pattern Selection Log

> This section is mandatory first per OpenSpec conventions.

| Pattern | Decision | Rationale |
|---|---|---|
| Database-per-service | **Applied** | Payment service owns its own PostgreSQL schema (`payments`, `payment_methods`); no other service reads these tables directly (ADR-001, ADR-004) |
| CQRS | Not applicable | Read model is simple lookups on payment status; no separate read store is justified |
| Saga (Choreography) | Not applicable | Payment is one step in a booking saga orchestrated by Booking Service (SM-05); this service reacts to commands, it does not coordinate a saga |
| Saga (Orchestration) | Not applicable | Same as above |
| Outbox | Not applicable | Outbox relay not implemented per PROJECT.md §6; direct Kafka publish after DB commit with at-least-once semantics |
| Idempotency | **Applied** | `POST /payments` idempotent by `Idempotency-Key` header; key stored in `payments.idempotency_key` PostgreSQL `UNIQUE` constraint; forwarded to Stripe for upstream deduplication |
| Timeouts | **Applied** | All Stripe SDK calls configured with 2s connect timeout and 15s read timeout (payment-service override, PROJECT.md §12) |
| Retries | **Applied** | Stripe calls retry 3× with exponential backoff (base 200ms, max 5s, jitter) on 429 and 5xx; card-declined (402) is non-retryable |
| Circuit Breaker | **Applied** | Stripe SDK calls wrapped in opossum circuit breaker; 50% error threshold / 10 req / 30s window; 30s half-open recovery; fallback returns HTTP 503 |
| Bulkheads | Not applicable | Single external system (Stripe); circuit breaker isolation is sufficient |
| Cache-aside | Not applicable | PCI-DSS prohibits caching payment entities; Redis NOT used for payment or payment method data |
| Read-through | Not applicable | Same |
| Write-through | Not applicable | Same |
| Cache Invalidation | Not applicable | No payment data cached |

**Applied patterns**: Database-per-service, Idempotency, Timeouts, Retries, Circuit Breaker (Stripe)

---

## 2. Architecture Overview

```
                    ┌─────────────────────────────────────────────────┐
                    │              payment-service (port 3004)          │
                    │                                                   │
   API Gateway ────►│  Presentation Layer                               │
   (JWT + RBAC)     │    PaymentController      (6 REST endpoints)      │
                    │    PaymentMethodController                        │
                    │    StripeWebhookController                        │
                    │              │                                    │
                    │  Application Layer                                │
                    │    AuthorizePaymentUseCase                        │
                    │    CapturePaymentUseCase                          │
                    │    RefundPaymentUseCase                           │
                    │    AttachPaymentMethodUseCase                     │
                    │    DetachPaymentMethodUseCase                     │
                    │    ListPaymentMethodsUseCase                      │
                    │              │                                    │
                    │  Domain Layer                                     │
                    │    Payment aggregate (state machine)              │
                    │    PaymentMethod aggregate                        │
                    │    Domain events (Authorized/Captured/...)        │
                    │              │                                    │
                    │  Infrastructure Layer                             │
                    │    PaymentRepository      ──────────────────────►│  PostgreSQL 15
                    │    PaymentMethodRepository ─────────────────────►│  (payments, payment_methods)
                    │    StripeClientService    ──────────────────────►│  Stripe API
                    │    PaymentEventPublisher  ──────────────────────►│  Kafka
                    └─────────────────────────────────────────────────┘

Legend:
  Redis: NOT used for payment data (PCI-DSS). May be used for rate-limit counters only.
  Kafka topics: payment.authorized | payment.captured | payment.refunded | payment.failed
```

### Layer Responsibilities

| Layer | Responsibility |
|---|---|
| **Domain** | Pure business logic: `Payment` and `PaymentMethod` aggregates, value objects (`PaymentId`, `Money`, `PaymentStatus`, `PaymentMethodId`, `StripePaymentMethodId`, `CardBrand`, `Last4`), domain events, state machine transitions |
| **Application** | Orchestrates use cases; invokes domain, repository, Stripe client, event publisher; DTO mapping; idempotency check |
| **Infrastructure** | TypeORM entities, repository implementations, `StripeClientService` (SDK + circuit breaker + retry), `PaymentEventPublisher` (KafkaJS), database migrations |
| **Presentation** | NestJS controllers, request/response DTOs, JWT guard, RBAC guard, global exception filter, Stripe webhook signature verification |

---

## 3. Folder Structure

```
payment-service/
├── src/
│   ├── domain/
│   │   ├── aggregates/
│   │   │   ├── payment.aggregate.ts
│   │   │   └── payment-method.aggregate.ts
│   │   ├── value-objects/
│   │   │   ├── payment-id.vo.ts
│   │   │   ├── payment-method-id.vo.ts
│   │   │   ├── money.vo.ts              # re-exported from @travel/shared
│   │   │   ├── payment-status.enum.ts
│   │   │   ├── stripe-payment-method-id.vo.ts
│   │   │   ├── card-brand.vo.ts
│   │   │   └── last4.vo.ts
│   │   ├── events/
│   │   │   ├── payment-authorized.event.ts
│   │   │   ├── payment-captured.event.ts
│   │   │   ├── payment-refunded.event.ts
│   │   │   └── payment-failed.event.ts
│   │   └── repositories/
│   │       ├── payment.repository.interface.ts
│   │       └── payment-method.repository.interface.ts
│   │
│   ├── application/
│   │   ├── use-cases/
│   │   │   ├── authorize-payment/
│   │   │   │   ├── authorize-payment.use-case.ts
│   │   │   │   ├── authorize-payment.command.ts
│   │   │   │   └── authorize-payment.use-case.spec.ts
│   │   │   ├── capture-payment/
│   │   │   │   ├── capture-payment.use-case.ts
│   │   │   │   ├── capture-payment.command.ts
│   │   │   │   └── capture-payment.use-case.spec.ts
│   │   │   ├── refund-payment/
│   │   │   │   ├── refund-payment.use-case.ts
│   │   │   │   ├── refund-payment.command.ts
│   │   │   │   └── refund-payment.use-case.spec.ts
│   │   │   ├── attach-payment-method/
│   │   │   │   ├── attach-payment-method.use-case.ts
│   │   │   │   ├── attach-payment-method.command.ts
│   │   │   │   └── attach-payment-method.use-case.spec.ts
│   │   │   ├── detach-payment-method/
│   │   │   │   ├── detach-payment-method.use-case.ts
│   │   │   │   └── detach-payment-method.use-case.spec.ts
│   │   │   └── list-payment-methods/
│   │   │       ├── list-payment-methods.use-case.ts
│   │   │       └── list-payment-methods.use-case.spec.ts
│   │   └── dto/
│   │       ├── authorize-payment.request.dto.ts
│   │       ├── capture-payment.request.dto.ts
│   │       ├── refund-payment.request.dto.ts
│   │       ├── attach-payment-method.request.dto.ts
│   │       ├── payment.response.dto.ts
│   │       └── payment-method.response.dto.ts
│   │
│   ├── infrastructure/
│   │   ├── persistence/
│   │   │   ├── entities/
│   │   │   │   ├── payment.typeorm-entity.ts
│   │   │   │   └── payment-method.typeorm-entity.ts
│   │   │   ├── repositories/
│   │   │   │   ├── payment.repository.ts
│   │   │   │   └── payment-method.repository.ts
│   │   │   └── migrations/
│   │   │       ├── 1714600000000-CreatePaymentsTable.ts
│   │   │       └── 1714600000001-CreatePaymentMethodsTable.ts
│   │   ├── stripe/
│   │   │   └── stripe-client.service.ts
│   │   └── events/
│   │       └── payment-event.publisher.ts
│   │
│   ├── presentation/
│   │   ├── controllers/
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment-method.controller.ts
│   │   │   └── stripe-webhook.controller.ts
│   │   ├── dto/
│   │   │   ├── create-payment.dto.ts
│   │   │   ├── capture-payment.dto.ts
│   │   │   ├── refund-payment.dto.ts
│   │   │   └── attach-payment-method.dto.ts
│   │   └── guards/
│   │       ├── jwt-auth.guard.ts
│   │       └── roles.guard.ts
│   │
│   ├── app.module.ts
│   └── main.ts
├── test/
│   └── integration/
│       ├── payment.integration.spec.ts
│       └── payment-method.integration.spec.ts
├── Dockerfile
└── package.json
```

---

## 4. Domain Model

### 4.1 `Payment` Aggregate

```typescript
class Payment extends AggregateRoot {
  paymentId: PaymentId              // TypedId wrapper
  travelerId: string                // FK to traveler (JWT sub)
  bookingId: string                 // FK to booking
  paymentMethodId: PaymentMethodId  // FK to payment_methods
  amount: Money                     // { amount: Decimal, currency: ISO 4217 }
  status: PaymentStatus
  stripePaymentIntentId: string     // e.g. pi_xxx
  idempotencyKey: string            // from Idempotency-Key header (UNIQUE)
  description: string
  failureReason?: string
  capturedAmount?: Money
  refundedAmount?: Money
  createdAt: Date
  updatedAt: Date
}
```

**State Machine**:

```
         authorize()
PENDING ──────────────► AUTHORIZED
                            │
              capture()     │     paymentFailed (webhook)
                  ▼         │ ──────────────────────────► FAILED
              CAPTURED       │
                  │         │ paymentCanceled (webhook)
      refund()   │          └────────────────────────────► CANCELLED
          ▼      │
       REFUNDED  │ (terminal)

FAILED      → terminal
CANCELLED   → terminal
REFUNDED    → terminal
```

**State transition rules** (enforced in aggregate):
- Only `AUTHORIZED` payments can be captured.
- Only `CAPTURED` payments can be refunded.
- `PENDING` transitions to `AUTHORIZED` on successful Stripe PaymentIntent creation.
- `AUTHORIZED` transitions to `FAILED` or `CANCELLED` via webhook events only.

### 4.2 `PaymentMethod` Aggregate

```typescript
class PaymentMethod extends AggregateRoot {
  paymentMethodId: PaymentMethodId      // TypedId wrapper
  travelerId: string                    // owner (JWT sub)
  stripePaymentMethodId: StripePaymentMethodId  // pm_xxx (Stripe token)
  cardBrand: CardBrand                  // visa | mastercard | amex | discover
  last4: Last4                          // 4-digit string (display only)
  expiryMonth: number                   // 1-12
  expiryYear: number                    // YYYY
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}
```

### 4.3 Value Objects

| Value Object | Type | Constraint |
|---|---|---|
| `PaymentId` | `TypedId` | UUID v4 |
| `PaymentMethodId` | `TypedId` | UUID v4 |
| `Money` | `{ amount: number, currency: string }` | amount > 0, currency ISO 4217, 2 decimal places |
| `PaymentStatus` | enum | PENDING / AUTHORIZED / CAPTURED / REFUNDED / FAILED / CANCELLED |
| `StripePaymentMethodId` | string | Must match `pm_[a-zA-Z0-9]+` |
| `CardBrand` | enum | visa / mastercard / amex / discover / unknown |
| `Last4` | string | Exactly 4 digits `[0-9]{4}` |

---

## 5. API Contracts

All endpoints are under `/api/v1`. JWT Bearer required on all endpoints (except `POST /webhooks/stripe`).

### 5.1 `POST /payment-methods`

**Role**: Employee (any authenticated traveler)  
**Request Body**:
```json
{
  "stripePaymentMethodId": "pm_1234567890",
  "cardBrand": "visa",
  "last4": "4242",
  "expiryMonth": 12,
  "expiryYear": 2027
}
```
**Response 201**:
```json
{
  "paymentMethodId": "uuid",
  "travelerId": "uuid",
  "cardBrand": "visa",
  "last4": "4242",
  "expiryMonth": 12,
  "expiryYear": 2027,
  "createdAt": "2026-05-02T10:00:00Z"
}
```
**Note**: `stripePaymentMethodId` is stored but NOT returned in responses (PCI-DSS).

### 5.2 `GET /payment-methods`

**Role**: Employee (own records only, filtered by `travelerId` from JWT)  
**Response 200**: Array of `PaymentMethodResponse` (same shape as 201 above, no `stripePaymentMethodId`).

### 5.3 `DELETE /payment-methods/:paymentMethodId`

**Role**: Employee (own records only — ownership check by `travelerId`)  
**Response**: 204 No Content  
**Side effect**: Calls `stripe.paymentMethods.detach(stripePaymentMethodId)` then soft-deletes (`isActive = false`).

### 5.4 `POST /payments`

**Role**: Employee  
**Idempotency-Key header**: Required (UUID)  
**Request Body**:
```json
{
  "paymentMethodId": "uuid",
  "amount": 350.00,
  "currency": "USD",
  "bookingId": "uuid",
  "description": "Flight SFO-JFK - Jan 2027"
}
```
**Response 201** (or 200 on duplicate `Idempotency-Key`):
```json
{
  "paymentId": "uuid",
  "status": "AUTHORIZED",
  "amount": 350.00,
  "currency": "USD",
  "bookingId": "uuid",
  "stripePaymentIntentId": "pi_xxx",
  "createdAt": "2026-05-02T10:00:00Z"
}
```

### 5.5 `POST /payments/:paymentId/capture`

**Role**: Employee — ownership check only (`travelerId` from JWT must match `payment.travelerId`). No Manager/Admin role required (OQ-2 resolved).  
**Request Body**: None. Full capture only in v1 — the `amountToCapture` field is NOT exposed. The endpoint always captures the full authorized amount. Partial capture may be added in v2 (OQ-3 resolved).  
**Response 200**:
```json
{
  "paymentId": "uuid",
  "status": "CAPTURED",
  "capturedAmount": 350.00,
  "currency": "USD"
}
```

### 5.6 `POST /payments/:paymentId/refund`

**Role**: Employee — ownership check only (`travelerId` from JWT must match `payment.travelerId`). No Manager/Admin role required (OQ-2 resolved).  
**Request Body**:
```json
{
  "amount": 350.00,
  "reason": "requested_by_customer"
}
```
**Response 200**:
```json
{
  "paymentId": "uuid",
  "status": "REFUNDED",
  "refundedAmount": 350.00,
  "currency": "USD"
}
```

---

## 6. Database Schema

### 6.1 `payments` Table

```sql
CREATE TABLE payments (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id             UUID          NOT NULL,
  booking_id              UUID          NOT NULL,
  payment_method_id       UUID          NOT NULL REFERENCES payment_methods(id),
  amount                  NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  currency                VARCHAR(3)    NOT NULL,
  status                  VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
  stripe_payment_intent_id VARCHAR(255) NOT NULL,
  idempotency_key         VARCHAR(255)  NOT NULL UNIQUE,
  description             TEXT,
  failure_reason          TEXT,
  captured_amount         NUMERIC(12,2),
  refunded_amount         NUMERIC(12,2),
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_traveler_id ON payments(traveler_id);
CREATE INDEX idx_payments_booking_id ON payments(booking_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE UNIQUE INDEX idx_payments_idempotency_key ON payments(idempotency_key);
```

### 6.2 `payment_methods` Table

```sql
CREATE TABLE payment_methods (
  id                          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id                 UUID        NOT NULL,
  stripe_payment_method_id    VARCHAR(255) NOT NULL UNIQUE,
  card_brand                  VARCHAR(20) NOT NULL,
  last4                       CHAR(4)     NOT NULL,
  expiry_month                SMALLINT    NOT NULL CHECK (expiry_month BETWEEN 1 AND 12),
  expiry_year                 SMALLINT    NOT NULL,
  is_active                   BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_traveler_id ON payment_methods(traveler_id);
CREATE INDEX idx_payment_methods_active ON payment_methods(traveler_id, is_active);
```

> **PCI-DSS Note**: `stripe_payment_method_id` (pm_xxx) is a Stripe token reference, not a raw PAN. `last4` is a display-only truncated value. Full card numbers, CVVs, and magnetic stripe data are NEVER stored.

---

## 7. Stripe Integration Design

### 7.1 Authentication

Stripe SDK is initialized with `STRIPE_SECRET_KEY` (from Kubernetes Secret `payment-service-secrets`). No OAuth2. Secret key is loaded via NestJS `ConfigService` at startup and never logged or exposed in responses.

### 7.2 Manual-Capture PaymentIntent Flow

```
Client              PaymentController     AuthorizePaymentUseCase     StripeClientService        Stripe API
  │                       │                       │                          │                      │
  │  POST /payments        │                       │                          │                      │
  │ (Idempotency-Key: X)  │                       │                          │                      │
  ├──────────────────────►│                       │                          │                      │
  │                       │  execute(command)      │                          │                      │
  │                       ├──────────────────────►│                          │                      │
  │                       │                       │  check idempotency_key   │                      │
  │                       │                       │  (DB lookup)             │                      │
  │                       │                       │ ─────────────────────────────────────────────► │
  │                       │                       │  if duplicate → return existing record          │
  │                       │                       │                          │                      │
  │                       │                       │  createPaymentIntent()   │                      │
  │                       │                       ├─────────────────────────►│                      │
  │                       │                       │                          │  paymentIntents.create│
  │                       │                       │                          │  capture_method:manual│
  │                       │                       │                          │  idempotencyKey: X   │
  │                       │                       │                          ├─────────────────────►│
  │                       │                       │                          │◄─────────────────────┤
  │                       │                       │                          │  pi_xxx, status:      │
  │                       │                       │                          │  requires_capture     │
  │                       │                       │◄─────────────────────────┤                      │
  │                       │                       │  save Payment(AUTHORIZED)│                      │
  │                       │                       │  publish PaymentAuthorized to Kafka              │
  │                       │◄──────────────────────┤                          │                      │
  │◄──────────────────────┤                       │                          │                      │
  │  201 PaymentResponse  │                       │                          │                      │
```

### 7.3 Capture Flow

```
POST /payments/:id/capture
  → CapturePaymentUseCase
  → verify payment.travelerId === JWT sub (throw ForbiddenException 403 if mismatch)
  → verify Payment.status === AUTHORIZED (throw InvalidStateException 409 if not)
  → stripe.paymentIntents.capture(stripePaymentIntentId)   // full capture only; no amount_to_capture in v1
  → Payment.markCaptured(capturedAmount)
  → DB save
  → publish PaymentCaptured to Kafka
  → return PaymentResponse(CAPTURED)
```

> **OQ-2 (resolved)**: Ownership check only — `travelerId` from JWT must equal `payment.travelerId`. Return 403 if mismatch. No `RolesGuard` on this route.  
> **OQ-3 (resolved)**: Full capture only in v1. `amountToCapture` is not accepted. Partial capture may be added in v2.

### 7.4 Refund Flow

```
POST /payments/:id/refund
  → RefundPaymentUseCase
  → verify payment.travelerId === JWT sub (throw ForbiddenException 403 if mismatch)
  → verify Payment.status === CAPTURED (throw InvalidStateException 409 if not)
  → stripe.refunds.create({ payment_intent, amount, reason })
  → Payment.markRefunded(refundedAmount)
  → DB save
  → publish PaymentRefunded to Kafka
  → return PaymentResponse(REFUNDED)
```

### 7.5 Webhook Reconciliation

```
POST /webhooks/stripe (no JWT — uses Stripe-Signature verification instead)
  → StripeWebhookController.handleWebhook(rawBody, stripe-signature header)
  → stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET)
  → switch(event.type):
      'payment_intent.payment_failed':
        → find Payment by stripePaymentIntentId
        → Payment.markFailed(failureReason)
        → DB save
        → publish PaymentFailed to Kafka
      'payment_intent.canceled':
        → find Payment by stripePaymentIntentId
        → Payment.markCancelled()
        → DB save
        → (no Kafka event for cancelled — saga timeout handles it)
  → return 200 OK to Stripe
```

> **Note**: Stripe's webhook delivery is at-least-once. The handler must be idempotent — check current `Payment.status` before applying transitions; ignore events that would cause invalid state transitions.

---

## 8. Resilience Design

### 8.1 Circuit Breaker (opossum)

```typescript
const circuitBreakerOptions = {
  errorThresholdPercentage: 50,  // open if >50% of calls fail
  volumeThreshold: 10,           // minimum 10 calls before evaluating
  timeout: 15000,                // 15s call timeout (Stripe override)
  resetTimeout: 30000,           // 30s half-open recovery
};

// Fallback
function stripeFallback(err: Error): never {
  throw new ServiceUnavailableException(
    'Payment processing temporarily unavailable. Please try again later.'
  );
}
```

Circuit breaker wraps: `createPaymentIntent`, `capturePaymentIntent`, `createRefund`, `attachPaymentMethod`, `detachPaymentMethod`.

### 8.2 Retry Policy

```typescript
const retryConfig = {
  retries: 3,           // 3 retries (4 total attempts)
  factor: 2,            // exponential backoff factor
  minTimeout: 200,      // base 200ms
  maxTimeout: 5000,     // max 5s
  randomize: true,      // jitter
  retryOn: [429, 500, 502, 503, 504],  // retryable status codes
  noRetryOn: [400, 402, 403, 404],     // non-retryable (400=bad request, 402=card declined, 403=forbidden)
};
```

**402 (card declined) is explicitly non-retryable** — retrying a declined card will not succeed and could trigger fraud detection.

### 8.3 Timeout Configuration

| Call Type | Connect Timeout | Read Timeout |
|---|---|---|
| Stripe SDK | 2s | 15s (payment-service override per PROJECT.md §12) |
| PostgreSQL queries | — | 5s |

```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  timeout: 15000,  // 15s read timeout
  maxNetworkRetries: 0,  // retries handled at application layer
});
```

---

## 9. Idempotency Design

### 9.1 Flow

```
POST /payments (Idempotency-Key: "uuid-abc")
  1. Extract Idempotency-Key from request header (required; 400 if missing)
  2. Query: SELECT * FROM payments WHERE idempotency_key = 'uuid-abc'
  3. If found AND status != PENDING:
       → return 200 OK with existing PaymentResponse
  4. If found AND status = PENDING:
       → return 409 Conflict (concurrent in-flight request)
  5. If not found:
       → proceed with AuthorizePaymentUseCase
       → save Payment with idempotency_key (PostgreSQL UNIQUE constraint as safety net)
       → if DB throws unique constraint violation → retry step 2 (race condition)
  6. Forward same Idempotency-Key to Stripe API call
       → Stripe also deduplicates on its side for 24h
```

### 9.2 Idempotency Key TTL

- PostgreSQL: `payments.idempotency_key` is permanent (no TTL). Old records are retained for audit.
- Stripe: Idempotency keys expire after 24h on Stripe's side; after that, a new key should be used.

> **Note**: Redis is NOT used for idempotency keys (PCI-DSS prohibits caching payment data in Redis).

---

## 10. Webhook Design

### 10.1 Endpoint

`POST /api/v1/webhooks/stripe`

- **Authentication**: None (JWT bypassed). Stripe-Signature header verified instead.
- **Body parsing**: Raw body (`Buffer`) — required for HMAC signature verification. `bodyParser: false` on this route.
- **Content-Type**: `application/json`

### 10.2 Signature Verification

```typescript
const event = stripe.webhooks.constructEvent(
  rawBody,                    // Buffer (not parsed JSON)
  req.headers['stripe-signature'],
  process.env.STRIPE_WEBHOOK_SECRET
);
// Throws StripeSignatureVerificationError if invalid → 400
```

### 10.3 Handled Events

| Stripe Event | Action |
|---|---|
| `payment_intent.payment_failed` | Find payment by `stripe_payment_intent_id`, transition to FAILED, publish `PaymentFailed` |
| `payment_intent.canceled` | Find payment by `stripe_payment_intent_id`, transition to CANCELLED, no Kafka event |

### 10.4 Idempotency (OQ-1 resolved)

**No `stripe_webhook_events` table.** Deduplication is achieved via the existing `payments` table:

1. Look up payment by `stripe_payment_intent_id` (`PaymentRepository.findByStripePaymentIntentId`).
2. Check current `Payment.status` before applying any transition.
3. If payment is already in FAILED / CANCELLED / CAPTURED state, acknowledge (200 OK) without re-applying the transition and without publishing a duplicate Kafka event.
4. Stripe's built-in exponential retry schedule handles re-delivery on handler failures. On retry, step 3 ensures idempotent processing.

This means the existing `UNIQUE` index on `payments.idempotency_key` combined with the `stripe_payment_intent_id` lookup is sufficient for webhook deduplication. No additional table or queue is required.

---

## 11. Event Schema (ADR-003)

All events follow the ADR-003 schema:

```typescript
interface DomainEvent {
  eventId: string;        // UUID v4
  eventType: string;      // e.g. "PaymentAuthorized"
  aggregateId: string;    // paymentId
  occurredOn: string;     // ISO 8601
  correlationId: string;  // X-Correlation-ID from request
  causationId: string;    // request ID or parent event ID
  data: Record<string, unknown>;
}
```

### 11.1 `PaymentAuthorized` → topic: `payment.authorized`

```json
{
  "eventId": "uuid",
  "eventType": "PaymentAuthorized",
  "aggregateId": "paymentId",
  "occurredOn": "2026-05-02T10:00:00Z",
  "correlationId": "uuid",
  "causationId": "uuid",
  "data": {
    "paymentId": "uuid",
    "travelerId": "uuid",
    "bookingId": "uuid",
    "amount": 350.00,
    "currency": "USD",
    "stripePaymentIntentId": "pi_xxx"
  }
}
```

### 11.2 `PaymentCaptured` → topic: `payment.captured`

```json
{
  "eventType": "PaymentCaptured",
  "data": {
    "paymentId": "uuid",
    "bookingId": "uuid",
    "capturedAmount": 350.00,
    "currency": "USD"
  }
}
```

### 11.3 `PaymentRefunded` → topic: `payment.refunded`

```json
{
  "eventType": "PaymentRefunded",
  "data": {
    "paymentId": "uuid",
    "bookingId": "uuid",
    "refundedAmount": 350.00,
    "currency": "USD",
    "reason": "booking_cancelled"
  }
}
```

### 11.4 `PaymentFailed` → topic: `payment.failed`

```json
{
  "eventType": "PaymentFailed",
  "data": {
    "paymentId": "uuid",
    "bookingId": "uuid",
    "failureReason": "insufficient_funds",
    "stripePaymentIntentId": "pi_xxx"
  }
}
```

---

## 12. PCI-DSS Controls

| Control | Implementation |
|---|---|
| **Never store raw PAN** | `payment_methods` table stores `stripe_payment_method_id` (pm_xxx token) and `last4` only. No column for full card number exists. |
| **Never store CVV** | No CVV column exists anywhere. CVV is never received by this service (Stripe Elements handles it on the frontend). |
| **Never log card data** | Winston log sanitizer strips any field matching `card`, `pan`, `cvv`, `cvc`, `cardNumber` patterns. Code review checklist enforces this. |
| **Never log Stripe secret key** | `STRIPE_SECRET_KEY` is loaded via `ConfigService` only; never interpolated into log messages. |
| **Stripe tokenization only** | Frontend uses Stripe.js/Elements to tokenize card data; this service receives only `pm_xxx` references. |
| **Redis NOT used for payment data** | `payment-service` has no Redis integration for payment or payment method entities. Rate-limit counters (non-PCI data) may use Redis. |
| **TLS 1.3 in transit** | All communication with Stripe uses HTTPS (enforced by Stripe SDK). Internal service-to-service uses TLS via Kubernetes Ingress. |
| **AES-256 at rest** | PostgreSQL volume encrypted at rest per infrastructure ADR-005. |
| **Access control** | JWT RBAC enforced at API Gateway + service layer. Database credentials in Kubernetes Secrets. |
| **Audit logging** | All payment state transitions logged with `correlationId`, `paymentId`, `previousStatus`, `newStatus`. Logs retained 1 year per compliance policy. |

---

## 13. Observability

### 13.1 Prometheus Metrics

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | method, route, status_code | All HTTP requests |
| `http_request_duration_seconds` | Histogram | method, route | p50/p95/p99 latency |
| `stripe_api_calls_total` | Counter | operation, outcome (success/error) | Total Stripe SDK calls |
| `stripe_api_errors_total` | Counter | operation, error_type | Stripe API errors |
| `payments_created_total` | Counter | currency | PaymentIntents created |
| `payments_captured_total` | Counter | currency | Payments captured |
| `payments_refunded_total` | Counter | currency | Payments refunded |
| `circuit_state` | Gauge | service (stripe) | 0=closed, 0.5=half-open, 1=open |
| `circuit_breaker_errors_total` | Counter | service | Circuit breaker error count |
| `retry_count` | Counter | operation, outcome | Stripe retry attempts |
| `kafka_events_published_total` | Counter | topic, event_type | Kafka events published |
| `db_query_duration_seconds` | Histogram | operation | PostgreSQL query latency |

### 13.2 Tracing (OpenTelemetry + Jaeger)

Span created for:
- Each HTTP request (trace ID = `X-Correlation-ID`)
- Each Stripe SDK call (child span)
- Each PostgreSQL query (child span)
- Each Kafka event publish (child span)

`X-Correlation-ID` header is propagated to all downstream calls and included in all log entries.

### 13.3 Logging (Winston JSON)

```json
{
  "timestamp": "ISO 8601",
  "level": "info",
  "service": "payment-service",
  "correlationId": "uuid",
  "message": "Payment authorized",
  "context": {
    "paymentId": "uuid",
    "bookingId": "uuid",
    "amount": 350.00,
    "currency": "USD",
    "status": "AUTHORIZED"
  }
}
```

**PCI-DSS log fields that MUST NEVER appear**: `cardNumber`, `pan`, `cvv`, `cvc`, `stripeSecretKey`, `stripePaymentMethodId` (Stripe token — may be present in audit logs only, not in error logs), full `stripe-signature` header value.
