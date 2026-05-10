# ADR-001: Architecture Style - Domain-Driven Design with Microservices

**Status**: Approved  
**Date**: 2026-05-01  
**Decision Makers**: Architecture Team, Engineering Leadership  
**Stakeholders**: Engineering Team, Product Team, Operations Team

---

## Context

The Corporate Travel Portal requires an architecture that can:
- Handle complex business logic for travel booking, policy enforcement, and budget management
- Scale independently across different business capabilities
- Support rapid feature development and deployment
- Maintain high availability and fault tolerance
- Enable team autonomy and parallel development

We evaluated three architectural approaches:
1. **Monolithic Architecture**: Single deployable unit
2. **Microservices with Transaction Script**: Services organized around technical capabilities
3. **Domain-Driven Design (DDD) with Microservices**: Services organized around business domains

---

## Decision

**We will adopt Domain-Driven Design (DDD) with Microservices architecture.**

The system will be decomposed into 6 microservices aligned with bounded contexts:

1. **Booking Service** (Core Domain)
2. **Policy Service** (Core Domain)
3. **Traveler Service** (Supporting Domain)
4. **Payment Service** (Supporting Domain)
5. **Inventory Service** (Generic Domain)
6. **Expense Service** (Supporting Domain)

Each service will:
- Own its database (database-per-service pattern)
- Implement DDD tactical patterns (Aggregates, Entities, Value Objects, Domain Services)
- Communicate via events (Kafka) and APIs (REST/gRPC)
- Be independently deployable
- Have clear bounded contexts with explicit integration patterns

---

## Rationale

### Why DDD?

**Business Complexity Alignment**:
- Travel booking involves complex business rules (policies, budgets, approvals)
- DDD provides patterns to model and manage this complexity
- Ubiquitous language ensures alignment between business and technical teams
- Bounded contexts prevent model contamination

**Example**: The term "Booking" means different things in different contexts:
- In Booking Context: A trip reservation with saga orchestration
- In Expense Context: A line item for reporting
- In Policy Context: A validation target

DDD bounded contexts keep these meanings separate and explicit.

**Long-term Maintainability**:
- Business logic lives in domain layer, isolated from infrastructure
- Changes to business rules are localized to domain models
- Testing is easier with pure domain logic

### Why Microservices?

**Independent Scalability**:
- Search/inventory service needs different scaling than payment service
- Can scale services based on actual load patterns

**Team Autonomy**:
- 5.5 FTE team can work on different services in parallel
- Reduces coordination overhead
- Enables faster feature delivery

**Technology Flexibility**:
- Can use different databases per service (PostgreSQL for transactional, MongoDB for document storage)
- Can upgrade Node.js version per service without system-wide migration

**Failure Isolation**:
- Payment service failure doesn't bring down search functionality
- Circuit breakers prevent cascading failures

### Why Not Monolith?

**Against Monolithic**:
- ❌ Entire system must scale as one unit (wasteful)
- ❌ Single point of failure
- ❌ Requires team-wide coordination for deployments
- ❌ Technology stack locked in
- ❌ Database becomes a bottleneck
- ❌ Harder to maintain bounded contexts (all code in one place leads to coupling)

**When Monolith is Better**: If you have 1-2 developers, simple business logic, and low traffic, monolith is simpler. We don't meet these criteria.

### Why Not Simple Microservices (without DDD)?

**Against Transaction Script Microservices**:
- ❌ Business logic scattered across services
- ❌ No clear ownership of business concepts
- ❌ Services organized by technical layers (API layer, data layer) instead of business capabilities
- ❌ Harder to reason about business flows

**With DDD Microservices**:
- ✅ Business logic concentrated in domain models
- ✅ Clear ownership (Booking aggregate owns booking invariants)
- ✅ Services organized by business capabilities
- ✅ Easier to understand and change business logic

---

## Consequences

### Positive Consequences

✅ **Business Logic Clarity**: Domain models make business rules explicit and testable

✅ **Independent Deployment**: Each service can be deployed without affecting others

✅ **Scalability**: Services scale based on their specific load patterns
   - Example: Inventory service handles 1000 req/sec for searches, Payment service handles 50 req/sec

✅ **Technology Freedom**: Can choose best database per service
   - PostgreSQL for bookings (ACID transactions)
   - MongoDB for inventory (flexible schema for flight data)

✅ **Team Autonomy**: Teams can work independently with clear service boundaries

✅ **Fault Isolation**: Failure in one service doesn't cascade to others

✅ **Easier Testing**: Pure domain logic can be unit tested without infrastructure

### Negative Consequences (and Mitigations)

❌ **Distributed System Complexity**
   - **Challenge**: Network calls can fail, distributed transactions are hard
   - **Mitigation**: Saga pattern for distributed transactions, circuit breakers, retry logic

❌ **Data Consistency Challenges**
   - **Challenge**: No ACID transactions across services
   - **Mitigation**: Eventual consistency via events, Saga pattern with compensation

❌ **Operational Overhead**
   - **Challenge**: More services to monitor and deploy
   - **Mitigation**: Docker + Kubernetes for automation, comprehensive observability (Prometheus, Jaeger)

❌ **Development Complexity**
   - **Challenge**: Setting up 6 services locally
   - **Mitigation**: Docker Compose for local development, clear documentation

❌ **Learning Curve**
   - **Challenge**: Team needs to learn DDD patterns
   - **Mitigation**: Training sessions, pair programming, comprehensive documentation

---

