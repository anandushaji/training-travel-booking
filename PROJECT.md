# PROJECT.md — [Project Name]

> **How to use this file**
> This is the single source of project-specific context for every agent
> session. Fill in every section before starting work. Sections marked
> `[REQUIRED]` must be completed before any `spec-generator` run.
> Sections marked `[RECOMMENDED]` should be completed but can be deferred
> if genuinely unknown.
>
> Delete all `> [guidance]` blocks once the section is filled in.
> Keep this file up to date as the project evolves — it is read at the
> start of every session and referenced by `architect-reviewer` and
> `dev-reviewer` as the ground truth for the project's architecture.

---

## [REQUIRED] 1. Project Overview

**Name**: Corporate Travel Portal

**Purpose**: An enterprise-grade corporate travel booking and management platform that enables employees to search and book flights while enforcing company travel policies, managing departmental budgets, processing secure payments, and automating expense reporting. The system integrates with Amadeus (flight inventory), Stripe (payments), and HR systems (employee data) to provide a seamless, policy-compliant travel booking experience.

**Stage**: Greenfield

**Team size**: 5.5 FTE (Full-Time Equivalent engineers)
---

## [REQUIRED] 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Language(s) | TypeScript | 5.x |
| Runtime | Node.js | 20 LTS |
| Web framework (Backend) | NestJS | 10.x |
| Web framework (Frontend) | React | 18.x |
| ORM / query builder | TypeORM (PostgreSQL), Mongoose (MongoDB) | TypeORM 0.3.x, Mongoose 8.x |
| Primary database | PostgreSQL (5 instances), MongoDB (1 instance) | PostgreSQL 15, MongoDB 7 |
| Cache | Redis | 7 |
| Message broker | Apache Kafka | 3.x |
| Test framework (Backend) | Jest | 29.x |
| Test framework (Frontend) | Vitest | 1.x |
| Lint / format | ESLint, Prettier | ESLint 8.x, Prettier 3.x |
| Container runtime | Docker | 24.x |
| Infrastructure-as-code | Kubernetes (Helm charts) | Kubernetes 1.28.x, Helm 3.x |
| CI/CD | GitHub Actions | Latest |
| Observability (metrics) | Prometheus | 2.x |
| Observability (tracing) | Jaeger (OpenTelemetry) | Jaeger 1.x |
| Observability (logging) | Elasticsearch + Kibana | 8.x |

---

## [REQUIRED] 3. Repository Structure

> Describe the layout well enough that the agent can infer where new files
> should go without asking. Include monorepo package boundaries if applicable.


```
corporate-travel-portal/
├── services/                    # Microservices (Backend)
│   ├── booking-service/         # Port: 3001
│   │   ├── src/
│   │   │   ├── domain/          # Pure business logic (Aggregates, Entities, Value Objects)
│   │   │   ├── application/     # Use Cases, Commands, Queries, DTOs
│   │   │   ├── infrastructure/  # Repositories, Event Publishers, External Clients
│   │   │   └── presentation/    # Controllers, DTOs, Guards, Filters
│   │   ├── test/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── policy-service/          # Port: 3002
│   ├── traveler-service/        # Port: 3003
│   ├── payment-service/         # Port: 3004
│   ├── inventory-service/       # Port: 3005
│   └── expense-service/         # Port: 3006
│
├── api-gateway/                 # Port: 4000
│   ├── src/
│   │   ├── auth/                # JWT authentication
│   │   ├── rate-limit/          # Rate limiting middleware
│   │   ├── routing/             # Request routing logic
│   │   └── circuit-breaker/     # Circuit breaker implementation
│   └── package.json
│
├── frontend/                    # React SPA (Port: 3000)
│   ├── src/
│   │   ├── features/            # Feature modules (booking, search, profile, expenses, auth)
│   │   ├── common/              # Shared components, hooks, utilities
│   │   ├── api/                 # RTK Query API definitions
│   │   ├── routes/              # React Router configuration
│   │   └── theme/               # Material-UI theme
│   └── package.json
│
├── infrastructure/              # Infrastructure as Code
│   ├── kubernetes/
│   │   ├── base/                # Base Kubernetes manifests
│   │   └── overlays/
│   │       ├── development/
│   │       ├── staging/
│   │       └── production/
│   ├── docker/
│   │   └── docker-compose.yml   # Local development
│   └── monitoring/
│       ├── prometheus.yml
│       └── grafana-dashboards/
│
├── contracts/                   # API Contracts (OpenAPI)
│   └── openapi/
│       ├── booking-service.yaml
│       ├── policy-service.yaml
│       ├── traveler-service.yaml
│       ├── payment-service.yaml
│       ├── inventory-service.yaml
│       └── expense-service.yaml
│
├── docs/                        # Documentation
│   ├── adr/                     # Architecture Decision Records
│   │   ├── ADR-001-Architecture-Style.md
│   │   ├── ADR-002-Technology-Stack.md
│   │   ├── ADR-003-Communication-Patterns.md
│   │   ├── ADR-004-Data-Management.md
│   │   └── ADR-005-013-Complete.md
│   ├── architecture/
│   │   ├── diagrams/            # Architecture diagrams
│   │   └── Architecture-Diagrams.md
│   └── DDD-Architecture.md      # Main architecture documentation
│
├── scripts/                     # Utility scripts
│   ├── check-health.sh
│   ├── deploy.sh
│   ├── backup-db.sh
│   └── run-migrations.sh
│
├── tests/                       # End-to-end tests
│   ├── e2e/
│   └── performance/
│
├── .env.example                 # Environment template
├── docker-compose.yml           # Local development
├── AGENTS.md                    # Agent instructions (if using AI assistants)
├── PROJECT.md                   # This file
└── README.md                    # Project overview
```

