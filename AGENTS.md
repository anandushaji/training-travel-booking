# AGENTS.md — Baseline Agent Instructions

> **Read this file first, every session.** It is intentionally short.
> Detailed policy lives in `docs/` and must be loaded on demand — do not
> preload it.

---

## 1. First steps every session

1. Read `PROJECT.md` in the project root. It holds the project-specific
   context (tech stack, service topology, ADRs, conventions) that
   overrides the defaults referenced below. **If `PROJECT.md` does not
   exist, stop and tell the user.**
2. For the task at hand, load only the `docs/` files relevant to it
   (see the router below).

---

## 2. The invariants

This project uses **Spec-Driven Development (SDD)** via OpenSpec. Two
invariants govern everything else:

1. **No code is written before a spec exists and has been reviewed.**
   See `docs/workflow/sdd-pipeline.md` for exceptions and the full
   pipeline. If in doubt, treat it as spec-required.
2. **Every Acceptance Criterion in any `spec.md` must have at least one
   executable verification artifact that fails when the AC's `THEN`
   clause is violated.** See `docs/workflow/acceptance-criteria.md` for
   the full policy (allowed artifact types, what counts as satisfied,
   enforcement points).
3. **No code is written before an OpenAPI spec exists and has been reviewed.**
   All services must have OpenAPI 3.0 specifications in `docs/contracts/openapi/`
   before implementation begins. if not exist prompt to user and create it.
4. **Every bounded context maps to exactly one microservice with its own database.**
   See `docs/adr/ADR-001-Architecture-Style.md` for the full policy. Cross-service
   communication happens only via REST APIs (synchronous) or Kafka events
   (asynchronous). Direct database access across service boundaries is forbidden.

---

## 3. Router — where the rules live

Load each file only when the current task matches its "when to read"
column. Do not read them all upfront.

| Topic | File | When to read |
|---|---|---|
| SDD pipeline & exceptions | `docs/workflow/sdd-pipeline.md` | Starting any feature/fix/refactor; deciding if a spec is required. |
| Skills catalog | `docs/workflow/skills-catalog.md` | Choosing which skill to invoke. |
| OpenSpec artifacts & delta-spec rules | `docs/workflow/openspec-artifacts.md` | Creating, validating, or archiving a change. |
| AC verification policy | `docs/workflow/acceptance-criteria.md` | Writing or reviewing ACs; pairing tasks with tests; deciding if an AC is satisfied. |
| Microservice patterns & pattern defaults | `docs/architecture/microservice-patterns.md` | Writing or reviewing any spec that touches service boundaries, resilience, or data ownership. |
| ADR discipline | `docs/architecture/adr-discipline.md` | Proposing, superseding, or enforcing an ADR. |
| Coding standards & commits | `docs/standards/coding-standards.md` | Implementing tasks, writing tests, preparing commits. |
| Context hygiene | `docs/agents/context-hygiene.md` | Running the reviewer council or any multi-step skill chain. |
| Guardrails (NOT-to-do + escalation) | `docs/agents/guardrails.md` | Before any irreversible action, or when uncertain whether to proceed. |
| Project ADRs | `docs/adr/` | When a spec or design references a specific ADR. |
| Feature decompositions | `docs/decomposition/` | Reviewing an existing feature breakdown before spec-generation or implementation planning. |
| Complete DDD implementation guide | `docs/DDD-Architecture.md` | Understanding domain models, aggregates, repositories, use cases |
| API contract for specific service | `docs/contracts/openapi/<service>-service.yaml` | Implementing or calling that service's APIs |
| Visual architecture reference | `docs/architecture/Architecture-Diagrams.md` | Understanding system structure, data flows, deployment |

`docs/README.md` has the same index in a browsable form.

---

## 4. Conflict resolution

When instructions disagree, apply this precedence (highest wins):

```
ADR  >  PROJECT.md  >  AGENTS.md (this file)  >  docs/
```

## 5. When in doubt

Ask the user. Do not assume. Escalation triggers are listed in
`docs/agents/guardrails.md`.

- **Architectural changes** that contradict an accepted ADR
- **New external dependencies** not listed in ADR-002
- **Cross-service database access** (violates database-per-service)
- **New infrastructure** not documented in PROJECT.md Section 6
- **Security concerns** related to PCI-DSS or GDPR compliance
- **Performance impacts** that might violate NFRs (ADR-008)

---

## 6. Feature decomposition documents

When the `feature-decomposer` skill is used, it writes a structured
Markdown document to `docs/decomposition/<feature-name>.md`. Each file
contains:

- A one-paragraph feature summary.
- A numbered list of sub-modules (`[SM-01]`, `[SM-02]`, …), each with
  its OpenSpec domain, scope, key requirements, contracts/interfaces,
  prerequisites, and implementation notes.
- A dependency wave table (Wave 1, Wave 2, …) showing the suggested
  implementation sequence.
