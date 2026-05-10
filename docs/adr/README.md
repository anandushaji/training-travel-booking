# Architecture Decision Records (ADRs)

This folder holds the project's Architecture Decision Records.

- **Filename format**: `ADR-NNN-<kebab-case-title>.md` (e.g.
  `ADR-001-use-kafka-for-events.md`).
- **Governance rules**: see `../architecture/adr-discipline.md`.
- **When a new ADR is required**: see
  `../architecture/microservice-patterns.md`, section "Patterns that
  require an ADR before use".

---

## Index

| ADR | Title | Status | File |
|-----|-------|--------|------|
| ADR-001 | Architecture Style - Domain-Driven Design with Microservices | Approved | [ADR-001-Architecture-Style.md](ADR-001-Architecture-Style.md) |
| ADR-002 | Technology Stack Selection | Approved | [ADR-002-Technology-Stack.md](ADR-002-Technology-Stack.md) |
| ADR-003 | Communication Patterns Between Services | Approved | [ADR-003-Communication-Patterns.md](ADR-003-Communication-Patterns.md) |
| ADR-004 | Data Management Strategy | Approved | [ADR-004-Data-Management.md](ADR-004-Data-Management.md) |
| ADR-005 | Security Model | Approved | [ADR-005-Security-Model.md](ADR-005-Security-Model.md) |
| ADR-006 | API Gateway Pattern | Approved | [ADR-006-API-Gateway-Pattern.md](ADR-006-API-Gateway-Pattern.md) |
| ADR-007 | Monitoring & Observability | Approved | [ADR-007-Monitoring-Observability.md](ADR-007-Monitoring-Observability.md) |
| ADR-008 | Non-Functional Requirements | Approved | [ADR-008-Non-Functional-Requirements.md](ADR-008-Non-Functional-Requirements.md) |
| ADR-009 | Deployment Strategy | Approved | [ADR-009-Deployment-Strategy.md](ADR-009-Deployment-Strategy.md) |
| ADR-010 | Testing Strategy | Approved | [ADR-010-Testing-Strategy.md](ADR-010-Testing-Strategy.md) |
| ADR-011 | Error Handling & Resilience | Approved | [ADR-011-Error-Handling-Resilience.md](ADR-011-Error-Handling-Resilience.md) |
| ADR-012 | Development Workflow | Approved | [ADR-012-Development-Workflow.md](ADR-012-Development-Workflow.md) |
| ADR-013 | Dependency Management | Approved | [ADR-013-Dependency-Management.md](ADR-013-Dependency-Management.md) |

---

## Architecture Diagrams

Full diagrams are documented in [Architecture-Diagrams.md](../architecture/Architecture-Diagrams.md) (C4 model + technical views).

### Diagram Inventory

| Diagram | View | File |
|---------|------|------|
| System Context | C4 Level 1 — actors & external systems | `diagrams/system-context-diagram.png` |
| Container Diagram | C4 Level 2 — services, databases, messaging | `diagrams/container-diagram.png` |
| Booking Service Components | C4 Level 3 — DDD layers | `diagrams/services/booking-service-components.png` |
| Policy Service Components | C4 Level 3 | `diagrams/services/policy-service-components.png` |
| Payment Service Components | C4 Level 3 — incl. Stripe ACL | `diagrams/services/payment-service-components.png` |
| Technical Architecture | Full stack (frontend → infra) | `diagrams/architecture-diagram.png` |
| Booking Flow (Saga) | Data flow — happy path | `diagrams/flows/booking-flow-saga-pattern.png` |
| Saga Compensation Flow | Data flow — failure/rollback | `diagrams/flows/saga-compensation-flow-failure-scenario.png` |
| Kubernetes Deployment | Deployment architecture | `kubernetes-deployment.png` |
| Network Segmentation | Network / security zones | `diagrams/network-segmentation.png` |
| Monitoring Dashboard | Observability stack | `diagrams/dashboard-architecture.png` |

### Key Technology Summary

| Container | Technology | Port | Purpose |
|-----------|------------|------|---------|
| React SPA | React 18 + TypeScript | 3000 | User interface |
| API Gateway | NestJS + Express | 4000 | Auth, routing, rate limiting |
| Booking Service | NestJS + TypeScript | 3001 | Core booking logic |
| Policy Service | NestJS + TypeScript | 3002 | Policy validation |
| Traveler Service | NestJS + TypeScript | 3003 | Employee management |
| Payment Service | NestJS + TypeScript | 3004 | Payment processing |
| Inventory Service | NestJS + TypeScript | 3005 | Flight search |
| Expense Service | NestJS + TypeScript | 3006 | Expense tracking |
| PostgreSQL | PostgreSQL 15 | 5432–5437 | Transactional data |
| MongoDB | MongoDB 7 | 27017 | Document storage |
| Kafka | Apache Kafka 3 | 9092 | Event streaming |
| Redis | Redis 7 | 6379 | Caching |