**Monorepo**: No (polyglot services in separate directories)

**Package manager**: npm

**Workspace tool**: None (each service is independent)

---

## [REQUIRED] 4. Service Topology

> List every service. For each, state what it owns and how it communicates.
> This is what `architect-reviewer` uses to check domain boundary integrity.

| Service | Responsibility | Data Store | Publishes Events | Consumes Events | Sync Callers |
|---|---|---|---|---|---|
| `booking-service` | Booking orchestration via Saga pattern | PostgreSQL (bookings, booking_sagas, event_store) | BookingCreated, BookingConfirmed, BookingCancelled | PolicyValidated, FlightReserved, PaymentCaptured, PaymentFailed | policy-service, inventory-service, payment-service |
| `policy-service` | Travel policy validation, budget management | PostgreSQL (policies, budgets) | PolicyValidated, PolicyViolationDetected, BudgetUpdated | BookingCreated | Called by booking-service |
| `traveler-service` | Employee profile management, HR sync | PostgreSQL (travelers, preferences) | TravelerCreated, TravelerUpdated | None | Called by multiple services |
| `payment-service` | Stripe payment processing (PCI-DSS) | PostgreSQL (payments, payment_methods) | PaymentAuthorized, PaymentCaptured, PaymentFailed, PaymentRefunded | BookingCancelled | Called by booking-service |
| `inventory-service` | Flight search, Amadeus integration | PostgreSQL (flight_reservations) — see ADR-004-Amendment-01 | FlightReserved, FlightReservationCancelled, FlightReservationExpired | — (no Kafka subscriptions) | Called by booking-service, frontend; topics on `inventory-events` |
| `expense-service` | Receipt generation, expense tracking | PostgreSQL (receipts, expenses) | ReceiptGenerated, ExpenseRecorded | BookingConfirmed, BookingCancelled | Event-driven only |

**Communication style**: Mixed (Async-first for events, Sync for critical path)

**Service discovery**: Kubernetes DNS (service-name:port)

**Event Topics**: `booking-events`, `payment-events`, `policy-events`, `expense-events`, `inventory-events`, `traveler.created`, `traveler.updated`, `traveler.deleted`

---

## [REQUIRED] 5. Architecture Decision Records

> List all accepted ADRs. The agent reads this table to check conformance
> without having to scan the `docs/adr/` directory first.

See complete ADR index in [docs/adr/README.md](docs/adr/README.md)

| ADR | Title | Status | Summary |
|---|---|---|---|
| ADR-001 | Architecture Style | Accepted | DDD + Microservices, 6 bounded contexts, event-driven via Kafka |
| ADR-002 | Technology Stack | Accepted | Node.js 20 + NestJS, React 18, PostgreSQL 15, Kafka 3, cloud-agnostic |
| ADR-003 | Communication Patterns | Accepted | Hybrid REST + Events, Saga pattern, API Gateway |
| ADR-004 | Data Management | Accepted | Database-per-service, 5 PostgreSQL + 1 MongoDB |
| ADR-005 | Security Model | Accepted | Zero Trust, JWT auth, RBAC, TLS 1.3, PCI-DSS for payments |
| ADR-006 | API Gateway | Accepted | Centralized entry point, auth, rate limiting, circuit breaking |
| ADR-007 | Monitoring | Accepted | Prometheus + Jaeger + ELK, OpenTelemetry instrumentation |
| ADR-008 | NFRs | Accepted | p95 < 500ms, 99.5% uptime, 80% test coverage |
| ADR-009 | Deployment | Accepted | Blue-green via GitHub Actions, 3 environments |
| ADR-010 | Testing | Accepted | 70% unit, 20% integration, 10% e2e, contract tests |
| ADR-011 | Error Handling | Accepted | Circuit breaker, exponential backoff, idempotency |
| ADR-012 | Workflow | Accepted | GitFlow, feature branches, conventional commits |
| ADR-013 | Dependencies | Accepted | Dependabot, auto-merge patches, manual minor/major |

