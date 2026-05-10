# Tasks: Payment Service (SM-06)

**Change ID**: payment-service  
**Domain**: `payment-service`  
**Status**: READY  
**Author**: spec-generator  
**Date**: 2026-05-02

---

## Execution Order

Tasks must be executed in the order listed. No task has a forward dependency — each task can start immediately after all prior tasks are complete.

```
T01 → T02 → T03 → T04 → T05 → T06 → T07 → T08 → T09 → T10 → T10b → T11 → T12 → T13 → T14 → T15 → T16
```

---

## T01 — Bootstrap NestJS App, Env Config, TypeORM + PostgreSQL

**Description**: Scaffold the `payment-service` NestJS application (port 3004). Configure `ConfigModule` (validated via `joi` or `class-validator`) for all required environment variables. Set up TypeORM connection to PostgreSQL 15 with connection pool max 20. Add health check endpoint (`GET /health`). Create `package.json` with all required dependencies.

**Files affected**:
- `services/payment-service/package.json` (create)
- `services/payment-service/src/main.ts` (create)
- `services/payment-service/src/app.module.ts` (create)
- `services/payment-service/src/config/env.validation.ts` (create)
- `services/payment-service/.env.example` (create)

**Required environment variables to configure**:
- `PORT` (default: 3004)
- `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- `KAFKA_BROKERS`
- `KAFKA_CLIENT_ID` (default: `payment-service`)
- `KAFKA_GROUP_ID` (default: `payment-service-group`)

**Acceptance Criteria**:

- AC-T01-1: `npm run start:dev` starts the application on port 3004 without errors.
- AC-T01-2: `GET /health` returns `{ status: "ok", service: "payment-service" }` with HTTP 200.
- AC-T01-3: Application fails to start if any required environment variable is missing.
- AC-T01-4: TypeORM connects to PostgreSQL; `DB_QUERY_TIMEOUT` is set to 5000ms.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T01-2 | `src/app.module.spec.ts` | `should return 200 from GET /health` | Health endpoint returns non-200 |
| AC-T01-3 | `src/config/env.validation.spec.ts` | `should throw on missing STRIPE_SECRET_KEY` | App starts without required env var |
| AC-T01-4 | `src/app.module.spec.ts` | `should configure TypeORM with poolSize=20 and timeout=5000` | Pool size or timeout is wrong |

---

## T02 — Domain Layer: Aggregates, Value Objects, Domain Events

**Description**: Implement the complete domain layer. No external dependencies allowed — domain layer is pure TypeScript.

**Files affected**:
- `src/domain/aggregates/payment.aggregate.ts` (create)
- `src/domain/aggregates/payment.aggregate.spec.ts` (create)
- `src/domain/aggregates/payment-method.aggregate.ts` (create)
- `src/domain/aggregates/payment-method.aggregate.spec.ts` (create)
- `src/domain/value-objects/payment-id.vo.ts` (create)
- `src/domain/value-objects/payment-method-id.vo.ts` (create)
- `src/domain/value-objects/payment-status.enum.ts` (create)
- `src/domain/value-objects/stripe-payment-method-id.vo.ts` (create)
- `src/domain/value-objects/card-brand.vo.ts` (create)
- `src/domain/value-objects/last4.vo.ts` (create)
- `src/domain/value-objects/money.vo.ts` (create — or re-export from `@travel/shared`)
- `src/domain/events/payment-authorized.event.ts` (create)
- `src/domain/events/payment-captured.event.ts` (create)
- `src/domain/events/payment-refunded.event.ts` (create)
- `src/domain/events/payment-failed.event.ts` (create)
- `src/domain/repositories/payment.repository.interface.ts` (create)
- `src/domain/repositories/payment-method.repository.interface.ts` (create)

**Implementation notes**:
- `Payment` aggregate: implement `authorize(stripePaymentIntentId)`, `markCaptured(amount)`, `markRefunded(amount, reason)`, `markFailed(reason)`, `markCancelled()` methods. Each raises the corresponding domain event. Each enforces state transition rules (throw `DomainException` on invalid transitions).
- `PaymentMethod` aggregate: implement `deactivate()` method.
- `Last4` value object: validate exactly 4 digits `[0-9]{4}`.
- `StripePaymentMethodId` value object: validate matches `pm_[a-zA-Z0-9]+` or `pm_test_[a-zA-Z0-9]+`.
- `Money` value object: amount > 0, currency is 3-character ISO 4217 string.
- Use `AggregateRoot` and `DomainEvent` from `@travel/shared`.
- Use `TypedId` from `@travel/shared` for `PaymentId` and `PaymentMethodId`.

**Acceptance Criteria**:

- AC-T02-1: All 6 state transitions (PENDING→AUTHORIZED, AUTHORIZED→CAPTURED, AUTHORIZED→FAILED, AUTHORIZED→CANCELLED, CAPTURED→REFUNDED) are enforced.
- AC-T02-2: Invalid transitions throw `DomainException` with code `INVALID_STATE_TRANSITION`.
- AC-T02-3: Each valid transition raises the corresponding domain event.
- AC-T02-4: `Money` rejects amount ≤ 0 and non-3-character currency strings.
- AC-T02-5: `Last4` rejects strings that are not exactly 4 digits.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T02-1 | `src/domain/aggregates/payment.aggregate.spec.ts` | `should transition to AUTHORIZED when authorize() is called on PENDING payment` | Status does not change to AUTHORIZED |
| AC-T02-2 | `src/domain/aggregates/payment.aggregate.spec.ts` | `should throw DomainException when authorize() is called on CAPTURED payment` | No exception thrown on invalid transition |
| AC-T02-3 | `src/domain/aggregates/payment.aggregate.spec.ts` | `should raise PaymentAuthorized event when authorize() succeeds` | No domain event raised |
| AC-T02-4 | `src/domain/value-objects/money.vo.spec.ts` | `should throw DomainException when Money is created with zero or negative amount` | Money constructor accepts non-positive amount |
| AC-T02-5 | `src/domain/value-objects/last4.vo.spec.ts` | `should throw DomainException when Last4 is not exactly 4 digits` | Last4 constructor accepts invalid string |

---

## T03 — Database Migrations: `payments` and `payment_methods` Tables

**Description**: Create TypeORM migration files to create both tables. Migrations must be reversible (`down()` methods implemented).

**Files affected**:
- `src/infrastructure/persistence/migrations/1714600000000-CreatePaymentsTable.ts` (create)
- `src/infrastructure/persistence/migrations/1714600000001-CreatePaymentMethodsTable.ts` (create)

**`payments` table requirements** (see design.md §6.1 for full DDL):
- `id` UUID PRIMARY KEY
- `traveler_id` UUID NOT NULL
- `booking_id` UUID NOT NULL
- `payment_method_id` UUID NOT NULL REFERENCES payment_methods(id)
- `amount` NUMERIC(12,2) NOT NULL CHECK (amount > 0)
- `currency` VARCHAR(3) NOT NULL
- `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING'
- `stripe_payment_intent_id` VARCHAR(255) NOT NULL
- `idempotency_key` VARCHAR(255) NOT NULL UNIQUE
- `description` TEXT
- `failure_reason` TEXT
- `captured_amount` NUMERIC(12,2)
- `refunded_amount` NUMERIC(12,2)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- Indexes: `idx_payments_traveler_id`, `idx_payments_booking_id`, `idx_payments_status`, `idx_payments_idempotency_key` (UNIQUE)

