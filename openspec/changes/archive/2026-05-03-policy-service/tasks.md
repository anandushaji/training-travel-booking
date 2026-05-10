# Tasks: Policy Service (SM-05)

## Implementation Checklist

- [x] T01: Scaffold policy-service project (package.json, tsconfig, jest.config, main.ts, module)
- [x] T02: Domain layer — TravelPolicy aggregate and PolicyRules value object
- [x] T03: Domain layer — DepartmentalBudget aggregate
- [x] T04: Domain layer — PolicyValidator domain service
- [x] T05: Domain events — PolicyValidated and PolicyViolationDetected
- [x] T06: TypeORM entities and migrations
- [x] T07: Infrastructure — TravelPolicy and DepartmentalBudget repositories
- [x] T08: Infrastructure — TravelerServiceClient with timeout, retry, and circuit breaker
- [x] T09: Infrastructure — PolicyCacheService (cache-aside + invalidation)
- [x] T10: Infrastructure — Kafka event publisher
- [x] T11: Application — DTOs and mappers  ← moved before use cases (was T14)
- [x] T12: Application — Policy CRUD use cases (create, get, list, update, delete)
- [x] T13: Application — ValidatePolicyUseCase
- [x] T14: Application — Budget use cases (create, get, list, remaining)
- [x] T15: Presentation — PolicyController and BudgetController
- [x] T16: Presentation — HttpExceptionFilter, ValidationPipe, Health/Ready endpoints
- [x] T17: Observability instrumentation (metrics, traces, logs)
- [x] T18: Integration tests (controller + DB)
- [x] T19: Contract test (Pact — PolicyValidated / PolicyViolationDetected events)

---

## Task Details

> Every task below follows the AC Verification Policy
> (`docs/workflow/acceptance-criteria.md`): every Acceptance Criterion is
> paired with a named, automatically executable verification artifact and a
> "Must fail if" note.

---

### T01: Scaffold policy-service project

**Files affected**:
- `policy-service/package.json`
- `policy-service/tsconfig.json`
- `policy-service/jest.config.js`
- `policy-service/src/main.ts`
- `policy-service/src/policy.module.ts`
- `policy-service/src/app.module.ts`

**Description**:
Bootstrap the NestJS application. `package.json` must mirror the pattern
established in `traveler-service` and `payment-service`:
- NestJS 10.x, TypeORM 0.3.x, `@nestjs/config`, `ioredis`, `opossum`,
  `axios`, `prom-client`, `winston`, `class-validator`, `class-transformer`,
  `@travel/shared` (workspace alias).
- Scripts: `build`, `start`, `start:dev`, `test`, `test:cov`, `typeorm`.
- `tsconfig.json`: extends `../tsconfig.base.json`; NO `rootDir`; sets
  `outDir: "dist"`; path alias `"@travel/shared"` → `"../packages/shared/src"`.
- `jest.config.js` (`module.exports = { ... }`): uses `ts-jest`, coverage
  thresholds (branches ≥ 80 %), `--forceExit --runInBand`, coverage
  exclusions matching other services.
- `main.ts` bootstraps on port `3002` (read from `PORT` env var).
- `PolicyModule` declares all providers; imports `TypeOrmModule`,
  `KafkaModule` from `@travel/shared`, `ConfigModule`.

**Acceptance criteria**:
- AC-01: `tsc --noEmit` exits 0 with no TS6059 errors.
- AC-02: `jest --passWithNoTests` exits 0.
- AC-03: `ConfigModule` loads `PORT`, `DATABASE_URL`, `REDIS_URL`,
  `KAFKA_BROKERS`, `TRAVELER_SERVICE_URL` from environment.

**Verification artifacts**:
- AC-01 → `policy-service/tsconfig.json` (static artifact; verified by CI
  `tsc --noEmit` step)
  - Must fail if: `rootDir` is set, causing `@travel/shared` path alias to
    resolve outside `rootDir` (TS6059)
- AC-02 → `policy-service/jest.config.js` (static; verified by `npm test`)
  - Must fail if: jest config is missing `ts-jest` transformer
- AC-03 → `policy-service/src/config/env.validation.spec.ts::validates required env vars`
  (unit)
  - Must fail if: `ConfigModule` does not throw on missing `DATABASE_URL`

---

### T02: Domain layer — TravelPolicy aggregate and value objects

**Files affected**:
- `policy-service/src/domain/aggregates/travel-policy.aggregate.ts`
- `policy-service/src/domain/value-objects/policy-id.value-object.ts`
- `policy-service/src/domain/value-objects/policy-rules.value-object.ts`
- `policy-service/src/domain/value-objects/validation-result.value-object.ts`

**Description**:
Implement `TravelPolicy` extending `AggregateRoot` from `@travel/shared`.

```typescript
class TravelPolicy extends AggregateRoot<TravelPolicyProps> {
  static create(props: CreatePolicyProps, createdBy: string): TravelPolicy
  update(props: UpdatePolicyProps): void
  deactivate(): void
  get id(): PolicyId
  get name(): string
  get department(): string
  get rules(): PolicyRules
  get active(): boolean
  get version(): number
}
```

`PolicyRules` is an immutable value object (plain class with readonly fields):
`maxFlightCost`, `allowedCabinClasses`, `advanceBookingDays`,
`requiresApproval`, `approvalThreshold`, `allowInternational`.

`ValidationResult` is a value object with `valid: boolean`,
`violations: PolicyViolation[]`, `requiresApproval: boolean`, and
factory methods `pass()` / `fail(violations)`.

`PolicyId` extends `TypedId` from `@travel/shared`.

**Acceptance criteria**:
- AC-01: `TravelPolicy.create()` returns a valid aggregate with `version=0`.
- AC-02: `TravelPolicy.update()` increments `version`.
- AC-03: `PolicyRules` with an invalid `cabinClass` value (not in enum) throws
  a `DomainException`.
