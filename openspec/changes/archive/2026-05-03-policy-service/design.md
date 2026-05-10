# Design: Policy Service (SM-05)

## Pattern Selection Log

| Pattern              | Decision         | Rationale                                                                                                  |
|----------------------|------------------|------------------------------------------------------------------------------------------------------------|
| Database-per-service | Applied          | Policy data (policies, budgets, violations) belongs exclusively to this bounded context; no other service accesses the DB directly |
| CQRS                 | Not applicable   | Read/write load is low; a single-model approach keeps complexity manageable without materialized read models |
| Saga (Choreography)  | Not applicable   | No multi-service distributed transaction originates here; this service is a synchronous validation provider |
| Saga (Orchestration) | Not applicable   | Same reasoning as choreography                                                                             |
| Outbox               | Not applicable   | PROJECT.md §6 explicitly opts out of the outbox relay; direct Kafka publish after DB commit is the mandated approach |
| Idempotency          | Applied          | `POST /policies` and `POST /budgets` must be safe to retry; unique constraints on (name, department) and (department, fiscal_year) serve as natural idempotency keys |
| Timeouts             | Applied          | Traveler Service is a synchronous dependency inside the 500 ms validation SLA; unbounded HTTP calls would violate the SLA |
| Retries with Backoff | Applied          | Transient network blips to Traveler Service should be retried before escalating to the circuit breaker    |
| Circuit Breaker      | Applied          | Traveler Service unavailability must not break policy validation; JWT `department` claim provides a safe fallback |
| Bulkheads            | Not applicable   | Single downstream HTTP dependency; separate thread pools provide no isolation benefit at this service's expected load |
| Cache-aside          | Applied          | Validation queries the same policy rules on every booking attempt; caching avoids repeated DB round-trips and keeps latency well below 500 ms |
| Read-through         | Not applicable   | Cache-aside (application-managed) is consistent with the patterns used in SM-03 and SM-04                  |
| Write-through        | Not applicable   | Write-through adds overhead with no benefit; invalidation-on-write achieves the same consistency guarantee |
| Cache Invalidation   | Applied          | Explicit key delete on any policy mutation ensures consumers never read stale rules                         |

**Applied patterns**: Database-per-service, Idempotency, Timeouts, Retries with Backoff, Circuit Breaker, Cache-aside, Cache Invalidation

**Architectural assumptions**: None beyond those listed in `proposal.md`.

---

## Architecture Overview

```
                        ┌─────────────────────────────────────────────┐
                        │             policy-service  :3002            │
                        │                                              │
  Booking Service ──────▶  POST /policies/validate                    │
  (SM-07)               │    PolicyValidator (domain svc)              │
                        │    ValidatePolicyUseCase (app)               │
  API Gateway ──────────▶  CRUD /policies, /budgets                   │
                        │                                              │
                        │  ┌──────────────┐   ┌───────────────────┐   │
                        │  │  PostgreSQL   │   │  Redis (cache)    │   │
                        │  │  policy_svc  │   │  policy rules     │   │
                        │  │  schema      │   │  traveler dept    │   │
                        │  └──────────────┘   └───────────────────┘   │
                        │                                              │
                        │  ┌────────────────────────────────────────┐ │
                        │  │  TravelerServiceClient                 │ │
                        │  │  CB (opossum) + Retry + Timeout        │ │
                        │  └────────────────────────────────────────┘ │
                        └─────────────────────────────────────────────┘
                                    │                    │
                             GET /travelers/:id     Kafka publish
                                    ▼                    ▼
                         Traveler Service           policy-events topic
                         (SM-03) :3003              PolicyValidated
                                                    PolicyViolationDetected
```

---

## Data Model / Schema Changes

### PostgreSQL — `policy_service` schema

**`travel_policies`**
```sql
CREATE TABLE travel_policies (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         VARCHAR(255) NOT NULL,
  description  TEXT,
  department   VARCHAR(255) NOT NULL,
  rules        JSONB NOT NULL DEFAULT '{}',
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID NOT NULL,
  version      INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_policy_name_dept UNIQUE (name, department)
);
```

`rules` JSONB schema:
```json
{
  "maxFlightCost":      1000.00,
  "allowedCabinClasses": ["ECONOMY", "PREMIUM_ECONOMY"],
  "advanceBookingDays": 7,
  "requiresApproval":   false,
  "approvalThreshold":  2000.00,
  "allowInternational": true
}
```

**`departmental_budgets`**
```sql
CREATE TABLE departmental_budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department   VARCHAR(255) NOT NULL,
  fiscal_year  INTEGER NOT NULL,
  total_budget NUMERIC(15,2) NOT NULL,
  spent        NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency     VARCHAR(3) NOT NULL DEFAULT 'USD',
  q1_budget    NUMERIC(15,2),
  q2_budget    NUMERIC(15,2),
  q3_budget    NUMERIC(15,2),
  q4_budget    NUMERIC(15,2),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_budget_dept_year UNIQUE (department, fiscal_year)
);
```