**`payment_methods` table requirements** (see design.md §6.2 for full DDL):
- `id` UUID PRIMARY KEY
- `traveler_id` UUID NOT NULL
- `stripe_payment_method_id` VARCHAR(255) NOT NULL UNIQUE
- `card_brand` VARCHAR(20) NOT NULL
- `last4` CHAR(4) NOT NULL
- `expiry_month` SMALLINT NOT NULL CHECK (BETWEEN 1 AND 12)
- `expiry_year` SMALLINT NOT NULL
- `is_active` BOOLEAN NOT NULL DEFAULT TRUE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- Indexes: `idx_payment_methods_traveler_id`, `idx_payment_methods_active`

**Acceptance Criteria**:

- AC-T03-1: `npm run migration:run` applies both migrations without errors on a fresh PostgreSQL 15 database.
- AC-T03-2: `payments.idempotency_key` has a UNIQUE constraint.
- AC-T03-3: `npm run migration:revert` reverses both migrations cleanly (tables dropped, no orphaned indexes).
- AC-T03-4: No column for raw card number or CVV exists in either table.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T03-1 | `test/integration/migrations.integration.spec.ts` | `should apply both migrations without errors` | Migration throws on fresh DB |
| AC-T03-2 | `test/integration/migrations.integration.spec.ts` | `should enforce UNIQUE constraint on payments.idempotency_key` | Duplicate idempotency_key insert succeeds |
| AC-T03-3 | `test/integration/migrations.integration.spec.ts` | `should revert migrations cleanly` | Migration revert leaves orphaned tables |
| AC-T03-4 | `test/integration/migrations.integration.spec.ts` | `should not have cardNumber or cvv columns in any table` | Any table has a raw card data column |

---

## T04 — TypeORM Entities and Repository Implementations

**Description**: Implement TypeORM entity classes and their repository implementations. Map between TypeORM entities and domain aggregates (mapper pattern).

**Files affected**:
- `src/infrastructure/persistence/entities/payment.typeorm-entity.ts` (create)
- `src/infrastructure/persistence/entities/payment-method.typeorm-entity.ts` (create)
- `src/infrastructure/persistence/repositories/payment.repository.ts` (create)
- `src/infrastructure/persistence/repositories/payment.repository.spec.ts` (create)
- `src/infrastructure/persistence/repositories/payment-method.repository.ts` (create)
- `src/infrastructure/persistence/repositories/payment-method.repository.spec.ts` (create)

**Implementation notes**:
- Repositories implement `IPaymentRepository` and `IPaymentMethodRepository` interfaces from domain layer.
- `IPaymentRepository` must expose: `save(payment)`, `findById(paymentId)`, `findByIdempotencyKey(key)`, `findByStripePaymentIntentId(id)`.
- `IPaymentMethodRepository` must expose: `save(method)`, `findById(methodId)`, `findByTravelerId(travelerId)`, `findByStripePaymentMethodId(stripeId)`.
- `findByTravelerId` returns only `is_active = true` records.
- Mapper functions: `toDomain(entity): Aggregate` and `toPersistence(aggregate): Entity`.
- DB query timeout: 5000ms (set at TypeORM level in T01).

**Acceptance Criteria**:

- AC-T04-1: `PaymentRepository.findByIdempotencyKey` returns the existing payment when key matches.
- AC-T04-2: `PaymentRepository.findByStripePaymentIntentId` returns the payment associated with the Stripe PI.
- AC-T04-3: `PaymentMethodRepository.findByTravelerId` returns only `is_active = true` records.
- AC-T04-4: Domain aggregate reconstructed from TypeORM entity preserves all fields including status.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T04-1 | `src/infrastructure/persistence/repositories/payment.repository.spec.ts` | `should return payment by idempotency key` | Returns null for existing key |
| AC-T04-2 | `src/infrastructure/persistence/repositories/payment.repository.spec.ts` | `should return payment by stripePaymentIntentId` | Returns null for existing pi_xxx |
| AC-T04-3 | `src/infrastructure/persistence/repositories/payment-method.repository.spec.ts` | `should return only active payment methods for traveler` | Returns deactivated methods |
| AC-T04-4 | `src/infrastructure/persistence/repositories/payment.repository.spec.ts` | `should correctly reconstruct Payment aggregate from TypeORM entity` | Status or amount is lost in round-trip |