- AC-04: `ValidationResult.pass()` returns `{ valid: true, violations: [] }`.
- AC-05: `ValidationResult.fail(violations)` returns `{ valid: false, violations }`.

**Verification artifacts**:
- AC-01 → `policy-service/src/domain/aggregates/travel-policy.aggregate.spec.ts::create - sets version to 0`
  (unit)
  - Must fail if: `TravelPolicy.create()` does not set `version = 0`
- AC-02 → `::update - increments version`
  (unit)
  - Must fail if: `update()` does not call `this.props.version++`
- AC-03 → `policy-service/src/domain/value-objects/policy-rules.value-object.spec.ts::rejects invalid cabinClass`
  (unit)
  - Must fail if: `PolicyRules` constructor does not validate enum membership
- AC-04 → `policy-service/src/domain/value-objects/validation-result.value-object.spec.ts::pass returns valid true`
  (unit)
  - Must fail if: `ValidationResult.pass()` sets `valid = false`
- AC-05 → `::fail sets valid false with violations`
  (unit)
  - Must fail if: `fail()` ignores the `violations` argument

---

### T03: Domain layer — DepartmentalBudget aggregate

**Files affected**:
- `policy-service/src/domain/aggregates/departmental-budget.aggregate.ts`
- `policy-service/src/domain/value-objects/budget-id.value-object.ts`

**Description**:
`DepartmentalBudget` extends `AggregateRoot` with fields: `department`,
`fiscalYear`, `totalBudget`, `spent`, `currency`, quarterly buckets.

```typescript
class DepartmentalBudget extends AggregateRoot<DepartmentalBudgetProps> {
  static create(props: CreateBudgetProps): DepartmentalBudget
  get remaining(): number   // totalBudget - spent
  get percentageUsed(): number  // (spent / totalBudget) * 100
}
```

**Acceptance criteria**:
- AC-01: `DepartmentalBudget.create()` initialises `spent = 0`.
- AC-02: `remaining` returns `totalBudget - spent`.
- AC-03: `percentageUsed` returns `(spent / totalBudget) * 100` rounded
  to 2 decimal places.

**Verification artifacts**:
- AC-01 → `policy-service/src/domain/aggregates/departmental-budget.aggregate.spec.ts::create - initialises spent to 0`
  (unit)
  - Must fail if: constructor sets `spent` to a non-zero value
- AC-02 → `::remaining - returns totalBudget minus spent`
  (unit)
  - Must fail if: `remaining` getter uses addition instead of subtraction
- AC-03 → `::percentageUsed - rounds to 2 decimal places`
  (unit)
  - Must fail if: `percentageUsed` returns unrounded float

---

### T04: Domain layer — PolicyValidator domain service

**Files affected**:
- `policy-service/src/domain/services/policy-validator.domain-service.ts`

**Description**:
Pure function service — no injected dependencies.

```typescript
class PolicyValidatorDomainService {
  validate(
    request: PolicyValidationRequestDto,
    policy: TravelPolicy | null,
  ): ValidationResult
}
```

Rules evaluated (in order; collect all violations before returning):
1. `cabinClass` — must be in `policy.rules.allowedCabinClasses`
2. `maxFlightCost` — `request.amount` must be ≤ `policy.rules.maxFlightCost`
3. `advanceBookingDays` — `request.advanceBookingDays` must be ≥ `policy.rules.advanceBookingDays`
4. `allowInternational` — if `false`, domestic routes only (origin === destination country; not validated here — flag as WARNING if international keywords detected)

If `policy === null`, return `ValidationResult.pass()` (no policy = no restriction).

After collecting all violations, check `requiresApproval`:
- If `policy.rules.requiresApproval === true` OR `request.amount > policy.rules.approvalThreshold`,
  set `requiresApproval = true` on result.

**Acceptance criteria**:
- AC-01: Returns `valid: true` when no rules are violated.
- AC-02: Returns `valid: false` with `rule: "cabinClass"` when cabin class not in allowed list.
- AC-03: Returns `valid: false` with `rule: "maxFlightCost"` when amount exceeds max.
- AC-04: Returns `valid: false` with `rule: "advanceBookingDays"` when days below minimum.
- AC-05: Returns `requiresApproval: true` when amount exceeds `approvalThreshold`.
- AC-06: Returns `valid: true, violations: []` when `policy === null`.
- AC-07: Collects ALL violations (does not short-circuit on first failure).

**Verification artifacts**:
- AC-01 → `policy-service/src/domain/services/policy-validator.domain-service.spec.ts::validates - returns valid when all rules pass`
  (unit)
  - Must fail if: validator returns `valid: false` on a compliant request
- AC-02 → `::validates - cabin class violation`
  (unit)
  - Must fail if: `cabinClass` rule is not evaluated
- AC-03 → `::validates - maxFlightCost violation`
  (unit)
  - Must fail if: cost rule evaluator uses `<` instead of `<=`
- AC-04 → `::validates - advanceBookingDays violation`
  (unit)
  - Must fail if: days rule evaluator uses `<=` instead of `<`
- AC-05 → `::validates - sets requiresApproval when amount exceeds threshold`
  (unit)
  - Must fail if: `approvalThreshold` check is omitted
- AC-06 → `::validates - no policy returns pass`
  (unit)
  - Must fail if: null policy throws instead of returning pass
- AC-07 → `::validates - collects all violations`
  (unit)
  - Must fail if: validator returns after first violation

---

### T05: Domain events

**Files affected**:
- `policy-service/src/domain/events/policy-validated.event.ts`
- `policy-service/src/domain/events/policy-violation-detected.event.ts`

