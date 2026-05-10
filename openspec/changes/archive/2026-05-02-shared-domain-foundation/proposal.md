# Proposal: Shared Domain Foundation

## Change ID
`shared-domain-foundation`

## Sub-module
`SM-01` — Wave 1 (no prerequisites)

## Summary

Create the `@travel/shared` npm workspace package — a zero-infrastructure TypeScript library that provides every Domain-Driven Design building block that all six microservices (`booking-service`, `policy-service`, `traveler-service`, `payment-service`, `inventory-service`, `expense-service`) will depend on.

Without this package, each service would independently define base classes (`AggregateRoot`, `Entity`, `ValueObject`, `DomainEvent`), utility functions, exception types, and Kafka wiring — producing divergent implementations and cross-cutting inconsistencies.

---

## Problem Statement

The Corporate Travel Portal is a greenfield system with six microservices sharing a common DDD architecture. Each service must implement:

- Domain base classes (`AggregateRoot`, `Entity`, `ValueObject`, `DomainEvent`)
- Typed domain ID wrappers (`BookingId`, `TravelerId`, `PaymentId`, …)
- A `Money` value object with safe arithmetic
- A shared exception hierarchy mapped to HTTP status codes
- UUID and date utility functions
- A `KafkaModule` dynamic NestJS module for Kafka producer/consumer injection
- Generic `IRepository<T, ID>` and `IUseCase<TInput, TOutput>` interfaces

Duplicating these across six services creates maintenance risk, behavioural divergence, and unnecessary test overhead. A single shared package enforces consistency at the type level.

---

## Proposed Solution

Introduce `packages/shared/` as an npm workspace package named `@travel/shared`. The package exposes:

| Export category | Symbols |
|---|---|
| Base classes | `AggregateRoot`, `Entity`, `ValueObject` |
| Domain event | `DomainEvent` (abstract) |
| Value objects | `Money`, `TypedId`, `BookingId`, `TravelerId`, `OfferId`, `PaymentId`, `ReservationId`, `PolicyId`, `PolicyValidationId`, `ReceiptId`, `ExpenseId` |
| Currency | `Currency` enum (ISO 4217 subset) |
| Interfaces | `IRepository<T, ID>`, `IUseCase<TInput, TOutput>` |
| Kafka | `KafkaModule` (NestJS `DynamicModule`), `KAFKA_PRODUCER`, `KAFKA_CONSUMER` |
| Exceptions | `DomainException`, `ValidationException`, `NotFoundException`, `ConflictException`, `InsufficientFundsException`, `CurrencyMismatchException` |
| Utilities | `generateUuid`, `isValidUuid`, `toISOString`, `fromISOString`, `isValidDate` |

All symbols are re-exported via a single barrel (`src/index.ts`). No database, no HTTP server, no runtime infrastructure — pure TypeScript.

---

## Scope

**In scope:**
- `packages/shared/` package scaffold (npm workspace, `tsconfig.json`, Jest config)
- All base classes, value objects, interfaces, exceptions, utilities, and `KafkaModule` listed above
- Unit tests co-located in `packages/shared/test/unit/` (90% branch coverage enforced)
- Barrel export and build verification (`dist/index.js`, `dist/index.d.ts`)
- `openspec/CONTRACTS.md` updated with the `@travel/shared` exported-types table

**Out of scope:**
- Any service-specific aggregates, entities, or use cases (those belong to SM-02 through SM-07)
- Outbox relay, Saga orchestration, CQRS read models (deferred to consuming service specs)
- Database schemas or migrations (SM-01 owns no database)
- Frontend code

---

## Architecture Impact

- **New package**: `packages/shared/` — no existing code is modified
- **Repository root**: `package.json` gains `"workspaces": ["packages/*", "services/*", "api-gateway"]`; `tsconfig.base.json` is introduced as the strict TypeScript root config
- **Consuming services**: import from `'@travel/shared'` via workspace symlink; no network fetch required
- **Pattern selection**: No microservice patterns apply (no DB, no outbound calls, no Kafka publishing at this layer)

---

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Circular dependencies between base classes | Enforced by `madge --circular` in CI (T12) |
| Divergent ID types across services | All nine concrete `TypedId` subclasses are defined here; services cannot define their own |
| `Currency` enum becomes a bottleneck when new currencies are needed | Enum is extended in this package; adding a currency requires a patch release of `@travel/shared` — documented in `design.md` |
| `instanceof` failures for exceptions under CommonJS/ES5 transpilation | `Object.setPrototypeOf(this, new.target.prototype)` applied in every exception constructor (T06) |

---

## Open Questions

All questions have been decided. See the Decision Log in `design.md`.

| Question | Decision |
|---|---|
| `TypedId` access pattern | `.value` is canonical; `.toString()` is a serialization alias |
| `Money` currency type | TypeScript `Currency` enum of known ISO 4217 codes |
| `KafkaModule` scope | Explicit import per consuming module; no `@Global()` |
| `IRepository` signature | Include `findAll(filter?: Partial<T>): Promise<T[]>` in base interface |

---

## Linked Artifacts

| Artifact | Path |
|---|---|
| Design | `openspec/changes/shared-domain-foundation/design.md` |
| Delta spec | `openspec/changes/shared-domain-foundation/specs/shared-domain-foundation/spec.md` |
| Tasks | `openspec/changes/shared-domain-foundation/tasks.md` |

---

## Definition of Done

- [ ] All 13 tasks (T01–T13) are implemented and checked off in `tasks.md`
- [ ] `npm run build` exits `0` and emits `dist/index.js` + `dist/index.d.ts`
- [ ] `npm test` passes with ≥ 90% branch coverage
- [ ] `madge --circular packages/shared/src` reports zero circular dependencies
- [ ] `openspec/CONTRACTS.md` lists every named export from `@travel/shared`
- [ ] Change is archived to `openspec/changes/archive/`
