# Domain-Driven Design (DDD)

This folder contains the DDD architecture documentation for the Corporate Travel Portal.

- **Full document**: [DDD-Architecture.md](DDD-Architecture.md)
- **Version**: 2.0 — May 2026

---

## Ubiquitous Language (Key Terms)

| Term | Definition |
|------|------------|
| **Traveler** | An employee who can book travel |
| **Booking** | A confirmed trip reservation |
| **Policy** | Rules governing travel bookings |
| **Budget** | Allocated travel spend per department |
| **Itinerary** | Travel route and schedule |
| **Offer** | A flight option from Amadeus |
| **Reservation** | Temporary hold on flight inventory |
| **Payment** | Financial transaction |
| **Receipt** | Proof of payment document |
| **Expense** | Travel cost to be reported |
| **Saga** | Distributed transaction workflow |
| **Policy Violation** | Breach of travel policy |

---

## Bounded Contexts

| Context | Type | Service | Responsibility |
|---------|------|---------|----------------|
| Booking | Core Domain | `booking-service` | Trip reservation, saga orchestration |
| Policy | Core Domain | `policy-service` | Travel rules and budget enforcement |
| Traveler | Supporting | `traveler-service` | Employee profiles and preferences |
| Payment | Supporting | `payment-service` | Payment processing via Stripe |
| Inventory | Generic | `inventory-service` | Flight search via Amadeus API |
| Expense | Supporting | `expense-service` | Expense tracking and receipt generation |

**Integration patterns used**: Anticorruption Layer (ACL), Shared Language, Open Host Service, Conformist.

---

## Architectural Patterns

| Pattern | Where applied |
|---------|--------------|
| DDD Layered Architecture | All services (Presentation → Application → Domain → Infrastructure) |
| Aggregate Root | `Booking`, `Policy`, `Traveler`, `Payment` |
| Repository Pattern | All domain aggregates |
| CQRS | Booking and Policy contexts |
| Saga (Choreography) | Booking flow: Search → Reserve → Validate Policy → Pay → Confirm |
| Anticorruption Layer | Amadeus API, Stripe API |
| Domain Events | Inter-service async communication via Kafka |

---

## Document Sections

| Section | Topic |
|---------|-------|
| 1 | [Executive Summary](DDD-Architecture.md#1-executive-summary) — system overview, tech stack, capabilities |
| 2 | [Domain Model Overview](DDD-Architecture.md#2-domain-model-overview) — ubiquitous language, relationships |
| 3 | [Bounded Contexts](DDD-Architecture.md#3-bounded-contexts) — context map, definitions |
| 4 | [Domain Models (Detailed)](DDD-Architecture.md#4-domain-models-detailed) — aggregates, entities, value objects |
| 5 | [Application Architecture](DDD-Architecture.md#5-application-architecture) — layered structure |
| 6 | [C4 Architecture Diagrams](DDD-Architecture.md#6-c4-architecture-diagrams) — visual views |
| 7 | [Technical Implementation](DDD-Architecture.md#7-technical-implementation) — code patterns |
| 8 | [Folder Structure](DDD-Architecture.md#8-folder-structure) — project layout |
| 9 | [Docker Architecture](DDD-Architecture.md#9-docker-architecture) — container setup |
| 10 | [API Design (Contract-First)](DDD-Architecture.md#10-api-design-contract-first) — OpenAPI specs |
| 11 | [Event-Driven Architecture](DDD-Architecture.md#11-event-driven-architecture) — Kafka topics and events |
| 12 | [Data Architecture](DDD-Architecture.md#12-data-architecture) — database-per-service |
| 13 | [Observability & Monitoring](DDD-Architecture.md#13-observability--monitoring) — metrics, logs, traces |
| 14 | [Best Practices](DDD-Architecture.md#14-best-practices) — DDD guidelines |

---

## Related Documentation

- ADRs: [`../adr/`](../adr/README.md)
- Microservice patterns: [`../architecture/microservice-patterns.md`](../architecture/microservice-patterns.md)
- OpenAPI contracts: [`../contracts/openapi/`](../contracts/openapi/)