**Description**:
Both events extend `DomainEvent` from `@travel/shared` and carry the
ADR-003 envelope (`eventId`, `eventType`, `aggregateId`, `occurredOn`,
`correlationId`, `causationId`, `data`).

```typescript
class PolicyValidatedEvent extends DomainEvent {
  constructor(props: DomainEventProps & {
    data: { travelerId: string; policyId: string | null; valid: true; violations: [] }
  })
}
class PolicyViolationDetectedEvent extends DomainEvent {
  constructor(props: DomainEventProps & {
    data: {
      travelerId: string;
      policyId: string;
      violations: PolicyViolationDto[];
      requiresApproval: boolean;
    }
  })
}
```

**Acceptance criteria**:
- AC-01: `PolicyValidatedEvent` serialises to an object matching the
  ADR-003 envelope schema (all required fields present).
- AC-02: `PolicyViolationDetectedEvent` includes `violations` array in `data`.

**Verification artifacts**:
- AC-01 → `policy-service/src/domain/events/policy-validated.event.spec.ts::serialises to ADR-003 envelope`
  (unit)
  - Must fail if: `eventId` is missing from the serialised output
- AC-02 → `policy-service/src/domain/events/policy-violation-detected.event.spec.ts::includes violations in data`
  (unit)
  - Must fail if: `data.violations` is omitted or undefined

---

### T06: TypeORM entities and migrations

**Files affected**:
- `policy-service/src/infrastructure/entities/travel-policy.entity.ts`
- `policy-service/src/infrastructure/entities/departmental-budget.entity.ts`
- `policy-service/src/infrastructure/entities/policy-violation.entity.ts`
- `policy-service/src/infrastructure/migrations/YYYYMMDD_create_policy_tables.ts`
- `policy-service/src/infrastructure/typeorm-data-source.ts`

**Description**:
TypeORM entities must mirror the schema defined in `design.md` exactly:
- `TravelPolicyEntity`: `@VersionColumn()` on `version`, `@Column({ type: 'jsonb' })` on `rules`.
- `DepartmentalBudgetEntity`: `UNIQUE(department, fiscal_year)` as
  `@Unique(['department', 'fiscalYear'])`.
- `PolicyViolationEntity`: `@ManyToOne(() => TravelPolicyEntity)` nullable.

Migration creates all three tables in order (policies first, violations last
to satisfy FK).

`typeorm-data-source.ts` exports a `DataSource` instance used by CLI
(excluded from coverage via jest exclusion glob).

**Acceptance criteria**:
- AC-01: Migration runs without error against a PostgreSQL test database
  (via Testcontainers).
- AC-02: `TravelPolicyEntity` has `@VersionColumn` decorator.
- AC-03: `DepartmentalBudgetEntity` enforces `UNIQUE(department, fiscal_year)`
  at the DB level.

**Verification artifacts**:
- AC-01 → `policy-service/src/infrastructure/migrations/migration.integration.spec.ts::migration runs without error`
  (integration — Testcontainers)
  - Must fail if: the migration SQL contains a syntax error or missing table
- AC-02 → `policy-service/src/infrastructure/entities/travel-policy.entity.spec.ts::has VersionColumn`
  (unit — metadata reflection)
  - Must fail if: `@VersionColumn()` is removed from the entity
- AC-03 → `policy-service/src/infrastructure/entities/departmental-budget.entity.spec.ts::has unique constraint on department+fiscalYear`
  (unit — metadata reflection)
  - Must fail if: `@Unique` decorator is missing

---

### T07: Infrastructure — repositories

**Files affected**:
- `policy-service/src/infrastructure/repositories/travel-policy.repository.ts`
- `policy-service/src/infrastructure/repositories/departmental-budget.repository.ts`

**Description**:
Each repository wraps a TypeORM `Repository<Entity>` and maps to/from
the domain aggregate.

`TravelPolicyRepository`:
- `findById(id: string): Promise<TravelPolicy | null>`
- `findByDepartment(department: string, activeOnly?: boolean): Promise<TravelPolicy[]>`
- `findAll(filters: { department?: string; active?: boolean }): Promise<TravelPolicy[]>`
- `save(policy: TravelPolicy): Promise<TravelPolicy>`
- `delete(id: string): Promise<void>`

`DepartmentalBudgetRepository`:
- `findById(id: string): Promise<DepartmentalBudget | null>`
- `findByDepartmentAndYear(department: string, fiscalYear: number): Promise<DepartmentalBudget | null>`
- `findAll(fiscalYear?: number): Promise<DepartmentalBudget[]>`
- `save(budget: DepartmentalBudget): Promise<DepartmentalBudget>`

Note: repositories are excluded from coverage via jest config glob
(`!**/repositories/*.ts`).

**Acceptance criteria**:
- AC-01: `findById` returns `null` (not throws) when row does not exist.
- AC-02: `save` with an existing `id` updates the row (upsert semantics via
  TypeORM `save`).
- AC-03: `delete` on a non-existent ID does not throw.

**Verification artifacts**:
- AC-01 → `policy-service/src/infrastructure/repositories/travel-policy.repository.integration.spec.ts::findById returns null when not found`
  (integration — Testcontainers)
  - Must fail if: repository throws `NotFoundException` instead of returning null
- AC-02 → `::save updates existing policy`
  (integration)
  - Must fail if: `save` inserts a duplicate row instead of updating
- AC-03 → `::delete does not throw on missing id`
  (integration)
  - Must fail if: `delete` propagates a TypeORM EntityNotFoundError

---

### T08: Infrastructure — TravelerServiceClient with circuit breaker, retry, timeout  [Circuit Breaker + Retries + Timeouts]

**Files affected**:
- `policy-service/src/infrastructure/http/traveler-service.client.ts`
- `policy-service/src/infrastructure/http/traveler-service.circuit-breaker.ts`