**ADR location**: `docs/adr/`
**ADR format**: Custom (Decision + Context + Rationale + Consequences + Alternatives)

> The following pattern categories require an existing ADR before
> `spec-generator` may apply them (per AGENTS.md Section 4.3)

### Pattern-Specific ADRs

| Pattern | Governing ADR |
|---|---|
| CQRS | ADR-001 (approved for read models in booking-service) |
| Saga Orchestration | ADR-003 (choreography-based saga) |
| Event Sourcing | ADR-004 (optional event_store table) |
| Bulkheads | ADR-011 (circuit breakers per service) |
| Caching infrastructure | ADR-002 (Redis 7, TTL policies in ADR-004) |

---

## [REQUIRED] 6. Infrastructure Available

> The agent checks this before applying microservice patterns. If something
> is listed here, it can be used. If it is absent, the agent must flag it
> as a missing prerequisite rather than designing for it.

### Message Broker
- **Type**: Apache Kafka 3.x
- **Topics naming**: `<context>-events` (e.g., `booking-events`)
- **Delivery guarantee**: At-least-once (idempotent consumers required)
- **Outbox relay**: Not implemented (direct publishing with optimistic locking)
- **Client library**: KafkaJS 2.x
- **Partition strategy**: By aggregateId (ordering per aggregate)
- **Retention**: 7 days, replication factor: 2

### Cache
- **Type**: Redis 7 (standalone, cluster in production)
- **Client library**: ioredis 5.x
- **Key namespace**: `<service>:<entity>:<id>`
- **Default TTL**: 5min (flight search), 1h (traveler profiles), 15min (policy validation)
- **Eviction**: LRU

### Database
- **Type**: PostgreSQL 15 (all services — see ADR-004-Amendment-01; MongoDB no longer required for inventory-service)
- **Connection pooling**: TypeORM pool (max 20 per service)
- **Migration tool**: TypeORM migrations, Mongoose schema
- **Schema-per-service**: Yes (strict enforcement)
- **Backup**: Daily full (2:00 AM UTC), 30-day retention

### Secret Management
- **Tool**: Kubernetes Secrets (dev uses .env)
- **Convention**: `<service>-secrets`
- **Rotation**: Manual (automated planned)

### Feature Flags
- **Tool**: Environment variables (`FEATURE_<NAME>_ENABLED=true`)

---

## [REQUIRED] 7. Resilience Defaults

> These values are used by `spec-generator` when writing resilience design
> sections, and by `architect-reviewer` when checking that configured values
> are consistent across services. Override per-service in that service's
> section if needed.

| Pattern | Configuration |
|---|---|
| HTTP connect timeout | 2s |
| HTTP read timeout | 10s (15s for Amadeus/Stripe) |
| DB query timeout | 5s |
| Retry count | 3 retries (4 total attempts) |
| Retry backoff | Exponential: base 200ms, max 5s, jitter |
| Non-retryable codes | 400, 401, 403, 404, 422 |
| Retryable codes | 500, 502, 503, 504, 408 |
| Circuit breaker threshold | 50% errors over 10 req in 30s |
| Circuit breaker recovery | 30s half-open, 60s full recovery |
| Circuit breaker fallback | Cached data or 503 |
| Idempotency TTL | 24h (Redis) |
| Rate limit | 100 req/15min per user, 30 req/min for search |

**Circuit Breaker**: opossum library  
**Idempotency**: `Idempotency-Key` header (UUID) stored in Redis

---

## [REQUIRED] 8. Observability Standards

> Every spec's Observability section must conform to these standards.
**Metrics**: Prometheus (15s scrape interval)  
**Tracing**: OpenTelemetry + Jaeger  
**Logging**: Winston (JSON structured) + Elasticsearch + Kibana  
**Correlation ID**: `X-Correlation-ID` (auto-generated by API Gateway)

