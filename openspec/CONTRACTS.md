# @travel/shared — Exported Types Contracts

This file is the canonical registry of every named export from the `@travel/shared` package.
It is updated as part of T12 (Barrel Export) and must stay in sync with `packages/shared/src/index.ts`.

## Base Classes

| Symbol | Source File | Description |
|---|---|---|
| `ValueObject` | `src/base-classes/value-object.base.ts` | Abstract base for domain value objects with structural equality and frozen props |
| `Entity` | `src/base-classes/entity.base.ts` | Abstract base for domain entities with identity equality via `id` |
| `AggregateRoot` | `src/base-classes/aggregate-root.base.ts` | Extends `Entity`; manages uncommitted domain events, version, and handler dispatch |

## Domain Event

| Symbol | Source File | Description |
|---|---|---|
| `DomainEvent` | `src/domain-event/domain-event.base.ts` | Abstract base for all domain events; auto-populates `eventId`, `occurredOn`, `correlationId`, `causationId` |
| `DomainEventProps` | `src/domain-event/domain-event.base.ts` | Constructor props interface for `DomainEvent` |

## Value Objects

| Symbol | Source File | Description |
|---|---|---|
| `Currency` | `src/value-objects/currency.enum.ts` | Enum of supported ISO 4217 currency codes (USD, EUR, GBP, INR, AED, SGD, JPY, CAD, AUD) |
| `Money` | `src/value-objects/money.vo.ts` | Immutable monetary value object with arithmetic (`add`, `subtract`, `multiply`) and currency guard |
| `TypedId` | `src/value-objects/typed-id.vo.ts` | Abstract type-safe UUID wrapper with `generate()` and `from()` static factories |
| `BookingId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Booking aggregates |
| `TravelerId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Traveler aggregates |
| `PolicyId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Policy aggregates |
| `HotelId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Hotel aggregates |
| `FlightId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Flight aggregates |
| `CarId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Car rental aggregates |
| `InvoiceId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Invoice aggregates |
| `ApprovalId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Approval aggregates |
| `ExpenseId` | `src/value-objects/typed-id.vo.ts` | Concrete `TypedId` for Expense aggregates |

## Exceptions

| Symbol | Source File | Description |
|---|---|---|
| `DomainException` | `src/exceptions/domain.exception.ts` | Root exception; carries `code`, `statusCode`, optional `context` |
| `ValidationException` | `src/exceptions/validation.exception.ts` | 422 — input fails domain validation rules |
| `NotFoundException` | `src/exceptions/not-found.exception.ts` | 404 — aggregate not found in repository |
| `ConflictException` | `src/exceptions/conflict.exception.ts` | 409 — state conflict (e.g. duplicate resource) |
| `InsufficientFundsException` | `src/exceptions/insufficient-funds.exception.ts` | 422 — monetary subtraction exceeds available amount |
| `CurrencyMismatchException` | `src/exceptions/currency-mismatch.exception.ts` | 422 — arithmetic or comparison across different currencies |

## Interfaces

| Symbol | Source File | Description |
|---|---|---|
| `IRepository` | `src/interfaces/repository.interface.ts` | Generic repository contract: `save`, `findById`, `findAll`, `delete` |
| `IUseCase` | `src/interfaces/use-case.interface.ts` | Generic use-case contract: `execute(input): Promise<output>` |

## Utilities

| Symbol | Source File | Description |
|---|---|---|
| `generateUuid` | `src/utils/uuid.util.ts` | Returns a new UUID v4 string |
| `isValidUuid` | `src/utils/uuid.util.ts` | Returns `true` if the string matches the RFC-4122 v4 pattern |
| `toISOString` | `src/utils/date.util.ts` | Converts a `Date` to an ISO 8601 string |
| `fromISOString` | `src/utils/date.util.ts` | Parses an ISO 8601 string to `Date`; throws `ValidationException(INVALID_DATE)` on failure |
| `isValidDate` | `src/utils/date.util.ts` | Returns `true` for a valid `Date` instance |

## Kafka Module

| Symbol | Source File | Description |
|---|---|---|
| `KafkaModule` | `src/modules/kafka/kafka.module.ts` | Dynamic NestJS module; registers `KAFKA_PRODUCER` and `KAFKA_CONSUMER` injection tokens |
| `KafkaModuleOptions` | `src/modules/kafka/kafka.module.ts` | Options interface for `KafkaModule.register()` |
| `KAFKA_PRODUCER` | `src/modules/kafka/kafka.constants.ts` | NestJS injection token for the Kafka producer |
| `KAFKA_CONSUMER` | `src/modules/kafka/kafka.constants.ts` | NestJS injection token for the Kafka consumer |