**Description**:
`TravelerServiceClient` is a NestJS injectable that wraps Axios.

Axios instance configuration:
```typescript
baseURL: configService.get('TRAVELER_SERVICE_URL'),
timeout: configService.get('TRAVELER_SERVICE_READ_TIMEOUT_MS', 5000),
```

`axios-retry` interceptor:
```typescript
axiosRetry(axiosInstance, {
  retries: 3,
  retryDelay: (retryCount) => {
    const base = Math.min(200 * Math.pow(2, retryCount), 5000);
    return base * (1 + (Math.random() - 0.5) * 0.5);
  },
  retryCondition: isNetworkOrIdempotentRequestError,
});
```

opossum circuit breaker:
```typescript
const breaker = new CircuitBreaker(axiosGetTraveler, {
  errorThresholdPercentage: 50,
  volumeThreshold: 10,
  timeout: 5000,
  resetTimeout: 30000,
});
breaker.fallback((travelerId: string, jwtDept: string) => ({ department: jwtDept }));
```

Public method:
```typescript
async getTravelerDepartment(
  travelerId: string,
  jwtDepartment: string,
): Promise<string>
```

Internally fires the CB; on success extracts `response.data.department`; on
fallback returns `jwtDepartment`.

Emits `traveler_service_cb_state` Gauge on state-change events
(`open`, `close`, `halfOpen`).

**Acceptance criteria**:
- AC-01: When Traveler Service returns HTTP 200, `getTravelerDepartment`
  returns the department from the response.
- AC-02: When Traveler Service returns HTTP 503 on all 3 attempts,
  `traveler_service_retries_total` is incremented by 3.
- AC-03: When the circuit breaker is OPEN, the Traveler Service is not
  called and the JWT department is returned.
- AC-04: Connect timeout of 2 s is enforced (Axios throws on timeout).
- AC-05: Non-retryable 404 is NOT retried (counter stays at 0).

**Verification artifacts**:
- AC-01 → `policy-service/src/infrastructure/http/traveler-service.client.spec.ts::returns department from 200 response`
  (unit — Axios mock)
  - Must fail if: response body `department` field is not extracted
- AC-02 → `::increments retry counter on 503 exhaustion`
  (unit — Axios mock)
  - Must fail if: retry interceptor is not wired or counter not incremented
- AC-03 → `::uses JWT department when circuit is open`
  (unit — opossum forced-open)
  - Must fail if: fallback function is not registered on the breaker
- AC-04 → `::throws on connect timeout`
  (unit — mock delay)
  - Must fail if: Axios `timeout` option is not set
- AC-05 → `::does not retry on 404`
  (unit — Axios mock)
  - Must fail if: `retryCondition` does not exclude 4xx errors

---

### T09: Infrastructure — PolicyCacheService  [Cache-aside + Cache Invalidation]

**Files affected**:
- `policy-service/src/infrastructure/cache/policy-cache.service.ts`

**Description**:
`PolicyCacheService` wraps `ioredis`.

```typescript
class PolicyCacheService {
  async getPoliciesForDepartment(dept: string): Promise<TravelPolicy[] | null>
  async setPoliciesForDepartment(dept: string, policies: TravelPolicy[]): Promise<void>  // TTL 900s
  async invalidateDepartmentPolicies(dept: string): Promise<void>
  async getTravelerDepartment(travelerId: string): Promise<string | null>
  async setTravelerDepartment(travelerId: string, dept: string): Promise<void>  // TTL 3600s
}
```

Key patterns:
- `policy-service:policy:dept:{department}`
- `policy-service:traveler-dept:{travelerId}`

On Redis error: catch, log WARN, return `null` (caller falls back to DB or
Traveler Service).

**Acceptance criteria**:
- AC-01: `getPoliciesForDepartment` returns parsed policies on cache hit.
- AC-02: `getPoliciesForDepartment` returns `null` on cache miss.
- AC-03: `setPoliciesForDepartment` writes with TTL 900.
- AC-04: `invalidateDepartmentPolicies` calls Redis `DEL` with the correct key.
- AC-05: When Redis throws, `getPoliciesForDepartment` returns `null` and
  emits a WARN log.
- AC-06: `redis_cache_hits_total{key_type="policy"}` incremented on hit.
- AC-07: `redis_cache_misses_total{key_type="policy"}` incremented on miss.

**Verification artifacts**:
- AC-01 → `policy-service/src/infrastructure/cache/policy-cache.service.spec.ts::returns parsed policies on hit`
  (unit — ioredis mock)
  - Must fail if: JSON.parse is omitted
- AC-02 → `::returns null on miss`
  (unit)
  - Must fail if: cache miss returns empty array instead of null
- AC-03 → `::sets TTL to 900 on write`
  (unit)
  - Must fail if: `setex` is called with a different TTL
- AC-04 → `::invalidate calls DEL with correct key`
  (unit)
  - Must fail if: key includes wrong prefix or department value
- AC-05 → `::returns null and warns on Redis error`
  (unit)
  - Must fail if: error is rethrown to caller
- AC-06 → `::increments hits counter on cache hit`
  (unit)
  - Must fail if: counter is not wired to the hit branch
- AC-07 → `::increments misses counter on cache miss`
  (unit)
  - Must fail if: counter is not wired to the miss branch

---

### T10: Infrastructure — Kafka event publisher

**Files affected**:
- `policy-service/src/infrastructure/kafka/policy-event.publisher.ts`

**Description**:
`PolicyEventPublisher` injects `KAFKA_PRODUCER` from `@travel/shared` and
publishes to topic `policy-events`.