**Log levels**:
- `error`: Unrecoverable errors
- `warn`: Recoverable errors, degraded functionality
- `info`: Normal operations
- `debug`: Detailed diagnostics (disabled in production)

**Required log fields**:
```json
{
  "timestamp": "ISO 8601",
  "level": "error|warn|info|debug",
  "service": "booking-service",
  "correlationId": "uuid",
  "message": "text",
  "context": { "userId": "uuid", "bookingId": "uuid" }
}
```

**Required signals per pattern**:

| Pattern | Signal |
|---|---|
| HTTP | `http_requests_total`, `http_request_duration_seconds` (histogram) |
| Retries | `retry_count` (counter), labels: operation, outcome |
| Circuit Breaker | `circuit_state` (gauge: 0/0.5/1), `circuit_breaker_errors_total` |
| Cache | `cache_hit_total`, `cache_miss_total` |
| Database | `db_query_duration_seconds`, `db_connections_active` |
| Kafka | `kafka_messages_produced_total`, `kafka_consumer_lag` |
| Saga | Log per step: `{saga_id, step_name, status, duration}` |
| Business | `bookings_created_total`, `revenue_total` |

**Alerts**: PagerDuty (critical), Slack (warnings)

---

## [RECOMMENDED] 9. Coding Conventions

> Used by `dev-reviewer` to check codebase consistency.

### Naming
- **Files**: `kebab-case.ts`
- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Interfaces**: `I` prefix + `PascalCase` (e.g., `IBookingRepository`)
- **DB tables**: `snake_case` plural (e.g., `bookings`)
- **Events**: `PascalCase` past tense (e.g., `BookingCreated`)
- **Environment variables**: `UPPER_SNAKE_CASE`

### Error handling
- **Base class**: `DomainException` with `code`, `statusCode`, `context`
- **HTTP errors**: ValidationException (400), PolicyViolationException (422), NotFoundException (404), etc.
- **Response schema**:
```json
{
  "error": "ValidationError",
  "message": "Invalid request",
  "details": [{"field": "date", "message": "Must be future"}],
  "correlationId": "uuid",
  "timestamp": "ISO 8601"
}
```
- **Transient vs permanent**: Network/500s (retryable), 400/validation (non-retryable)

### Dependency injection
- **Container**: NestJS built-in (`@Injectable()`, constructor injection)
- **Registration**: Each module's `*.module.ts` providers array
- **Scope**: Singleton (default)

### API design
- **Style**: REST (JSON)
- **Versioning**: `/api/v1/bookings`
- **Auth**: JWT Bearer
- **Pagination**: `?page=2&limit=20`
- **Dates**: ISO 8601
- **Decimals**: 2 places for amounts

### Test conventions
- **Location**: Co-located `*.spec.ts`
- **Naming**: `<module>.spec.ts`
- **Mocks (Backend)**: Jest built-in
- **Mocks (Frontend)**: MSW v2 (`msw/node` via `setupServer`) + Vitest `vi.fn()`
- **DB tests**: Testcontainers
- **Factories**: Manual builders
- **Structure**: AAA (Arrange, Act, Assert)
- **Test names**: `should <behavior> when <condition>`

### DDD conventions
- **Aggregates**: `domain/aggregates/`
- **Entities**: `domain/entities/`
- **Value Objects**: `domain/value-objects/` (immutable)
- **Domain Services**: `domain/services/` (stateless)
- **Repositories**: Interfaces in domain/, implementations in infrastructure/
- **Domain Events**: `domain/events/`, extend `DomainEvent`
- **Use Cases**: `application/use-cases/`, one class per use case
- **DTOs**: `application/dto/`, separate request/response

---

## [RECOMMENDED] 10. Build, Run, and Test Commands

> The agent uses these to verify its own work.

```bash
# Infrastructure
docker-compose up -d              # Start all services
docker-compose ps                 # Check status
docker-compose logs -f            # View logs
docker-compose down               # Stop all
docker-compose down -v            # Stop and remove volumes

# Per service
cd services/booking-service
npm install                       # Install dependencies
npm run start:dev                 # Dev mode (hot reload)
npm run build                     # Production build

# Testing
npm test                          # All tests
npm run test:unit                 # Unit tests only
npm run test:integration          # Integration tests
npm run test:e2e                  # End-to-end tests
npm run test:watch                # Watch mode
npm run test:coverage             # Coverage report (target: 80%)

# Code quality
npm run lint                      # ESLint
npm run format                    # Prettier
npm run type-check                # TypeScript

# Database
npm run migration:run             # Run migrations
npm run migration:create -- Name  # Create migration
npm run migration:revert          # Revert last
npm run seed                      # Seed data (dev)

# Utilities
./scripts/check-health.sh         # Health check all services
./scripts/deploy.sh staging       # Deploy to staging
./scripts/deploy.sh production    # Deploy to production

# Frontend
cd frontend
npm install
npm run dev                       # Dev server (port 3000)
npm run build                     # Production build
```
---