---

## T05 — Stripe Client Service (Circuit Breaker + Retry + Timeout)

**Description**: Implement `StripeClientService` which wraps the Stripe SDK with circuit breaker (opossum), retry logic (3× exponential backoff), and timeout configuration (15s). This service is the single point of contact for all Stripe API calls.

**Files affected**:
- `src/infrastructure/stripe/stripe-client.service.ts` (create)
- `src/infrastructure/stripe/stripe-client.service.spec.ts` (create)
- `src/infrastructure/stripe/stripe.module.ts` (create)

**Methods to implement**:
- `createPaymentIntent(params, idempotencyKey)` — `stripe.paymentIntents.create({ capture_method: 'manual', ... })`
- `capturePaymentIntent(stripePaymentIntentId, amountToCapture?)` — `stripe.paymentIntents.capture(...)`
- `createRefund(stripePaymentIntentId, amount, reason)` — `stripe.refunds.create(...)`
- `attachPaymentMethod(stripePaymentMethodId, customerId)` — `stripe.paymentMethods.attach(...)`
- `detachPaymentMethod(stripePaymentMethodId)` — `stripe.paymentMethods.detach(...)`
- `constructWebhookEvent(rawBody, signature, secret)` — `stripe.webhooks.constructEvent(...)`

**Resilience configuration** (see design.md §8):
- Circuit breaker: `errorThresholdPercentage: 50`, `volumeThreshold: 10`, `timeout: 15000`, `resetTimeout: 30000`
- Retry: 3 retries on 429 and 5xx; non-retryable: 400, 402, 403, 404
- Backoff: exponential base 200ms, max 5s, jitter enabled
- Metrics: `stripe_api_calls_total`, `stripe_api_errors_total`, `circuit_state`, `retry_count` emitted on each call

**Acceptance Criteria**:

- AC-T05-1: Circuit breaker opens after 6/10 failing Stripe calls and returns 503 fallback.
- AC-T05-2: 429 from Stripe triggers retry; 402 does NOT trigger retry.
- AC-T05-3: `constructWebhookEvent` is NOT wrapped by circuit breaker (pure HMAC verification, no network call).
- AC-T05-4: `stripe_api_calls_total` and `stripe_api_errors_total` are incremented on each call outcome.
- AC-T05-5: `retry_count` is incremented for each retry attempt.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T05-1 | `src/infrastructure/stripe/stripe-client.service.spec.ts` | `should open circuit and return 503 fallback after error threshold is exceeded` | Stripe still called after circuit opens |
| AC-T05-2 | `src/infrastructure/stripe/stripe-client.service.spec.ts` | `should retry on Stripe 429 and not retry on 402` | 402 triggers retry, or 429 does not retry |
| AC-T05-3 | `src/infrastructure/stripe/stripe-client.service.spec.ts` | `should not wrap constructWebhookEvent in circuit breaker` | Webhook event construction is circuit-broken |
| AC-T05-4 | `src/infrastructure/stripe/stripe-client.service.spec.ts` | `should increment stripe_api_calls_total on success and stripe_api_errors_total on error` | Metrics are not emitted |
| AC-T05-5 | `src/infrastructure/stripe/stripe-client.service.spec.ts` | `should increment retry_count for each Stripe retry attempt` | retry_count not incremented |

---

## T06 — Use Case: `AttachPaymentMethodUseCase`

**Description**: Implement the application use case for attaching a Stripe payment method. Validates the traveler does not already have this `stripePaymentMethodId`, creates a `PaymentMethod` aggregate, persists it, and returns the response DTO (without `stripePaymentMethodId`).

**Files affected**:
- `src/application/use-cases/attach-payment-method/attach-payment-method.use-case.ts` (create)
- `src/application/use-cases/attach-payment-method/attach-payment-method.command.ts` (create)
- `src/application/use-cases/attach-payment-method/attach-payment-method.use-case.spec.ts` (create)
- `src/application/dto/attach-payment-method.request.dto.ts` (create)
- `src/application/dto/payment-method.response.dto.ts` (create)

**Implementation notes**:
- Check for duplicate `stripePaymentMethodId` via `PaymentMethodRepository.findByStripePaymentMethodId` — if found, throw `ConflictException`.
- Set `travelerId` from the JWT claim (passed in command, not from request body).
- Response DTO must NOT include `stripePaymentMethodId`.

**Acceptance Criteria**:

- AC-T06-1: Returns `PaymentMethodResponseDto` without `stripePaymentMethodId` on success.
- AC-T06-2: Throws `ConflictException` if `stripePaymentMethodId` already exists.
- AC-T06-3: `travelerId` on the created record matches the JWT sub claim.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T06-1 | `src/application/use-cases/attach-payment-method/attach-payment-method.use-case.spec.ts` | `should return PaymentMethodResponseDto without stripePaymentMethodId` | Response contains stripePaymentMethodId |
| AC-T06-2 | `src/application/use-cases/attach-payment-method/attach-payment-method.use-case.spec.ts` | `should throw ConflictException when stripePaymentMethodId already exists` | No exception thrown on duplicate |
| AC-T06-3 | `src/application/use-cases/attach-payment-method/attach-payment-method.use-case.spec.ts` | `should set travelerId from JWT claim not from request body` | travelerId can be spoofed via body |

---

## T07 — Use Cases: `DetachPaymentMethodUseCase` + `ListPaymentMethodsUseCase`

**Description**: Implement the use cases for detaching (soft-delete) and listing payment methods.