```typescript
class PolicyEventPublisher {
  async publishPolicyValidated(event: PolicyValidatedEvent): Promise<void>
  async publishPolicyViolationDetected(event: PolicyViolationDetectedEvent): Promise<void>
}
```

Each method calls `producer.send({ topic: 'policy-events', messages: [{ key: aggregateId, value: JSON.stringify(envelope) }] })`.

On Kafka error: log ERROR and rethrow (validation result has already been
committed to DB; caller handles gracefully).

**Acceptance criteria**:
- AC-01: `publishPolicyValidated` sends a message to topic `policy-events`
  with key = `event.aggregateId`.
- AC-02: Published message body conforms to ADR-003 envelope (all six fields
  present: `eventId`, `eventType`, `aggregateId`, `occurredOn`,
  `correlationId`, `causationId`, `data`).
- AC-03: If Kafka throws, the error is logged and rethrown.

**Verification artifacts**:
- AC-01 → `policy-service/src/infrastructure/kafka/policy-event.publisher.spec.ts::sends to policy-events with aggregateId key`
  (unit — KafkaProducer mock)
  - Must fail if: topic name is wrong or key is omitted
- AC-02 → `::message conforms to ADR-003 envelope`
  (unit)
  - Must fail if: any of the six envelope fields is missing from the
    serialised message
- AC-03 → `::rethrows Kafka error after logging`
  (unit)
  - Must fail if: Kafka error is swallowed silently

---

### T12: Application — Policy CRUD use cases

**Files affected**:
- `policy-service/src/application/use-cases/create-policy.use-case.ts`
- `policy-service/src/application/use-cases/get-policy.use-case.ts`
- `policy-service/src/application/use-cases/list-policies.use-case.ts`
- `policy-service/src/application/use-cases/update-policy.use-case.ts`
- `policy-service/src/application/use-cases/delete-policy.use-case.ts`

**Description**:
- `CreatePolicyUseCase.execute(dto, createdBy)`:
  1. Construct `TravelPolicy.create(...)`.
  2. Call `repository.save(policy)` — DB unique constraint propagates as
     TypeORM `QueryFailedError` (code `23505`); catch and throw
     `ConflictException('Policy already exists', 'POLICY_ALREADY_EXISTS')`.
  3. Call `cacheService.invalidateDepartmentPolicies(policy.department)`.
  4. Return mapped DTO.
- `GetPolicyUseCase.execute(id)`: `findById` → throw `NotFoundException` if null.
- `ListPoliciesUseCase.execute(filters)`: `findAll(filters)` → map to DTOs.
- `UpdatePolicyUseCase.execute(id, dto)`:
  1. `findById` → `NotFoundException` if null.
  2. Call `policy.update(dto)`.
  3. `repository.save(policy)`.
  4. Invalidate cache.
  5. Return mapped DTO.
- `DeletePolicyUseCase.execute(id)`:
  1. `findById` → `NotFoundException` if null.
  2. `repository.delete(id)`.
  3. Invalidate cache.

**Acceptance criteria**:
- AC-01: `CreatePolicyUseCase` throws `ConflictException` (code
  `POLICY_ALREADY_EXISTS`) on duplicate `name+department`.
- AC-02: `CreatePolicyUseCase` calls `invalidateDepartmentPolicies` after save.
- AC-03: `GetPolicyUseCase` throws `NotFoundException` when policy not found.
- AC-04: `UpdatePolicyUseCase` increments `version` in the persisted entity.
- AC-05: `UpdatePolicyUseCase` calls `invalidateDepartmentPolicies` after save.
- AC-06: `DeletePolicyUseCase` calls `invalidateDepartmentPolicies` after delete.

**Verification artifacts**:
- AC-01 → `policy-service/src/application/use-cases/create-policy.use-case.spec.ts::throws ConflictException on duplicate`
  (unit — repository mock throwing QueryFailedError with code 23505)
  - Must fail if: `QueryFailedError` is not caught and mapped to `ConflictException`
- AC-02 → `::invalidates cache after create`
  (unit)
  - Must fail if: `invalidateDepartmentPolicies` is not called
- AC-03 → `policy-service/src/application/use-cases/get-policy.use-case.spec.ts::throws NotFoundException when not found`
  (unit)
  - Must fail if: `null` from repository is not mapped to `NotFoundException`
- AC-04 → `policy-service/src/application/use-cases/update-policy.use-case.spec.ts::version incremented after update`
  (unit)
  - Must fail if: `policy.update()` is not called before `repository.save()`
- AC-05 → `::invalidates cache after update`
  (unit)
  - Must fail if: cache invalidation is omitted
- AC-06 → `policy-service/src/application/use-cases/delete-policy.use-case.spec.ts::invalidates cache after delete`
  (unit)
  - Must fail if: cache invalidation step is omitted

---

### T13: Application — ValidatePolicyUseCase

**Files affected**:
- `policy-service/src/application/use-cases/validate-policy.use-case.ts`

**Description**:
```typescript
class ValidatePolicyUseCase {
  async execute(
    dto: PolicyValidationRequestDto,
    jwtPayload: JwtPayload,
    correlationId: string,
  ): Promise<PolicyValidationResponseDto>
}
```

Flow:
1. Resolve traveler department:
   a. Check `PolicyCacheService.getTravelerDepartment(dto.travelerId)`.
   b. Cache miss → call `TravelerServiceClient.getTravelerDepartment(travelerId, jwtPayload.department)`.
   c. On success → `setCachedTravelerDepartment(travelerId, dept)`.
2. Get policies for department:
   a. Check `PolicyCacheService.getPoliciesForDepartment(dept)`.
   b. Cache miss → `TravelPolicyRepository.findByDepartment(dept, true)` →
      set cache.