- A cross-cutting concerns section covering NFRs and shared utilities.

Load the relevant file from `docs/decomposition/` whenever you are
planning spec-generation or implementation for an already-decomposed
feature.

## 7. Domain-Driven Design Workflow

When implementing a new feature:

1. **Identify the bounded context** (see PROJECT.md Section 4 - Service Topology)
2. **Load the relevant OpenAPI spec** from `docs/contracts/openapi/`
3. **Read the DDD implementation** from `docs/DDD-Architecture.md` for that context
4. **Follow the 4-layer architecture**:
   - **Domain Layer**: Pure business logic (aggregates, entities, value objects, domain services)
   - **Application Layer**: Use cases, commands, queries, DTOs, mappers
   - **Infrastructure Layer**: Repositories, event publishers, external clients
   - **Presentation Layer**: Controllers, DTOs, guards, filters
5. **Check ADRs** for any patterns being used (CQRS, Saga, Event Sourcing)
6. **Implement with tests** (80% coverage target per ADR-010)

## 8. Contract-First API Development

**Before writing any service implementation**:

1. **Check if OpenAPI spec exists** in `docs/contracts/openapi/<service>-service.yaml`
2. **If missing**: Create OpenAPI 3.0 spec first
3. **Generate code from spec**:
   ```bash
   npx @openapitools/openapi-generator-cli generate \
     -i docs/contracts/openapi/<service>-service.yaml \
     -g typescript-nestjs \
     -o src/generated/dto
   ```
4. **Implement against generated types** (never deviate from spec)
5. **Validate implementation** against spec (contract tests)

## 9. Event-Driven Architecture Workflow

When implementing event-driven features:

1. **Check ADR-003** for event naming conventions and topics
2. **Domain events** follow pattern: `<AggregateRoot><Action>` (e.g., `BookingCreated`)
3. **Event schema**:
   ```typescript
   {
     eventId: string;
     eventType: string;
     aggregateId: string;
     occurredOn: ISO8601;
     correlationId: string;
     causationId: string;
     data: {...}
   }
   ```
4. **Publishers**: Domain layer emits events, infrastructure layer publishes to Kafka
5. **Consumers**: Must be idempotent (check `eventId` in database)
6. **Saga pattern**: Follow choreography-based saga from ADR-003

## 10. Testing Requirements

Per ADR-010, every feature must have:

- **Unit tests**: 70% of test suite (pure domain logic)
  - Test aggregates, entities, value objects
  - No external dependencies (mock everything)
  - Co-located: `<module>.spec.ts`

- **Integration tests**: 20% of test suite (API + database)
  - Test controllers with real database (Testcontainers)
  - Test event handlers with real Kafka
  - Test repositories with real database

- **E2E tests**: 10% of test suite (critical flows)
  - Booking flow (search → book → pay → confirm)
  - Run against staging environment

- **Contract tests**: All API consumers
  - Use Pact for consumer-driven contracts
  - Validate against OpenAPI specs

**Coverage target**: 80% minimum (enforced in CI/CD)


## 11. Observability Requirements

Per ADR-007, every service must emit:

**Metrics** (Prometheus):
- `http_requests_total` - Counter with labels: method, route, status_code
- `http_request_duration_seconds` - Histogram (p50, p95, p99)
- Business metrics: `bookings_created_total`, `revenue_total`, etc.

**Traces** (Jaeger + OpenTelemetry):
- Span per HTTP request
- Span per database query
- Span per Kafka event published/consumed
- Correlation ID propagated: `X-Correlation-ID` header

**Logs** (Winston + Elasticsearch):
- JSON structured format
- Required fields: timestamp, level, service, correlationId, message, context
- Log levels: error (unrecoverable), warn (recoverable), info (normal), debug (detailed)

## 12. Security Requirements

Per ADR-005, all implementations must:

- **Authentication**: JWT tokens (8-hour expiry) validated by API Gateway
- **Authorization**: RBAC checks in each service (Employee/Manager/Admin roles)
- **Encryption**: AES-256 at rest (database), TLS 1.3 in transit (HTTPS)
- **PCI-DSS**: Never store full credit card numbers (use Stripe tokenization)
- **GDPR**: Implement right to access, erasure, portability for personal data
- **Secrets**: Never commit to Git, use Kubernetes Secrets or .env (development)

---

## 12. Code Review Checklist

Before submitting any code, verify:

- [ ] OpenAPI spec exists and matches implementation
- [ ] Tests added/updated (80% coverage maintained)
- [ ] No secrets in code
- [ ] Observability metrics/logs/traces added
- [ ] Database migrations created (if schema changed)
- [ ] ADRs followed (no violations)
- [ ] Documentation updated (if API changed)
- [ ] Code follows PROJECT.md Section 9 conventions
- [ ] PR description follows conventional commits format
- [ ] At least 1 approval from peer reviewer
---