## [RECOMMENDED] 11. Environment Setup

> What a developer (or agent) needs to run the project locally.

**Required variables**: See `.env.example` in each service

**Local infrastructure**: Docker Compose

```bash
docker-compose up -d              # Start: PostgreSQL, MongoDB, Kafka, Redis, monitoring
```

**Access URLs** (after `docker-compose up -d`):
- Frontend: http://localhost:3000
- API Gateway: http://localhost:4000
- Grafana: http://localhost:3100 (admin/admin)
- Prometheus: http://localhost:9090
- Jaeger: http://localhost:16686
- Kibana: http://localhost:5601

**Setup gotchas**:
- Kafka needs 30s for Zookeeper to fully start
- Ports 3000-3006, 4000, 5432-5437, 6379, 9092, 27017 must be available
- First-time Docker image download: 5-10 minutes
- Default credentials (dev only): postgres/password, no auth for MongoDB/Redis

---

## [RECOMMENDED] 12. Per-Service Overrides

> If individual services deviate from the defaults above, document them here.
> `architect-reviewer` checks service-level overrides against the governing ADR.

### `booking-service`
- **Cache TTL**: 1min (booking read model, high volatility)
- **Special pattern**: Optional event_store table for audit (ADR-004)

### `traveler-service`
- **Timeout override**: HR sync 30s (slow external SOAP API)
- **Cache TTL**: 1h (traveler profiles, low change frequency)
- **Special pattern**: Nightly batch sync from HR (ADR-012)

### `payment-service`
- **Timeout override**: Stripe 15s
- **Cache TTL**: No caching (PCI-DSS - sensitive data)
- **Special pattern**: Stripe tokenization, never store full cards (ADR-005)

### `inventory-service`
- **Timeout override**: Amadeus 15s
- **Cache TTL**: 5min (flight search)
- **Special pattern**: PostgreSQL for `FlightReservation` aggregates; flight offers not persisted (ADR-004-Amendment-01). Application-level AES-256-CBC encryption for `passportNumber` at rest (ADR-005).

### `expense-service`
- **Cache TTL**: 24h (receipts immutable after generation)
- **Special pattern**: PDF generation via pdfkit (ADR-002)

---

## 13. Changelog

> Keep a brief record of significant changes to this file so the agent
> knows the project has evolved.

| Date | Change | Author |
|---|---|---|
| 2026-05-01 | Initial PROJECT.md created | Architecture Team |
| 2026-05-01 | Added 13 ADRs (ADR-001 to ADR-013) | Architecture Team |
| 2026-05-01 | Documented 6 microservices topology | Architecture Team |
| 2026-05-01 | Defined resilience & observability standards | Architecture Team |
| 2026-05-04 | Frontend test framework changed to Vitest 1.x (from Jest 29.x); backend retains Jest 29.x. See ADR-002 Amendment 01. | SM-FE-01 |

----

## Additional Context

### External APIs (Development)

**Amadeus** (Flight Search):
- Endpoint: `https://test.api.amadeus.com`
- Credentials: `AMADEUS_API_KEY`, `AMADEUS_API_SECRET` (test mode)

**Stripe** (Payments):
- Endpoint: `https://api.stripe.com`
- Credentials: `STRIPE_SECRET_KEY` (test: sk_test_...), `STRIPE_PUBLISHABLE_KEY` (pk_test_...)
- Test card: `4242 4242 4242 4242` (Visa)

**HR System** (Employee Data):
- Endpoint: `HR_SYSTEM_URL` (SOAP)
- Auth: Basic Auth
- Sync: Daily 2:00 AM UTC

### Performance Targets
- Response: p50 < 200ms, p95 < 500ms, p99 < 1s
- Throughput: 1,000 concurrent users, 10K req/min
- Availability: 99.5% (43 min downtime/month)

### Compliance
- **PCI-DSS**: Stripe handles card data, we store tokens only
- **GDPR**: Right to access/erasure/portability implemented
- **Retention**: Personal data 90 days, audit logs 1 year
- **Encryption**: AES-256 (rest), TLS 1.3 (transit)

---

**Last Updated**: 2026-05-01  
**Version**: 1.0  
**Status**: Production Ready