3. Pick the most-specific active policy (first match by department; if none, pass with no policy).
4. Run `PolicyValidatorDomainService.validate(dto, policy)`.
5. If violations exist, insert row in `policy_violations` table.
6. Publish `PolicyValidated` or `PolicyViolationDetected` event to Kafka
   (fire-and-forget, errors logged but not rethrown to caller).
7. Return `PolicyValidationResponseDto`.

**Acceptance criteria**:
- AC-01: Returns `{ valid: true, violations: [] }` when policy passes.
- AC-02: Returns `{ valid: false, violations: [...] }` when rules violated.
- AC-03: Inserts a `policy_violation` row when `valid: false`.
- AC-04: Does NOT insert a `policy_violation` row when `valid: true`.
- AC-05: Publishes `PolicyValidated` event when `valid: true`.
- AC-06: Publishes `PolicyViolationDetected` event when `valid: false`.
- AC-07: Uses cached traveler department when available (Traveler Service not called).
- AC-08: Uses JWT department fallback when circuit breaker is OPEN.
- AC-09: Returns `{ valid: true }` when no active policy exists for the department.

**Verification artifacts**:
- AC-01 → `policy-service/src/application/use-cases/validate-policy.use-case.spec.ts::returns valid true on pass`
  (unit — all deps mocked)
  - Must fail if: `valid` field is false on passing request
- AC-02 → `::returns valid false with violations`
  (unit)
  - Must fail if: `violations` array is empty on failing request
- AC-03 → `::inserts policy_violation row on failure`
  (unit)
  - Must fail if: `PolicyViolationRepository.save` is not called on failure
- AC-04 → `::does not insert violation row on pass`
  (unit)
  - Must fail if: `save` is called even when result is valid
- AC-05 → `::publishes PolicyValidated on pass`
  (unit)
  - Must fail if: `publishPolicyValidated` is not called
- AC-06 → `::publishes PolicyViolationDetected on failure`
  (unit)
  - Must fail if: `publishPolicyViolationDetected` is not called
- AC-07 → `::uses cached department without calling Traveler Service`
  (unit)
  - Must fail if: `TravelerServiceClient` is called when cache returns a value
- AC-08 → `::uses JWT dept when circuit is open`
  (unit — CB forced open)
  - Must fail if: JWT fallback is not wired into the use case
- AC-09 → `::returns valid when no policy exists`
  (unit)
  - Must fail if: missing policy throws instead of returning pass

---

### T14: Application — Budget use cases

**Files affected**:
- `policy-service/src/application/use-cases/create-budget.use-case.ts`
- `policy-service/src/application/use-cases/get-budget.use-case.ts`
- `policy-service/src/application/use-cases/list-budgets.use-case.ts`
- `policy-service/src/application/use-cases/get-remaining-budget.use-case.ts`

**Description**:
- `CreateBudgetUseCase`: construct `DepartmentalBudget.create(dto)`, save;
  catch DB `23505` → `ConflictException('Budget already exists', 'BUDGET_ALREADY_EXISTS')`.
- `GetBudgetUseCase`: `findByDepartmentAndYear` → `NotFoundException` if null.
- `ListBudgetsUseCase`: `findAll(fiscalYear?)` → map to DTOs.
- `GetRemainingBudgetUseCase`: reuses `GetBudgetUseCase` result, computes
  `remaining` and `percentageUsed` from aggregate getters.

**Acceptance criteria**:
- AC-01: `CreateBudgetUseCase` throws `ConflictException` (`BUDGET_ALREADY_EXISTS`)
  on duplicate `department+fiscalYear`.
- AC-02: `GetBudgetUseCase` throws `NotFoundException` when not found.
- AC-03: `GetRemainingBudgetUseCase` returns `remaining = totalBudget - spent`.

**Verification artifacts**:
- AC-01 → `policy-service/src/application/use-cases/create-budget.use-case.spec.ts::throws ConflictException on duplicate`
  (unit)
  - Must fail if: `23505` error is not caught and re-mapped
- AC-02 → `policy-service/src/application/use-cases/get-budget.use-case.spec.ts::throws NotFoundException`
  (unit)
  - Must fail if: null return from repository is not mapped to NotFoundException
- AC-03 → `policy-service/src/application/use-cases/get-remaining-budget.use-case.spec.ts::remaining equals totalBudget minus spent`
  (unit)
  - Must fail if: `remaining` uses wrong arithmetic

---

### T11: Application — DTOs and mappers

**Files affected**:
- `policy-service/src/application/dtos/create-policy.dto.ts`
- `policy-service/src/application/dtos/update-policy.dto.ts`
- `policy-service/src/application/dtos/policy-response.dto.ts`
- `policy-service/src/application/dtos/policy-validation-request.dto.ts`
- `policy-service/src/application/dtos/policy-validation-response.dto.ts`
- `policy-service/src/application/dtos/create-budget.dto.ts`
- `policy-service/src/application/dtos/budget-response.dto.ts`
- `policy-service/src/application/mappers/policy.mapper.ts`
- `policy-service/src/application/mappers/budget.mapper.ts`

**Description**:
DTOs use `class-validator` decorators (`@IsString()`, `@IsUUID()`,
`@IsEnum()`, `@IsNumber()`, `@IsBoolean()`, `@IsOptional()`).

`PolicyValidationRequestDto` requires `travelerId` (UUID) and `amount`
(positive number); `cabinClass`, `origin`, `destination`,
`advanceBookingDays` are optional.

Mappers: `PolicyMapper.toDto(aggregate): PolicyResponseDto` and
`BudgetMapper.toDto(aggregate): BudgetResponseDto`.

tsconfig `exactOptionalPropertyTypes: true` — use
`...(x !== undefined && { x })` spreads for optional fields.