---

## Pact V3 Consumer Contracts

### frontend ↔ booking-service

| Consumer | Provider | Interaction | Pact file |
|---|---|---|---|
| `frontend` | `booking-service` | `POST /bookings` → 201 Booking (PENDING) | `pacts/frontend-booking-service.json` |

**Spec file:** `src/features/booking/__tests__/contracts/bookingApi.contract.spec.ts`

**Contract states:**
- `traveler is authenticated and flight offer exists` — provider must have an accessible flight offer and accept the CreateBookingRequest body

**Key constraints:**
- Request body must include `travelerId`, `flightOfferId`, `itinerary`, `paymentMethod`
- Response must include `id`, `travelerId`, `flightOfferId`, `status: 'PENDING'`, `itinerary`, `totalAmount`, `currency`, `createdAt`, `updatedAt`

---

### frontend ↔ traveler-service

| Consumer | Provider | Interaction | Pact file |
|---|---|---|---|
| `frontend` | `traveler-service` | `GET /travelers/:id` → 200 TravelerProfile | `pacts/frontend-traveler-service.json` |

**Spec file:** `src/features/profile/__tests__/contracts/travelerApi.contract.spec.ts`

**Contract states:**
- `a traveler with the given ID exists` — provider must have a traveler with the given UUID

**Key constraints:**
- Authorization header with Bearer token required
- Response must include `id`, `employeeId`, `email`, `firstName`, `lastName`, `fullName`, `department`

---

### frontend ↔ expense-service

| Consumer | Provider | Interaction | Pact file |
|---|---|---|---|
| `frontend` | `expense-service` | `GET /receipts/:id` → 200 Receipt | `pacts/frontend-expense-service.json` |

**Spec file:** `src/features/expenses/__tests__/contracts/expenseApi.contract.spec.ts`

**Contract states:**
- `a receipt with the given ID exists` — provider must have a receipt with the given UUID

**Key constraints:**
- Authorization header with Bearer token required
- Response must include `id`, `receiptNumber`, `bookingId`, `amount`, `currency`, `pdfUrl`

---

## traveler-service — Public API Contracts

OpenAPI spec: `docs/contracts/openapi/openapi-traveler-service.yaml`  
Service port: 3003

### REST Endpoints

| Method | Path | Auth Roles | Description |
|---|---|---|---|
| GET | `/travelers` | EMPLOYEE, MANAGER, ADMIN | List active traveler profiles (paginated, soft-deleted excluded) |
| POST | `/travelers` | MANAGER, ADMIN | Create a new traveler profile |
| GET | `/travelers/:travelerId` | EMPLOYEE, MANAGER, ADMIN | Get traveler profile by ID |
| PATCH | `/travelers/:travelerId` | MANAGER, ADMIN | Update traveler profile fields |
| DELETE | `/travelers/:travelerId` | ADMIN | Soft-delete a traveler profile |
| GET | `/travelers/:travelerId/preferences` | EMPLOYEE (own only), MANAGER, ADMIN | Get traveler preferences |
| PUT | `/travelers/:travelerId/preferences` | EMPLOYEE (own only), MANAGER, ADMIN | Replace traveler preferences |
| POST | `/travelers/sync` | ADMIN | Bulk HR upsert (idempotent by employeeId) |
| GET | `/admin/travelers` | ADMIN | List all travelers including soft-deleted |

### Kafka Events Published

| Topic | Event Type | Version | Partition Key | Description |
|---|---|---|---|---|
| `traveler.created` | `TravelerCreated` | `"1"` | `travelerId` | Emitted on successful traveler profile creation |
| `traveler.updated` | `TravelerUpdated` | `"1"` | `travelerId` | Emitted on profile update or preferences update |
| `traveler.deleted` | `TravelerDeleted` | `"1"` | `travelerId` | Emitted on soft-delete |

### Error Response Shape

```json
{
  "error": "TravelerNotFound",
  "message": "Traveler <id> not found",
  "details": [],
  "correlationId": "uuid",
  "timestamp": "ISO 8601"
}
```