**Files affected**:
- `src/application/use-cases/detach-payment-method/detach-payment-method.use-case.ts` (create)
- `src/application/use-cases/detach-payment-method/detach-payment-method.use-case.spec.ts` (create)
- `src/application/use-cases/list-payment-methods/list-payment-methods.use-case.ts` (create)
- `src/application/use-cases/list-payment-methods/list-payment-methods.use-case.spec.ts` (create)

**Implementation notes**:
- `DetachPaymentMethodUseCase`: load payment method by ID; verify `travelerId` matches JWT sub (throw `ForbiddenException` if not); call `PaymentMethod.deactivate()`; save; then call `StripeClientService.detachPaymentMethod(stripePaymentMethodId)` (Stripe failure does not roll back DB deactivation — log warning and continue).
- `ListPaymentMethodsUseCase`: query `PaymentMethodRepository.findByTravelerId(travelerId)` — returns only active records.

**Acceptance Criteria**:

- AC-T07-1: `DetachPaymentMethodUseCase` throws `ForbiddenException` if payment method does not belong to the caller.
- AC-T07-2: `DetachPaymentMethodUseCase` sets `is_active = false` even if Stripe detach call fails.
- AC-T07-3: `ListPaymentMethodsUseCase` returns only active payment methods for the authenticated traveler.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T07-1 | `src/application/use-cases/detach-payment-method/detach-payment-method.use-case.spec.ts` | `should throw ForbiddenException when travelerId does not match` | Detach succeeds for wrong traveler |
| AC-T07-2 | `src/application/use-cases/detach-payment-method/detach-payment-method.use-case.spec.ts` | `should deactivate payment method locally even when Stripe call fails` | DB deactivation is rolled back on Stripe error |
| AC-T07-3 | `src/application/use-cases/list-payment-methods/list-payment-methods.use-case.spec.ts` | `should return only active payment methods for the authenticated traveler` | Deactivated or other traveler's methods returned |

---

## T08 — Use Case: `AuthorizePaymentUseCase`

**Description**: Implement the core payment authorization use case. This is the most critical use case: it implements idempotency check, Stripe PaymentIntent creation (manual capture), DB persistence, and Kafka event publishing.

**Files affected**:
- `src/application/use-cases/authorize-payment/authorize-payment.use-case.ts` (create)
- `src/application/use-cases/authorize-payment/authorize-payment.command.ts` (create)
- `src/application/use-cases/authorize-payment/authorize-payment.use-case.spec.ts` (create)
- `src/application/dto/authorize-payment.request.dto.ts` (create)
- `src/application/dto/payment.response.dto.ts` (create)

**Implementation notes**:

```
1. Validate Idempotency-Key is present (throw BadRequestException if not)
2. Check idempotency: PaymentRepository.findByIdempotencyKey(key)
   - If found and status != PENDING → return existing PaymentResponseDto (HTTP 200)
   - If found and status = PENDING → throw ConflictException (409, in-flight)
3. Validate paymentMethodId belongs to the caller's travelerId
4. Create Payment aggregate in PENDING status
5. Call StripeClientService.createPaymentIntent({ capture_method: 'manual', amount, currency, ... }, idempotencyKey)
   - On Stripe 402 (card declined): call Payment.markFailed(reason), save, publish PaymentFailed, throw PaymentDeclinedException (HTTP 402)
   - On Stripe 5xx (after retries): throw PaymentProcessingException (HTTP 503)
   - On circuit open: throw ServiceUnavailableException (HTTP 503)
6. Call Payment.authorize(stripePaymentIntentId)
7. Save payment to DB (idempotency_key unique constraint as safety net)
8. Publish PaymentAuthorized to Kafka (failure is non-fatal: log warn, continue)
9. Return PaymentResponseDto (HTTP 201)
```

**Acceptance Criteria**:

- AC-T08-1: Duplicate `Idempotency-Key` returns 200 with existing record (no new Stripe call).
- AC-T08-2: Stripe 402 results in HTTP 402 response, Payment saved as FAILED, `PaymentFailed` event published, no retry.
- AC-T08-3: Kafka publish failure returns HTTP 201 (payment is saved; Kafka error is non-fatal).
- AC-T08-4: Payment record has `status = AUTHORIZED` and `stripe_payment_intent_id` set after success.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T08-1 | `src/application/use-cases/authorize-payment/authorize-payment.use-case.spec.ts` | `should return 200 with existing payment on duplicate Idempotency-Key` | New Stripe PaymentIntent created on duplicate key |
| AC-T08-2 | `src/application/use-cases/authorize-payment/authorize-payment.use-case.spec.ts` | `should return 402 and publish PaymentFailed when Stripe returns card_declined` | Stripe 402 triggers retry or returns 500 |
| AC-T08-3 | `src/application/use-cases/authorize-payment/authorize-payment.use-case.spec.ts` | `should persist payment and return 201 even when Kafka publish fails` | HTTP 500 returned on Kafka failure |
| AC-T08-4 | `src/application/use-cases/authorize-payment/authorize-payment.use-case.spec.ts` | `should save payment with status AUTHORIZED and stripePaymentIntentId after success` | Payment saved without stripePaymentIntentId |

---

## T09 — Use Case: `CapturePaymentUseCase`

**Description**: Implement the payment capture use case. Verifies payment ownership (travelerId from JWT), validates state (AUTHORIZED only), calls `StripeClientService.capturePaymentIntent` for the full authorized amount, transitions aggregate to CAPTURED, saves to DB, publishes `PaymentCaptured` event.