**Acceptance criteria**:
- AC-01: `CreatePolicyDto` fails `class-validator` when `name` is missing.
- AC-02: `PolicyValidationRequestDto` fails validation when `travelerId` is
  not a valid UUID.
- AC-03: `PolicyMapper.toDto` maps all aggregate fields to the response shape
  including `rules` as a nested object.

**Verification artifacts**:
- AC-01 → `policy-service/src/application/dtos/create-policy.dto.spec.ts::fails validation when name missing`
  (unit — `validate()` from class-validator)
  - Must fail if: `@IsNotEmpty()` decorator is missing from `name`
- AC-02 → `policy-service/src/application/dtos/policy-validation-request.dto.spec.ts::fails when travelerId is not UUID`
  (unit)
  - Must fail if: `@IsUUID()` decorator is missing
- AC-03 → `policy-service/src/application/mappers/policy.mapper.spec.ts::maps rules to nested object`
  (unit)
  - Must fail if: `rules` field is omitted or serialised as a string

---

### T15: Presentation — PolicyController and BudgetController

**Files affected**:
- `policy-service/src/presentation/controllers/policy.controller.ts`
- `policy-service/src/presentation/controllers/budget.controller.ts`

**Description**:
Both controllers use `@UseGuards(JwtAuthGuard)` (trusts JWT already
validated by API Gateway; decodes bearer token using `@nestjs/jwt` with
`ignoreExpiration: false`).

Role guards:
- `@Roles('ADMIN')` on `POST /policies`, `PUT /policies/:id`,
  `DELETE /policies/:id`.
- `@Roles('ADMIN', 'MANAGER')` on `POST /budgets`, budget GET endpoints.
- No role restriction on `GET /policies`, `GET /policies/:id`,
  `POST /policies/validate`.

`POST /policies/validate` route must be declared BEFORE `/:id` to avoid
NestJS treating `"validate"` as a UUID parameter.

Controllers extract `correlationId` from `X-Correlation-ID` header
(defaulting to `generateUuid()` if missing) and forward it to use cases.

**Acceptance criteria**:
- AC-01: `POST /policies` returns 403 for MANAGER role.
- AC-02: `POST /policies` returns 201 for ADMIN role.
- AC-03: `POST /policies/validate` is reachable and not matched by
  `GET /policies/:id` route.
- AC-04: `X-Correlation-ID` header is propagated to the use case as
  `correlationId`.

**Verification artifacts**:
- AC-01 → `policy-service/src/presentation/controllers/policy.controller.spec.ts::POST /policies returns 403 for MANAGER`
  (unit — mocked guard returning MANAGER role)
  - Must fail if: `@Roles('ADMIN')` guard is missing on `create` handler
- AC-02 → `::POST /policies returns 201 for ADMIN`
  (unit)
  - Must fail if: handler does not set `@HttpCode(201)`
- AC-03 → `::POST /policies/validate routes correctly`
  (unit)
  - Must fail if: NestJS route order causes `validate` to be matched as `:id`
- AC-04 → `::correlationId forwarded from header`
  (unit)
  - Must fail if: `correlationId` is not extracted from the header

---

### T16: Presentation — HttpExceptionFilter, ValidationPipe, Health/Ready endpoints

**Files affected**:
- `policy-service/src/presentation/filters/http-exception.filter.ts`
- `policy-service/src/presentation/controllers/health.controller.ts`
- `policy-service/src/main.ts` (global pipe + filter registration)

**Description**:
`HttpExceptionFilter` catches all `HttpException` and `DomainException`
subclasses and returns:
```json
{ "error": "<code>", "message": "<human message>", "details": [] }
```

