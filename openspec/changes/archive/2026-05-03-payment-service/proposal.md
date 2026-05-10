# Proposal: Payment Service (SM-06)

**Change ID**: payment-service  
**Domain**: `payment-service`  
**Status**: PROPOSED  
**Author**: spec-generator  
**Date**: 2026-05-02  
**Prerequisite**: SM-01 (`@travel/shared` package)

---

## 1. Intent

Implement a PCI-DSS-compliant NestJS Payment microservice (port 3004) that handles corporate travel payment processing via Stripe. The service manages the full payment lifecycle — authorize, capture, refund — using Stripe's manual-capture PaymentIntent flow, stores only Stripe token references (never raw card data), and publishes domain events to Kafka for downstream saga coordination.

---

## 2. Background

The Corporate Travel Portal's booking saga (SM-05) requires a dedicated payment bounded context that:

- Accepts Stripe-tokenized payment methods from the frontend (never raw PANs).
- Authorizes funds at booking creation and captures only on flight confirmation.
- Supports refund on cancellation.
- Publishes `PaymentAuthorized`, `PaymentCaptured`, `PaymentRefunded`, and `PaymentFailed` events consumed by the Booking Service saga.
- Meets PCI-DSS requirements: no card numbers, CVVs, or full PANs stored or logged anywhere in this service.

---

## 3. In Scope

| Area | Detail |
|---|---|
| **Endpoints** | `POST /payment-methods`, `GET /payment-methods`, `DELETE /payment-methods/:paymentMethodId`, `POST /payments`, `GET /payments/:paymentId`, `POST /payments/:paymentId/capture`, `POST /payments/:paymentId/refund` |
| **Aggregates** | `Payment` (PENDING → AUTHORIZED → CAPTURED / REFUNDED / FAILED / CANCELLED), `PaymentMethod` (Stripe token reference) |
| **Stripe integration** | PaymentIntent manual-capture flow, `stripe.paymentIntents.create/capture`, `stripe.refunds.create`, webhook reconciliation |
| **Stripe webhook** | `POST /webhooks/stripe` — verify signature, handle `payment_intent.payment_failed`, `payment_intent.canceled` |
| **Idempotency** | `POST /payments` idempotent by `Idempotency-Key` header; key stored in `payments.idempotency_key` (PostgreSQL unique constraint); forwarded to Stripe |
| **Resilience** | Circuit breaker (opossum) on all Stripe SDK calls; 3× retry with exponential backoff on 429 and 5xx; non-retryable: 400/402/403 |
| **Kafka events** | Topics: `payment.authorized`, `payment.captured`, `payment.refunded`, `payment.failed` |
| **PCI-DSS controls** | Never store raw PAN, CVV, expiry in plaintext; only Stripe token references persisted; never log sensitive card fields |
| **Observability** | Prometheus metrics, OTel traces, Winston JSON logs with correlation IDs |
| **DDD 4-layer architecture** | Domain / Application / Infrastructure / Presentation |
| **Testing** | Unit (domain), integration (Testcontainers PostgreSQL + Stripe mock), 80% coverage target |

---

## 4. Out of Scope

| Item | Reason |
|---|---|
| Booking saga orchestration | SM-05 (Booking Service) owns saga coordination |
| Expense reporting / receipt generation | SM-07 (Expense Service) |
| Raw card storage | Forbidden by PCI-DSS and ADR-005 |
| Frontend SPA / UI | Separate frontend project |
| Redis caching of payment entities | Forbidden by PCI-DSS (per PROJECT.md §12 payment-service override) |
| Outbox relay pattern | Not implemented per PROJECT.md §6 |
| CQRS read store | Read model is simple status lookups; no separate store needed |

---

## 5. Applied Patterns

1. **Database-per-service** — Payment service owns its own PostgreSQL schema (`payments`, `payment_methods`). No other service accesses these tables directly.
2. **Idempotency** — `POST /payments` deduplicates by `Idempotency-Key` header stored in `payments.idempotency_key` (PostgreSQL `UNIQUE` constraint). Duplicate requests return `200 OK` with the existing record. The same key is forwarded to Stripe for upstream deduplication.
3. **Timeouts** — Stripe SDK configured with 2s connect timeout and 15s read timeout (payment-service override per PROJECT.md §12).
4. **Retries** — Stripe calls retry up to 3× with exponential backoff (base 200ms, max 5s, jitter) on HTTP 429 and 5xx responses. HTTP 400, 402 (card declined), and 403 are non-retryable.
5. **Circuit Breaker** — All Stripe SDK calls wrapped in an opossum circuit breaker (50% error threshold over 10 requests in 30s window; 30s half-open recovery). Fallback: HTTP 503 with structured error response.