**Files affected**:
- `src/application/use-cases/capture-payment/capture-payment.use-case.ts` (create)
- `src/application/use-cases/capture-payment/capture-payment.command.ts` (create)
- `src/application/use-cases/capture-payment/capture-payment.use-case.spec.ts` (create)
- `src/application/dto/capture-payment.request.dto.ts` (create — empty body DTO; no fields accepted in v1)

**Implementation notes**:
- Ownership check: `payment.travelerId` must equal JWT sub. Throw `ForbiddenException` (403) if not. This check must happen **before** the state check and any Stripe call.
- State check: `payment.status` must be `AUTHORIZED`. Throw `InvalidStateException` (409) if not.
- **Full capture only (OQ-3 resolved)**: Do NOT accept `amountToCapture` in the command or request body. Always call `StripeClientService.capturePaymentIntent(stripePaymentIntentId)` without an amount parameter. v2 may add partial capture.
- `capture-payment.request.dto.ts` must be an empty class — reject (strip) any unexpected fields via `class-transformer` `excludeExtraneousValues`.

**Acceptance Criteria**:

- AC-T09-1: Successfully captures AUTHORIZED payment, transitions to CAPTURED, publishes `PaymentCaptured`.
- AC-T09-2: Returns 409 if payment is not in AUTHORIZED status.
- AC-T09-3: Returns 403 if `payment.travelerId` does not match the caller's JWT sub; ownership check runs before state check and before any Stripe call.
- AC-T09-4: Full authorized amount is always captured — Stripe is never called with a partial `amount_to_capture`.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T09-1 | `src/application/use-cases/capture-payment/capture-payment.use-case.spec.ts` | `should capture AUTHORIZED payment and publish PaymentCaptured event` | Payment not saved as CAPTURED or no event published |
| AC-T09-2 | `src/application/use-cases/capture-payment/capture-payment.use-case.spec.ts` | `should return 409 when attempting to capture non-AUTHORIZED payment` | HTTP 200 returned for already-captured payment |
| AC-T09-3 | `src/application/use-cases/capture-payment/capture-payment.use-case.spec.ts` | `should return 403 when traveler attempts to capture another traveler's payment` | HTTP 200 returned for unauthorized traveler |
| AC-T09-4 | `src/application/use-cases/capture-payment/capture-payment.use-case.spec.ts` | `should always capture the full authorized amount regardless of any amountToCapture in command` | Stripe called with partial `amount_to_capture` |

---

## T10 — Use Case: `RefundPaymentUseCase`

**Description**: Implement the payment refund use case. Verifies payment ownership (travelerId from JWT), validates state (CAPTURED only), calls `StripeClientService.createRefund`, transitions aggregate to REFUNDED, saves to DB, publishes `PaymentRefunded` event.

**Files affected**:
- `src/application/use-cases/refund-payment/refund-payment.use-case.ts` (create)
- `src/application/use-cases/refund-payment/refund-payment.command.ts` (create)
- `src/application/use-cases/refund-payment/refund-payment.use-case.spec.ts` (create)
- `src/application/dto/refund-payment.request.dto.ts` (create)

**Implementation notes**:
- Ownership check: `payment.travelerId` must equal JWT sub. Throw `ForbiddenException` (403) if not. This check must happen **before** the state check and any Stripe call (same pattern as T09, OQ-2 resolved).
- State check: `payment.status` must be `CAPTURED`. Throw `InvalidStateException` (409) if not.
- `reason` is passed to Stripe `reason` field (must be one of: `duplicate`, `fraudulent`, `requested_by_customer`); validate in DTO.

**Acceptance Criteria**:

- AC-T10-1: Successfully refunds CAPTURED payment, transitions to REFUNDED, publishes `PaymentRefunded`.
- AC-T10-2: Returns 409 if payment is not in CAPTURED status.
- AC-T10-3: Returns 403 if `payment.travelerId` does not match the caller's JWT sub; ownership check runs before state check and before any Stripe call.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T10-1 | `src/application/use-cases/refund-payment/refund-payment.use-case.spec.ts` | `should refund CAPTURED payment and publish PaymentRefunded event` | Payment not saved as REFUNDED or no event published |
| AC-T10-2 | `src/application/use-cases/refund-payment/refund-payment.use-case.spec.ts` | `should return 409 when attempting to refund non-CAPTURED payment` | HTTP 200 returned for AUTHORIZED payment |
| AC-T10-3 | `src/application/use-cases/refund-payment/refund-payment.use-case.spec.ts` | `should return 403 when traveler attempts to refund another traveler's payment` | HTTP 200 returned for unauthorized traveler |

---

## T10b — Use Case: `GetPaymentUseCase`

**Description**: Implement the `GET /payments/:paymentId` endpoint. Verifies payment ownership (travelerId from JWT must equal payment.travelerId), returns payment state without Stripe-internal fields. Returns 404 if not found, 403 if owned by a different traveler.

**Files affected**:
- `src/application/use-cases/get-payment/get-payment.use-case.ts` (create)
- `src/application/use-cases/get-payment/get-payment.query.ts` (create)
- `src/application/use-cases/get-payment/get-payment.use-case.spec.ts` (create)
- `src/presentation/controllers/payment.controller.ts` — add `GET /payments/:paymentId` handler (update)

**Implementation notes**:
- Load payment by paymentId from repository. Throw `NotFoundException` (404) if not found.
- Ownership check: `payment.travelerId` must equal JWT sub. Throw `ForbiddenException` (403) if not.
- Response DTO must NOT include `stripePaymentIntentId` or `stripePaymentMethodId`.
- Response SHALL contain: `paymentId`, `status`, `amount`, `currency`, `bookingId`, `travelerId`, `createdAt`, `updatedAt`.

**Acceptance Criteria**:

- AC-T10b-1: Returns 200 with payment data (without Stripe fields) for the authenticated owner.
- AC-T10b-2: Returns 403 if `payment.travelerId` does not match the caller's JWT sub.
- AC-T10b-3: Returns 404 when paymentId does not exist in the database.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T10b-1 | `src/application/use-cases/get-payment/get-payment.use-case.spec.ts` | `should return payment details without Stripe fields for the authenticated owner` | stripePaymentIntentId appears in response, or HTTP != 200 |
| AC-T10b-2 | `src/application/use-cases/get-payment/get-payment.use-case.spec.ts` | `should return 403 when traveler attempts to retrieve another traveler's payment` | HTTP 200 returned for unauthorized traveler |
| AC-T10b-3 | `src/application/use-cases/get-payment/get-payment.use-case.spec.ts` | `should throw NotFoundException when payment does not exist` | HTTP 200 returned for non-existent paymentId |

---

## T11 — Stripe Webhook Handler

**Description**: Implement `StripeWebhookController` which handles incoming Stripe webhook events. The route must use raw body (not parsed JSON) for HMAC signature verification. Handles `payment_intent.payment_failed` and `payment_intent.canceled`. No `stripe_webhook_events` table — deduplication is achieved by looking up the payment by `stripe_payment_intent_id` and checking `Payment.status` before applying any transition (OQ-1 resolved).

**Files affected**:
- `src/presentation/controllers/stripe-webhook.controller.ts` (create)
- `src/presentation/controllers/stripe-webhook.controller.spec.ts` (create)
- `src/app.module.ts` — configure raw body parsing for `/api/v1/webhooks/stripe` route only

**Implementation notes**:
- Route: `POST /api/v1/webhooks/stripe`
- No JWT guard on this route.
- Use `@RawBody()` or NestJS raw body middleware to get Buffer.
- Call `StripeClientService.constructWebhookEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET)`. On `StripeSignatureVerificationError` → return 400.
- **Deduplication strategy (no extra table)**: For each handled event, call `PaymentRepository.findByStripePaymentIntentId(stripePaymentIntentId)`. Before applying any state transition, check `payment.status`:
  - If payment is already in the target terminal state (FAILED for `payment_intent.payment_failed`, CANCELLED for `payment_intent.canceled`), return 200 immediately — no DB write, no Kafka publish.
  - If payment is in an unexpected state for the event (e.g. already CAPTURED when receiving `payment_intent.payment_failed`), log a warning and return 200 without transitioning.
- For `payment_intent.payment_failed`: if payment is AUTHORIZED, call `Payment.markFailed(failureReason)`, save, publish `PaymentFailed` to Kafka.
- For `payment_intent.canceled`: if payment is AUTHORIZED, call `Payment.markCancelled()`, save. No Kafka event for cancelled.
- All other event types: log at DEBUG level, return 200 (Stripe requires 200 for unhandled events to stop retrying).

**Acceptance Criteria**:

- AC-T11-1: Valid `payment_intent.payment_failed` webhook processes payment as FAILED and publishes `PaymentFailed`.
- AC-T11-2: Invalid Stripe-Signature returns HTTP 400.
- AC-T11-3: Duplicate webhook for already-FAILED payment returns 200 without re-processing (no second DB write, no second Kafka event).
- AC-T11-4: `payment_intent.canceled` transitions payment to CANCELLED without publishing Kafka event.
- AC-T11-5: No `stripe_webhook_events` table is created or queried — deduplication relies solely on `PaymentRepository.findByStripePaymentIntentId` + status check.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T11-1 | `src/presentation/controllers/stripe-webhook.controller.spec.ts` | `should process payment_intent.payment_failed and transition payment to FAILED` | Payment not saved as FAILED or no Kafka event |
| AC-T11-2 | `src/presentation/controllers/stripe-webhook.controller.spec.ts` | `should return 400 when Stripe-Signature is invalid` | 200 returned with invalid signature |
| AC-T11-3 | `src/presentation/controllers/stripe-webhook.controller.spec.ts` | `should idempotently return 200 for duplicate payment_intent.payment_failed without re-processing` | Duplicate Kafka event published or DB updated twice |
| AC-T11-4 | `src/presentation/controllers/stripe-webhook.controller.spec.ts` | `should transition to CANCELLED and not publish Kafka event on payment_intent.canceled` | Kafka event published for cancellation |
| AC-T11-5 | `src/presentation/controllers/stripe-webhook.controller.spec.ts` | `should not query any stripe_webhook_events table during webhook processing` | Any reference to stripe_webhook_events in handler code |

---

## T12 — Kafka Event Publisher

**Description**: Implement `PaymentEventPublisher` which serializes domain events to ADR-003 schema and publishes to the correct Kafka topics.

**Files affected**:
- `src/infrastructure/events/payment-event.publisher.ts` (create)
- `src/infrastructure/events/payment-event.publisher.spec.ts` (create)
- `src/infrastructure/events/payment.module.ts` (create)

**Topics**:
- `payment.authorized` — `PaymentAuthorized` events
- `payment.captured` — `PaymentCaptured` events
- `payment.refunded` — `PaymentRefunded` events
- `payment.failed` — `PaymentFailed` events

**Implementation notes**:
- Use `KafkaModule` from `@travel/shared`.
- Messages partitioned by `aggregateId` (paymentId) for ordering per payment.
- Each message key = `aggregateId`.
- `kafka_events_published_total` metric incremented on each successful publish.
- Publish failure throws and is caught by use cases (non-fatal at API layer per T08).

**Acceptance Criteria**:

- AC-T12-1: `PaymentAuthorized` event is published to `payment.authorized` topic with correct ADR-003 schema.
- AC-T12-2: Message key is set to `paymentId` for partition ordering.
- AC-T12-3: `kafka_events_published_total` counter is incremented with `event_type` label on each publish.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T12-1 | `src/infrastructure/events/payment-event.publisher.spec.ts` | `should publish PaymentAuthorized event with correct ADR-003 schema to payment.authorized topic` | Event schema is missing required fields |
| AC-T12-2 | `src/infrastructure/events/payment-event.publisher.spec.ts` | `should use paymentId as Kafka message key` | Message key is not set or is wrong value |
| AC-T12-3 | `src/infrastructure/events/payment-event.publisher.spec.ts` | `should increment kafka_events_published_total with event_type label` | Metric not incremented |

---

## T13 — Presentation Layer: Controllers, DTOs, Guards

**Description**: Implement all 6 REST controllers, request/response DTOs (with class-validator), JWT auth guard, RBAC guard, and global exception filter.

**Files affected**:
- `src/presentation/controllers/payment.controller.ts` (create)
- `src/presentation/controllers/payment.controller.spec.ts` (create)
- `src/presentation/controllers/payment-method.controller.ts` (create)
- `src/presentation/controllers/payment-method.controller.spec.ts` (create)
- `src/presentation/dto/create-payment.dto.ts` (create)
- `src/presentation/dto/capture-payment.dto.ts` (create)
- `src/presentation/dto/refund-payment.dto.ts` (create)
- `src/presentation/dto/attach-payment-method.dto.ts` (create)
- `src/presentation/guards/jwt-auth.guard.ts` (create)
- `src/presentation/guards/roles.guard.ts` (create)
- `src/presentation/filters/http-exception.filter.ts` (create)

**Endpoint → Use Case mapping**:

| Method + Path | Use Case | Guard |
|---|---|---|
| `POST /api/v1/payment-methods` | `AttachPaymentMethodUseCase` | JWT (Employee) |
| `GET /api/v1/payment-methods` | `ListPaymentMethodsUseCase` | JWT (Employee) |
| `DELETE /api/v1/payment-methods/:paymentMethodId` | `DetachPaymentMethodUseCase` | JWT (Employee) |
| `POST /api/v1/payments` | `AuthorizePaymentUseCase` | JWT (Employee) |
| `POST /api/v1/payments/:paymentId/capture` | `CapturePaymentUseCase` | JWT (Employee/ownership) |
| `POST /api/v1/payments/:paymentId/refund` | `RefundPaymentUseCase` | JWT (Employee/ownership) |

**Implementation notes**:
- `POST /api/v1/payments`: extract `Idempotency-Key` header; return 400 if missing.
- Response DTOs must NOT include `stripePaymentMethodId` in any payment method response.
- Global exception filter formats errors per PROJECT.md §9 error response schema.
- `X-Correlation-ID` header extracted in middleware and stored in `AsyncLocalStorage` / NestJS `REQUEST` scope.

**Acceptance Criteria**:

- AC-T13-1: `POST /api/v1/payments` returns 400 if `Idempotency-Key` header is missing.
- AC-T13-2: Unauthenticated requests to any endpoint (except webhook) return 401.
- AC-T13-3: Error responses follow the PROJECT.md error schema `{ error, message, details, correlationId, timestamp }`.
- AC-T13-4: `GET /api/v1/payment-methods` response never contains `stripePaymentMethodId`.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T13-1 | `src/presentation/controllers/payment.controller.spec.ts` | `should return 400 when Idempotency-Key header is missing` | HTTP 201 returned without header |
| AC-T13-2 | `src/presentation/controllers/payment.controller.spec.ts` | `should return 401 when JWT token is missing` | HTTP 201 returned without token |
| AC-T13-3 | `src/presentation/filters/http-exception.filter.spec.ts` | `should format error response with correlationId and timestamp` | Error response missing correlationId or timestamp |
| AC-T13-4 | `src/presentation/controllers/payment-method.controller.spec.ts` | `should not include stripePaymentMethodId in GET /payment-methods response` | stripePaymentMethodId in response body |

---

## T14 — Observability Instrumentation

**Description**: Instrument the service with all required Prometheus metrics, OTel traces, and PCI-DSS-compliant log sanitization.

**Files affected**:
- `src/infrastructure/observability/metrics.service.ts` (create)
- `src/infrastructure/observability/tracing.ts` (create)
- `src/infrastructure/logging/logger.service.ts` (create)
- `src/infrastructure/logging/log-sanitizer.ts` (create)
- `src/infrastructure/logging/log-sanitizer.spec.ts` (create)

**Required Prometheus metrics** (all must be registered):

| Metric Name | Type | Labels |
|---|---|---|
| `http_requests_total` | Counter | method, route, status_code |
| `http_request_duration_seconds` | Histogram | method, route |
| `stripe_api_calls_total` | Counter | operation, outcome |
| `stripe_api_errors_total` | Counter | operation, error_type |
| `payments_created_total` | Counter | currency |
| `payments_captured_total` | Counter | currency |
| `payments_refunded_total` | Counter | currency |
| `circuit_state` | Gauge | service |
| `circuit_breaker_errors_total` | Counter | service |
| `retry_count` | Counter | operation, outcome |
| `kafka_events_published_total` | Counter | topic, event_type |
| `db_query_duration_seconds` | Histogram | operation |

**Log sanitizer**: strip fields matching: `cardNumber`, `card_number`, `pan`, `cvv`, `cvc`, `stripeSecretKey`, `stripe_secret_key`, `STRIPE_SECRET_KEY` from any log context object before writing.

**OTel tracing**: Instrument HTTP requests, Stripe calls, DB queries, Kafka publishes with child spans. Propagate `X-Correlation-ID` as trace ID.

**Acceptance Criteria**:

- AC-T14-1: All 12 Prometheus metrics are registered and scrapeable at `GET /metrics`.
- AC-T14-2: Log sanitizer strips `cardNumber`, `cvv`, `cvc`, `stripeSecretKey` from log context.
- AC-T14-3: `X-Correlation-ID` appears in all log entries during a request.
- AC-T14-4: `circuit_state` gauge is updated to 1 when circuit opens and 0 when closed.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T14-1 | `src/infrastructure/observability/metrics.service.spec.ts` | `should register all 12 required Prometheus metrics` | Any metric is missing from /metrics output |
| AC-T14-2 | `src/infrastructure/logging/log-sanitizer.spec.ts` | `should strip cardNumber, cvv, cvc, and stripeSecretKey from log context objects` | Sensitive field appears in sanitized output |
| AC-T14-3 | `src/presentation/controllers/payment.controller.spec.ts` | `should propagate X-Correlation-ID to all log entries within a request scope` | Log entry missing correlationId |
| AC-T14-4 | `src/infrastructure/stripe/stripe-client.service.spec.ts` | `should set circuit_state gauge to 1 when circuit opens and 0 when circuit closes` | circuit_state not updated |

---

## T15 — Integration Tests (Testcontainers + Stripe Test Mode)

**Description**: Implement integration tests that run against a real PostgreSQL 15 database (via Testcontainers) and a Stripe mock (using `stripe-mock` or Stripe test mode SDK). Tests cover all 6 endpoints plus the webhook handler.

**Files affected**:
- `test/integration/payment.integration.spec.ts` (create)
- `test/integration/payment-method.integration.spec.ts` (create)
- `test/integration/migrations.integration.spec.ts` (create)
- `test/integration/test-setup.ts` (create) — Testcontainers setup/teardown

**Test scenarios to cover**:

**Payment flow (happy path)**:
1. Attach payment method → `POST /payment-methods` → 201
2. Authorize payment → `POST /payments` → 201 (AUTHORIZED)
3. Capture payment → `POST /payments/:id/capture` → 200 (CAPTURED)
4. Assert `PaymentCaptured` Kafka message published

**Idempotency**:
5. Repeat `POST /payments` with same `Idempotency-Key` → 200 (not 201, no duplicate record)

**Refund flow**:
6. Refund captured payment → `POST /payments/:id/refund` → 200 (REFUNDED)

**State machine violations**:
7. Attempt to capture CAPTURED payment → 409
8. Attempt to refund AUTHORIZED payment → 409

**Ownership enforcement**:
9. Traveler B cannot capture Traveler A's payment → 403

**PCI-DSS**:
10. Assert `stripePaymentMethodId` never appears in any API response
11. Assert no log entry contains raw card data

**Acceptance Criteria**:

- AC-T15-1: Full payment lifecycle (attach → authorize → capture) succeeds against real PostgreSQL.
- AC-T15-2: Duplicate `Idempotency-Key` returns 200 and does not create duplicate DB record.
- AC-T15-3: Invalid state transitions return 409.
- AC-T15-4: `stripePaymentMethodId` never appears in any response body.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T15-1 | `test/integration/payment.integration.spec.ts` | `should complete full payment lifecycle: attach → authorize → capture` | Any step returns non-2xx |
| AC-T15-2 | `test/integration/payment.integration.spec.ts` | `should return 200 with existing payment on duplicate Idempotency-Key` | Second request returns 201 or creates duplicate |
| AC-T15-3 | `test/integration/payment.integration.spec.ts` | `should return 409 on invalid state transitions` | 200 returned for invalid transition |
| AC-T15-4 | `test/integration/payment-method.integration.spec.ts` | `should not return stripePaymentMethodId in any response` | stripePaymentMethodId found in response |

---

## T16 — End-to-End Wiring, Smoke Test, Coverage Verification

**Description**: Wire all modules together in `AppModule`, run a smoke test to verify the service starts and responds correctly, and verify test coverage meets the 80% threshold.

**Files affected**:
- `src/app.module.ts` — finalize module wiring (update)
- `src/main.ts` — finalize global pipes, guards, filters, CORS (update)
- `jest.config.ts` (create / update) — configure coverage threshold at 80%
- `services/payment-service/README.md` (create) — local development setup instructions

**Module wiring checklist**:
- [ ] `ConfigModule` (global)
- [ ] `TypeOrmModule` (with migrations auto-run disabled; use `npm run migration:run`)
- [ ] `StripeModule`
- [ ] `KafkaModule` (from `@travel/shared`)
- [ ] `PaymentModule` (controllers + use cases + repositories)
- [ ] `PaymentMethodModule`
- [ ] `ObservabilityModule` (metrics, tracing)

**Acceptance Criteria**:

- AC-T16-1: `npm run start:dev` starts successfully; `GET /health` returns 200.
- AC-T16-2: `npm run test:coverage` reports ≥ 80% statement coverage.
- AC-T16-3: `npm run lint` passes with zero errors.
- AC-T16-4: `npm run type-check` passes with zero TypeScript errors.
- AC-T16-5: `POST /api/v1/payments` with a valid JWT and test Stripe key returns 201 in Stripe test mode.

**Verification artifacts**:

| AC | Test File | Test Case | Must Fail If |
|---|---|---|---|
| AC-T16-1 | `test/integration/payment.integration.spec.ts` | `should return 200 from GET /health` | Service does not start or health check fails |
| AC-T16-2 | CI coverage report (`npm run test:coverage`) | Coverage threshold: 80% | Coverage drops below 80% |
| AC-T16-3 | CI lint step (`npm run lint`) | Zero lint errors | Any ESLint error in source files |
| AC-T16-4 | CI type-check step (`npm run type-check`) | Zero TypeScript errors | Any TS compilation error |
| AC-T16-5 | `test/integration/payment.integration.spec.ts` | `should return 201 for POST /payments with valid JWT and Stripe test key` | HTTP != 201 in Stripe test mode |
