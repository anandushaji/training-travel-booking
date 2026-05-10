# ADR-004 Amendment 01: Inventory Service Database Selection

**Status**: Accepted
**Date**: 2026-05-02
**Amends**: ADR-004 Data Management Strategy
**Decision Makers**: Architecture Team
**Context Change**: SM-04 Inventory Service implementation scope

---

## Context

ADR-004 (Data Management Strategy) assigns MongoDB 7 to the `inventory-service` with rationale: "Flexible schema for flight data". The SM-04 feature decomposition (`docs/decomposition/corporate-travel-portal-backend.md`) specifies MongoDB collections `flight_offers` and `reservations`.

During SM-04 spec generation, the team determined that:

1. **Flight offers are not persisted** — Amadeus search results are ephemeral (cached in Redis for 5 min, never written to MongoDB or PostgreSQL). The flexible-schema rationale for MongoDB applied to persisting offer documents, which this scope does not do.
2. **Only `FlightReservation` aggregates are persisted** — These contain structured, relational data (passenger details, flight segment, status enum, timestamps) with fixed schema. PostgreSQL with TypeORM is the correct choice.
3. **MongoDB introduces operational overhead** for zero benefit in this scope — an additional database cluster to provision, monitor, back up, and tune for a service that only persists relational reservation records.

---

## Decision

**PostgreSQL 15 is adopted for `inventory-service`** in place of MongoDB 7, effective SM-04.

The ADR-004 table row for `inventory-service` is amended from:

| Service | Database | Type | Rationale |
|---------|----------|------|-----------|
| ~~Inventory~~ | ~~MongoDB 7~~ | ~~NoSQL~~ | ~~Flexible schema for flight data~~ |

To:

| Service | Database | Type | Rationale |
|---------|----------|------|-----------|
| Inventory | PostgreSQL 15 | SQL | `FlightReservation` aggregates have fixed relational schema; Amadeus flight offers are not persisted (ephemeral cache). PostgreSQL ACID guarantees and TypeORM toolchain simplify implementation and operations. |

---

## Consequences

### Positive
- No additional MongoDB cluster required in development, staging, or production environments.
- TypeORM 0.3.x used consistently across all services.
- Simpler operational story (one database technology for all services).

### Negative
- If a future scope requires persisting Amadeus offer documents with flexible schema (e.g., multi-source GDS aggregation), a MongoDB instance will need to be provisioned at that point.

---

## Future Work

If SM-04 scope is extended to persist flight offer documents (e.g., for offline search replay, price history, or multi-GDS aggregation), a MongoDB 7 instance should be provisioned at that time and this amendment superseded.

---

## Approved By

- Lead Architect: ✅
- Engineering Manager: ✅

**Effective**: 2026-05-02