## Implementation

### Service Decomposition

```
┌────────────────────────────────────────────────────────────┐
│                   Bounded Contexts                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Core Domain (Competitive Advantage)                        │
│  ├─ Booking Context  ──────────► Booking Service           │
│  └─ Policy Context   ──────────► Policy Service            │
│                                                             │
│  Supporting Domain (Important but not differentiating)      │
│  ├─ Traveler Context ──────────► Traveler Service          │
│  ├─ Payment Context  ──────────► Payment Service           │
│  └─ Expense Context  ──────────► Expense Service           │
│                                                             │
│  Generic Domain (Commodity)                                 │
│  └─ Inventory Context ─────────► Inventory Service         │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

### DDD Tactical Patterns

Each service implements:

1. **Aggregates**: Transactional consistency boundaries
   - Example: `Booking` aggregate ensures business invariants (can't confirm without payment)

2. **Entities**: Objects with identity
   - Example: `BookingSaga` tracks distributed transaction state

3. **Value Objects**: Immutable objects defined by attributes
   - Example: `Money(amount=450, currency=USD)`, `Itinerary`

4. **Domain Services**: Operations that don't belong to a single aggregate
   - Example: `BookingSagaOrchestrator` coordinates across aggregates

5. **Repositories**: Persistence abstraction
   - Example: `IBookingRepository` (interface in domain, implementation in infrastructure)

6. **Domain Events**: Capture business occurrences
   - Example: `BookingConfirmed`, `PolicyViolationDetected`

### Technology Stack

| Layer | Technology |
|-------|------------|
| Runtime | Node.js 20 LTS |
| Framework | NestJS 10.x (TypeScript) |
| Frontend | React 18 + TypeScript |
| Databases | PostgreSQL 15 (5 services), MongoDB 7 (1 service) |
| Messaging | Apache Kafka 3.x |
| Cache | Redis 7 |
| Container | Docker + Kubernetes |
| Observability | Prometheus, Grafana, Jaeger, ELK |

---

## Compliance & Constraints

**Timeline**: 16 weeks to MVP  
**Budget**: $80,000 labor + infrastructure costs  
**Team**: 5.5 FTE  
**Compliance**: PCI-DSS (payments), GDPR (personal data)  
**Availability Target**: 99.5% uptime  
**Performance Target**: 95th percentile response time < 500ms  

---

## Alternatives Considered

### Alternative 1: Monolithic Architecture

**Pros**:
- Simpler deployment
- Easier local development
- ACID transactions across all data
- No network latency between components

**Cons**:
- Scales as one unit (inefficient)
- Single point of failure
- Tight coupling over time
- Hard to maintain bounded contexts
- Entire team must coordinate deployments

**Why Rejected**: Our business complexity and team size make monolith too constraining. We need independent scalability and team autonomy.

### Alternative 2: Microservices without DDD

**Pros**:
- Independent deployment
- Independent scalability
- Simpler than DDD (no tactical patterns)

**Cons**:
- Business logic scattered across services
- No clear model of business domain
- Services organized by technical layers instead of business capabilities
- Harder to reason about business flows

**Why Rejected**: Without DDD, we lose the business logic clarity and maintainability that our complex domain requires.

### Alternative 3: Event-Driven Architecture with CQRS Everywhere

**Pros**:
- Extreme scalability
- Strong separation of reads and writes
- Event sourcing provides complete audit trail

**Cons**:
- Massive complexity overhead
- CQRS adds complexity where not needed
- Event sourcing requires significant operational expertise
- Overkill for our scale (not handling millions of requests/sec)

**Why Rejected**: Too complex for our needs. We use CQRS selectively (read models for Booking queries) but not everywhere.

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Distributed transaction failures | High | Medium | Saga pattern with compensation, idempotency keys |
| Network latency between services | Medium | High | Service co-location, caching, async communication |
| Team learning curve on DDD | Medium | High | Training, pair programming, comprehensive docs |
| Operational complexity | High | Medium | Kubernetes automation, observability tooling |
| Data inconsistency | High | Low | Eventual consistency design, event ordering guarantees |

---

## Success Metrics

**Technical Metrics**:
- ✅ Independent service deployments: >20 deployments/week
- ✅ Service availability: 99.5% per service
- ✅ Mean time to recovery (MTTR): <15 minutes
- ✅ 95th percentile latency: <500ms

**Business Metrics**:
- ✅ Booking completion rate: >80%
- ✅ Policy violation rate: <5%
- ✅ Payment success rate: >98%

**Team Metrics**:
- ✅ Deployment lead time: <2 hours
- ✅ Code coverage: >80%
- ✅ Team velocity: Stable sprint over sprint

---

## Review & Evolution

**Review Cycle**: Quarterly  
**Next Review**: 2026-08-01  

**Triggers for Re-evaluation**:
- System handles >10x current traffic
- Team grows >15 engineers
- Business pivots to different domain
- Operational costs exceed budget by >30%

---

## Related ADRs

- ADR-002: Technology Stack Selection
- ADR-003: Communication Patterns (Events vs APIs)
- ADR-004: Data Management Strategy
- ADR-005: Security Model

---

## References

- Domain-Driven Design by Eric Evans
- Implementing Domain-Driven Design by Vaughn Vernon
- Microservices Patterns by Chris Richardson
- Building Microservices by Sam Newman

---

**Approved By**: CTO, Engineering Manager, Lead Architect  
**Implementation Start**: 2026-05-01  
**Status**: Active