---

## 6. Not-Applied Patterns (with rationale)

| Pattern | Decision |
|---|---|
| CQRS | Not applicable — read model is simple status lookups, no separate read store needed |
| Saga (Choreography / Orchestration) | Not applicable — this service reacts to booking saga commands; it does not coordinate a saga |
| Outbox | Not applicable — direct Kafka publish after DB commit; outbox relay not implemented (PROJECT.md §6) |
| Bulkheads | Not applicable — single external system (Stripe); circuit breaker isolation is sufficient |
| Cache-aside / Read-through / Write-through / Cache Invalidation | Not applicable — PCI-DSS prohibits caching payment entities; Redis not used for payment data |

---

## 7. Open Questions

| # | Question | Options | Impact |
|---|---|---|---|
| OQ-1 | **Stripe webhook retry strategy**: When the webhook handler fails (DB error, Kafka publish error), should Stripe retry with exponential backoff or linear backoff? | ~~(a) Rely on Stripe's built-in exponential retry schedule; (b) Persist webhook events to a `stripe_webhook_events` table and process idempotently on retry~~ **DECIDED**: Rely on Stripe's built-in retries. No `stripe_webhook_events` table. Deduplication handled by the existing `payments.idempotency_key` unique constraint — when Stripe retries the same event, the handler looks up payment by `stripe_payment_intent_id` and skips the transition if already in a terminal state. | ~~Choosing (b) adds a new table and processing queue but gives full auditability. Recommended: (b) for production resilience.~~ No new table required. |
| OQ-2 | **Capture / refund RBAC**: Should `POST /payments/:paymentId/capture` and `POST /payments/:paymentId/refund` require Manager or Admin role, or is a traveler ownership check sufficient? | ~~(a) Ownership check only (any traveler who owns the payment can capture/refund); (b) Manager/Admin role required for capture; (c) Manager/Admin role required for refund only~~ **DECIDED**: Ownership check only. `travelerId` from JWT must match `payment.travelerId`. Return 403 if mismatch. No Manager/Admin role guard required on either endpoint. | ~~This affects the RBAC guard configuration on two controllers.~~ Only `JwtAuthGuard` needed; no `RolesGuard` on capture/refund. |
| OQ-3 | **Partial capture in v1**: Should `POST /payments/:paymentId/capture` support an optional `amountToCapture` (less than the authorized amount) in v1, or is full capture only? | ~~(a) Full capture only in v1, partial in v2; (b) Partial capture supported from v1~~ **DECIDED**: Full capture only in v1. The `amountToCapture` field is NOT exposed in the request body. The capture endpoint always captures the full authorized amount. Partial capture may be added in v2. | ~~Stripe `paymentIntents.capture({ amount_to_capture })` supports partial capture. Choosing (b) increases API surface and domain complexity in v1.~~ Simplifies v1 API surface. |

---

## 8. Dependencies

| Dependency | Type | Status |
|---|---|---|
| SM-01 `@travel/shared` | Prerequisite | Done — `KafkaModule`, `AggregateRoot`, `DomainEvent`, `IRepository`, `Money`, `TypedId` available |
| PostgreSQL 15 | Infrastructure | Available (PROJECT.md §6) |
| Apache Kafka 3.x (KafkaJS 2.x) | Infrastructure | Available (PROJECT.md §6) |
| Stripe SDK (`stripe` npm, v13+) | External | Available; `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` from Kubernetes Secrets |
| opossum (circuit breaker) | Library | Must be added to `payment-service/package.json` |

---

## 9. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Stripe API downtime during capture | Medium | High | Circuit breaker + 503 fallback; retry on 5xx; booking saga handles `PaymentFailed` event |
| Duplicate `Idempotency-Key` collision (hash collision) | Very Low | Medium | PostgreSQL `UNIQUE` constraint enforces server-side deduplication |
| Webhook signature verification failure due to clock skew | Low | Medium | Stripe tolerates 5-minute window; server NTP sync required |
| PCI-DSS audit finding (accidental card data in logs) | Low | Critical | Log sanitization middleware; structured log schema enforced; never log card fields in code review checklist |
| Booking Service (SM-07) API contract dependency | Medium | High | SM-07 calls `POST /payments`, `POST /payments/:id/capture`, `POST /payments/:id/refund`, and `GET /payments/:id`. Any path or schema change to these endpoints is a breaking change for SM-07. The OpenAPI contract in `docs/contracts/openapi/payment-service.yaml` is the single source of truth — both services MUST be validated against it before release. |