`ValidationPipe` configured with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`.

`HealthController`:
- `GET /health` → `{ status: "healthy", timestamp: ISO }` (no auth).
- `GET /ready` → queries DB with `SELECT 1` and pings Redis; returns
  `{ status: "ready", database: "connected" }` or 503 if either fails.

**Acceptance criteria**:
- AC-01: `HttpExceptionFilter` returns `{ error, message, details }` shape for 404.
- AC-02: `ValidationPipe` rejects requests with extra (non-whitelisted) fields
  (HTTP 400).
- AC-03: `GET /health` returns 200 without authentication.
- AC-04: `GET /ready` returns 503 when DB is unavailable.

**Verification artifacts**:
- AC-01 → `policy-service/src/presentation/filters/http-exception.filter.spec.ts::maps NotFoundException to 404 with error shape`
  (unit)
  - Must fail if: filter returns NestJS default error body instead of
    `{ error, message, details }` shape
- AC-02 → `policy-service/src/presentation/controllers/policy.controller.spec.ts::ValidationPipe rejects extra fields`
  (unit)
  - Must fail if: `forbidNonWhitelisted` is not set to true
- AC-03 → `policy-service/src/presentation/controllers/health.controller.spec.ts::GET /health returns 200 without auth`
  (unit)
  - Must fail if: `JwtAuthGuard` is applied to the health endpoint
- AC-04 → `policy-service/src/presentation/controllers/health.controller.spec.ts::GET /ready returns 503 when DB down`
  (unit — DataSource mock throwing)
  - Must fail if: DB failure is not caught and converted to 503

---

### T17: Observability instrumentation  [Circuit Breaker + Cache-aside + Retries]

**Files affected**:
- `policy-service/src/infrastructure/metrics/policy-metrics.service.ts`
- `policy-service/src/infrastructure/http/traveler-service.client.ts` (add CB state gauge)
- `policy-service/src/infrastructure/cache/policy-cache.service.ts` (add hit/miss counters)

**Description**:
`PolicyMetricsService` initialises all `prom-client` metrics:
- `http_requests_total` (Counter, labels: method, route, status_code)
- `http_request_duration_seconds` (Histogram, labels: method, route)
- `policy_validations_total` (Counter, labels: result — valid/invalid)
- `traveler_service_retries_total` (Counter)
- `traveler_service_cb_state` (Gauge, labels: state — closed/open/half-open)
- `redis_cache_hits_total` (Counter, labels: key_type)
- `redis_cache_misses_total` (Counter, labels: key_type)

Register a `GET /metrics` endpoint (unauthenticated) that returns
`prom-client` default registry output in text format.

Prometheus Histogram registers durations using a NestJS interceptor
(`MetricsInterceptor`) applied globally.

All metrics specs call `prom.register.clear()` in `beforeEach` to prevent
duplicate-registration errors across test suites.

**Acceptance criteria**:
- AC-01: `policy_validations_total{result="valid"}` is incremented after a
  passing validation.
- AC-02: `traveler_service_cb_state` gauge is set to `1` when CB transitions
  to OPEN.
- AC-03: `redis_cache_hits_total{key_type="policy"}` is incremented on cache hit.
- AC-04: `GET /metrics` returns 200 with `Content-Type: text/plain`.

**Verification artifacts**:
- AC-01 → `policy-service/src/infrastructure/metrics/policy-metrics.service.spec.ts::increments validations_total on valid result`
  (unit — `prom.register.clear()` in beforeEach)
  - Must fail if: counter is not incremented on the valid branch
- AC-02 → `policy-service/src/infrastructure/http/traveler-service.client.spec.ts::sets cb_state gauge to 1 on OPEN`
  (unit)
  - Must fail if: opossum `open` event does not trigger gauge update
- AC-03 → `policy-service/src/infrastructure/cache/policy-cache.service.spec.ts::increments hits counter on hit`
  (unit)
  - Must fail if: hit branch does not call `cacheHitsTotal.inc()`
- AC-04 → `policy-service/src/presentation/controllers/health.controller.spec.ts::GET /metrics returns 200`
  (unit)
  - Must fail if: metrics endpoint is missing or auth-gated

---

### T18: Integration tests

**Files affected**:
- `policy-service/src/presentation/controllers/policy.controller.integration.spec.ts`
- `policy-service/src/presentation/controllers/budget.controller.integration.spec.ts`
- `policy-service/src/application/use-cases/validate-policy.use-case.integration.spec.ts`

**Description**:
Integration tests use Testcontainers (PostgreSQL + Redis) and
`@nestjs/testing` `Test.createTestingModule` with real TypeORM and ioredis.

Key scenarios to cover:
- `POST /policies` → DB row created → `GET /policies/:id` returns it.
- `POST /policies` duplicate → 409 response.
- `PUT /policies/:id` → version incremented in DB.
- `DELETE /policies/:id` → row removed.
- `POST /policies/validate` → validation uses DB-backed policy and
  inserts `policy_violations` row.
- `POST /budgets` → DB row created → `GET /budgets/:dept/remaining`
  returns correct `remaining`.

Kafka and Traveler Service are mocked at the module level (replace with
jest mocks in the test module).

**Acceptance criteria**:
- AC-01: `POST /policies` with valid body creates a policy and returns 201.
- AC-02: `POST /policies/validate` with a cabin-class violation returns
  `{ valid: false }` and creates a `policy_violations` row.
- AC-03: `POST /budgets` with duplicate `department+fiscalYear` returns 409.

**Verification artifacts**:
- AC-01 → `policy-service/src/presentation/controllers/policy.controller.integration.spec.ts::POST /policies creates policy`
  (integration — Testcontainers)
  - Must fail if: handler does not call `CreatePolicyUseCase.execute()`
- AC-02 → `policy-service/src/application/use-cases/validate-policy.use-case.integration.spec.ts::violation creates row`
  (integration)
  - Must fail if: `policy_violations` insert is omitted in `ValidatePolicyUseCase`
- AC-03 → `policy-service/src/presentation/controllers/budget.controller.integration.spec.ts::duplicate budget returns 409`
  (integration)
  - Must fail if: `ConflictException` is not mapped to HTTP 409

---

### T19: Contract test — Kafka events (Pact)

**Files affected**:
- `policy-service/src/contract/policy-events.pact.spec.ts`

**Description**:
Mirrors the pattern established in `payment-service/src/contract/payment-events.pact.spec.ts`.

Uses `MessageConsumerPact` (not V3) from `@pact-foundation/pact`.
Tests two interactions:

1. **PolicyValidated** — consumer (Booking Service) expects:
   ```json
   {
     "eventType": "PolicyValidated",
     "aggregateId": "<string>",
     "data": { "travelerId": "<string>", "valid": true, "violations": [] }
   }
   ```

2. **PolicyViolationDetected** — consumer expects:
   ```json
   {
     "eventType": "PolicyViolationDetected",
     "data": {
       "travelerId": "<string>",
       "violations": [{ "rule": "<string>", "severity": "<string>" }],
       "requiresApproval": false
     }
   }
   ```

Pact dir: `process.cwd() + '/pacts'`.
No `finalize()` call (consistent with payment-service reference).

**Acceptance criteria**:
- AC-01: Pact test for `PolicyValidated` passes and writes a pact file.
- AC-02: Pact test for `PolicyViolationDetected` passes and writes a pact file.
- AC-03: `asynchronousBodyHandler` receives a message that matches the
  expected envelope shape.

**Verification artifacts**:
- AC-01 → `policy-service/src/contract/policy-events.pact.spec.ts::PolicyValidated interaction`
  (contract — Pact)
  - Must fail if: `eventType` field is absent from the published event
- AC-02 → `::PolicyViolationDetected interaction`
  (contract)
  - Must fail if: `data.violations` is missing from the event payload
- AC-03 → `::asynchronousBodyHandler validates envelope shape`
  (contract)
  - Must fail if: `aggregateId` is not present in the message body