**`policy_violations`**
```sql
CREATE TABLE policy_violations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id        UUID REFERENCES travel_policies(id),
  traveler_id      UUID NOT NULL,
  booking_ref      VARCHAR(255),
  violations       JSONB NOT NULL DEFAULT '[]',
  requires_approval BOOLEAN NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Redis key schema

| Key pattern                                    | TTL    | Value                              |
|------------------------------------------------|--------|------------------------------------|
| `policy-service:policy:dept:{department}`      | 15 min | JSON array of serialised policy objects for that department |
| `policy-service:traveler-dept:{travelerId}`    | 1 h    | Plain string — department name     |

---

## API / Interface Contracts

See `docs/contracts/openapi/openapi-policy-service.yaml` for the authoritative
contract. Summary:

| Method | Path                               | Auth          | Description               |
|--------|------------------------------------|---------------|---------------------------|
| GET    | /health                            | None          | Liveness check            |
| GET    | /ready                             | None          | Readiness (DB + Redis)    |
| GET    | /policies                          | JWT (any role)| List policies             |
| POST   | /policies                          | JWT ADMIN     | Create policy             |
| GET    | /policies/:id                      | JWT (any role)| Get policy by ID          |
| PUT    | /policies/:id                      | JWT ADMIN     | Update policy             |
| DELETE | /policies/:id                      | JWT ADMIN     | Delete policy             |
| POST   | /policies/validate                 | JWT (any role)| Validate booking          |
| GET    | /budgets                           | JWT ADMIN/MGR | List budgets              |
| POST   | /budgets                           | JWT ADMIN/MGR | Create budget             |
| GET    | /budgets/:department               | JWT ADMIN/MGR | Get budget by department  |
| GET    | /budgets/:department/remaining     | JWT ADMIN/MGR | Remaining budget          |

### Kafka events (topic: `policy-events`)

All events conform to the ADR-003 envelope:
```typescript
{
  eventId:       string;   // UUID v4
  eventType:     string;
  aggregateId:   string;   // policy ID
  occurredOn:    string;   // ISO-8601
  correlationId: string;
  causationId:   string;
  data:          object;
}
```

**`PolicyValidated`**
```json
{
  "eventType": "PolicyValidated",
  "data": {
    "travelerId": "...",
    "policyId":   "...",
    "valid":      true,
    "violations": []
  }
}
```

**`PolicyViolationDetected`**
```json
{
  "eventType": "PolicyViolationDetected",
  "data": {
    "travelerId":        "...",
    "policyId":          "...",
    "violations":        [{ "rule": "cabinClass", "message": "...", "severity": "ERROR" }],
    "requiresApproval":  false
  }
}
```

---

## Resilience Design

### Timeouts

The `TravelerServiceClient` (Axios-based) is configured with:
- `timeout.connect`: 2 000 ms
- `timeout.response`: 5 000 ms

Both values must be configurable via environment variables
`TRAVELER_SERVICE_CONNECT_TIMEOUT_MS` (default `2000`) and
`TRAVELER_SERVICE_READ_TIMEOUT_MS` (default `5000`).

If the request exceeds these timeouts, Axios throws; the retry
interceptor catches and retries (see below).

### Retries with Backoff

An Axios request interceptor (or `axios-retry`) applies before the circuit
breaker sees the final failure:

- Max retries: **3**
- Delay formula: `min(200 * 2^attempt, 5000) * (1 ± 0.25 * random())`
- Retryable conditions: network errors, `ECONNRESET`, `ETIMEDOUT`,
  HTTP 429, HTTP 5xx
- Non-retryable: HTTP 4xx (except 429), business errors

After 3 exhausted retries the error propagates to the circuit breaker.

### Circuit Breaker

opossum wraps the `TravelerServiceClient.getTraveler(id)` method:

| Parameter           | Value                              |
|---------------------|------------------------------------|
| errorThresholdPercentage | 50                            |
| volumeThreshold     | 10 requests                        |
| timeout             | 5 000 ms (opossum fire timeout)    |
| resetTimeout        | 30 000 ms                          |
| fallback            | Return `{ department: jwtPayload.department }` |

When the circuit is open, the fallback resolves immediately with the
department from the JWT; no retries are attempted.

---

## Transaction & Consistency Design

### Idempotency

**Policy creation**: `UNIQUE (name, department)` on `travel_policies`.
On conflict (PostgreSQL error code `23505`), the application layer maps to
`ConflictException` (`POLICY_ALREADY_EXISTS`) and returns HTTP 409.

**Budget creation**: `UNIQUE (department, fiscal_year)` on
`departmental_budgets`. On conflict, returns `ConflictException`
(`BUDGET_ALREADY_EXISTS`) → HTTP 409.

**Validation**: `POST /policies/validate` is inherently idempotent — it is
a pure read + compute operation (writes to `policy_violations` are
append-only and do not affect the outcome of a repeated call).

---

## Caching Design

### Cache-aside — Policy Rules

- **Key**: `policy-service:policy:dept:{department}`
- **TTL**: 900 s (15 min)
- **Population**: On cache miss, fetch active policies for department from DB
  and write to Redis as JSON array.
- **Read**: `ValidatePolicyUseCase` asks `PolicyCacheService.getPoliciesForDepartment(department)`.
  On hit → return parsed array. On miss → query DB → set cache → return.
- **Cache-unavailable fallback**: If Redis is unreachable, log a warning and
  query DB directly (degraded performance but no availability loss).

### Cache-aside — Traveler Department

- **Key**: `policy-service:traveler-dept:{travelerId}`
- **TTL**: 3 600 s (1 h)
- **Population**: On cache miss, call Traveler Service HTTP (with CB + retry).
- **Cache-unavailable fallback**: Proceed without cache; Traveler Service HTTP
  is called directly.

### Cache Invalidation

On any mutation of `travel_policies` (create / update / delete / deactivate):
1. Identify the affected `department`.
2. Call `PolicyCacheService.invalidateDepartmentPolicies(department)`.
3. This issues a Redis `DEL policy-service:policy:dept:{department}`.

If the Redis `DEL` fails, log a warning; the stale entry will expire
naturally after 15 min (acceptable consistency window).

---

## Error Handling

| Condition                           | HTTP status | Error code              |
|-------------------------------------|-------------|-------------------------|
| Policy not found                    | 404         | `NOT_FOUND`             |
| Budget not found                    | 404         | `NOT_FOUND`             |
| Policy duplicate (name+dept)        | 409         | `POLICY_ALREADY_EXISTS` |
| Budget duplicate (dept+year)        | 409         | `BUDGET_ALREADY_EXISTS` |
| Validation request invalid          | 400         | `VALIDATION_ERROR`      |
| JWT missing / invalid               | 401         | `UNAUTHORIZED`          |
| Insufficient role                   | 403         | `FORBIDDEN`             |
| Traveler Service unavailable (CB open) | 200 (degraded, uses JWT dept) | — (no error; fallback applied) |
| Traveler not found in Traveler Svc  | 404 proxied | `NOT_FOUND`             |

All unhandled exceptions are caught by a global `HttpExceptionFilter` that
returns a structured error body:
```json
{ "error": "<code>", "message": "<message>", "details": [] }
```

Transient downstream errors are retried before surfacing (see Retries).

---

## Security Considerations

- JWT validation is performed by the API Gateway; this service trusts the
  forwarded `X-Correlation-ID` and decoded JWT payload headers.
- RBAC is enforced per endpoint:
  - Policy CRUD mutations: `ADMIN` only.
  - Budget CRUD: `ADMIN` or `MANAGER`.
  - Read and validate endpoints: any authenticated user.
- No sensitive PII is persisted in this service (only `travelerId` UUID
  foreign keys).
- Kafka credentials and DB connection string are read from environment
  variables; never committed to source control.
- Input DTOs are validated with `class-validator` (global `ValidationPipe`
  with `whitelist: true, forbidNonWhitelisted: true`).

---

## Observability

Per ADR-007:

**Metrics (Prometheus)**
- `http_requests_total{method, route, status_code}` — Counter
- `http_request_duration_seconds{method, route}` — Histogram (p50, p95, p99)
- `policy_validations_total{result: valid|invalid}` — Counter
- `traveler_service_retries_total` — Counter (incremented per retry attempt)
- `traveler_service_cb_state{state: closed|open|half-open}` — Gauge
- `redis_cache_hits_total{key_type: policy|traveler_dept}` — Counter
- `redis_cache_misses_total{key_type: policy|traveler_dept}` — Counter

**Traces (OpenTelemetry / Jaeger)**
- Span per HTTP request (auto-instrumented via `@opentelemetry/instrumentation-nestjs-core`)
- Span per DB query (TypeORM instrumentation)
- Span for Traveler Service HTTP call (with retry count attribute)
- Span for Redis get/set/del
- `X-Correlation-ID` propagated on all outbound calls and inbound spans

**Logs (Winston / Elasticsearch)**
JSON structured logs with required fields:
`{ timestamp, level, service: "policy-service", correlationId, message, context }`

Key log events:
- `INFO` — policy created / updated / deleted
- `INFO` — validation result (valid or violations count)
- `WARN` — Traveler Service circuit open; using JWT fallback
- `WARN` — Redis unavailable; querying DB directly
- `ERROR` — unhandled exception with stack trace

---

## Dependencies on Other Changes

| SM     | What is needed                                                              |
|--------|-----------------------------------------------------------------------------|
| SM-01  | `@travel/shared` package — `AggregateRoot`, `DomainEvent`, `KafkaModule`, exception classes, UUID utils |
| SM-03  | Traveler Service running at `TRAVELER_SERVICE_URL`; `GET /travelers/:id` endpoint returning `{ id, department }` |
