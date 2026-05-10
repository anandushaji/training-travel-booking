# Delta for policy-service — Policy Service (SM-05)

## ADDED Requirements

---

### Requirement: Policy CRUD

The system SHALL allow an authenticated ADMIN user to create, read, update,
and delete travel policies. Non-admin authenticated users SHALL be able to
read (list and get) policies but SHALL NOT be able to mutate them.

#### Scenario: Create policy — success

- GIVEN an authenticated ADMIN user
- WHEN `POST /policies` is called with valid `name`, `department`, and `rules`
- THEN a policy record is persisted in `travel_policies`
- AND the response is HTTP 201 with the created policy including `id`,
  `createdAt`, `updatedAt`, `version: 0`

#### Scenario: Create policy — duplicate name+department

- GIVEN a policy already exists with `name="Standard"` and `department="Engineering"`
- WHEN `POST /policies` is called with the same `name` and `department`
- THEN the system returns HTTP 409 with `error: "POLICY_ALREADY_EXISTS"`
- AND no new row is inserted

#### Scenario: Get policy by ID — found

- GIVEN a policy with `id=X` exists
- WHEN `GET /policies/X` is called by any authenticated user
- THEN the response is HTTP 200 with the full policy object

#### Scenario: Get policy by ID — not found

- GIVEN no policy with `id=X` exists
- WHEN `GET /policies/X` is called
- THEN the response is HTTP 404 with `error: "NOT_FOUND"`

#### Scenario: Update policy — success

- GIVEN a policy with `id=X` exists
- WHEN `PUT /policies/X` is called by an ADMIN with valid fields
- THEN the policy is updated in the DB
- AND `version` is incremented by 1
- AND `updatedAt` is refreshed
- AND the response is HTTP 200 with the updated policy

#### Scenario: Delete policy — success

- GIVEN a policy with `id=X` exists
- WHEN `DELETE /policies/X` is called by an ADMIN
- THEN the policy row is removed from `travel_policies`
- AND the response is HTTP 204

#### Scenario: Create / update / delete policy — non-ADMIN user

- GIVEN a user with role EMPLOYEE or MANAGER
- WHEN `POST /policies`, `PUT /policies/:id`, or `DELETE /policies/:id` is called
- THEN the response is HTTP 403 with `error: "FORBIDDEN"`

#### Scenario: Create policy — missing required field (input validation)

- GIVEN an authenticated ADMIN user
- WHEN `POST /policies` is called with a body that omits the required `name` field
- THEN the response is HTTP 400 with `error: "VALIDATION_ERROR"`
- AND the response body `details` array contains an entry identifying the `name` field as invalid
- AND no row is inserted in `travel_policies`

#### Scenario: Update policy — concurrent version conflict

- GIVEN a policy with `id=X` and `version=2` exists in the database
- WHEN two requests simultaneously `PUT /policies/X` arrive, each carrying `version=2`
- THEN exactly one request succeeds with HTTP 200 and the policy is saved with `version=3`
- AND the other request receives HTTP 409 with `error: "VERSION_CONFLICT"`

#### Scenario: Create policy — concurrent duplicate race

- GIVEN no policy with `name="Standard"` and `department="Engineering"` exists
- WHEN two requests simultaneously `POST /policies` with `name="Standard"` and `department="Engineering"` arrive
- THEN exactly one request receives HTTP 201 with the created policy
- AND the other request receives HTTP 409 with `error: "POLICY_ALREADY_EXISTS"`
- AND exactly one row exists in `travel_policies` with that name+department

---

### Requirement: Budget CRUD

The system SHALL allow ADMIN and MANAGER users to create and read
departmental budgets. All authenticated users SHALL be able to read
remaining-budget information.

#### Scenario: Create budget — success

- GIVEN an authenticated ADMIN or MANAGER user
- WHEN `POST /budgets` is called with `department`, `fiscalYear`, and `totalBudget`
- THEN a row is inserted in `departmental_budgets` with `spent = 0`
- AND the response is HTTP 201 with the created budget

#### Scenario: Create budget — duplicate department+year

- GIVEN a budget for `department="Engineering"`, `fiscalYear=2024` already exists
- WHEN `POST /budgets` is called with the same combination
- THEN the response is HTTP 409 with `error: "BUDGET_ALREADY_EXISTS"`

#### Scenario: Get remaining budget

- GIVEN a budget exists for `department=D`, `fiscalYear=Y`
- WHEN `GET /budgets/D/remaining?fiscalYear=Y` is called
- THEN the response is HTTP 200 with `{ department, fiscalYear, totalBudget, spent, remaining, percentageUsed, currency }`
- AND `remaining = totalBudget - spent`

---

### Requirement: Policy Validation

The system SHALL synchronously validate a booking request against the active
travel policy for the traveler's department and SHALL respond within 500 ms
under normal load (p95).

#### Scenario: Validation passes — all rules satisfied

- GIVEN a policy for `department=D` with `maxFlightCost=1000`, `allowedCabinClasses=["ECONOMY"]`, `advanceBookingDays=7`
- AND a traveler belonging to department D
- WHEN `POST /policies/validate` is called with `amount=800`, `cabinClass=ECONOMY`, `advanceBookingDays=10`
- THEN the response is HTTP 200 with `{ valid: true, violations: [], requiresApproval: false }`

#### Scenario: Validation fails — cabin class violation

- GIVEN a policy for department D with `allowedCabinClasses=["ECONOMY"]`
- WHEN the request has `cabinClass=BUSINESS`
- THEN the response is HTTP 200 with `valid: false`
- AND `violations` contains an entry `{ rule: "cabinClass", severity: "ERROR" }`

#### Scenario: Validation fails — cost exceeds maximum

- GIVEN a policy with `maxFlightCost=1000`
- WHEN the request has `amount=1500`
- THEN `valid: false` and `violations` contains `{ rule: "maxFlightCost", severity: "ERROR" }`

#### Scenario: Validation passes — cost exactly equals maximum

- GIVEN a policy with `maxFlightCost=1000`
- WHEN the request has `amount=1000` (equal to the maximum)
- THEN `valid: true` and no `maxFlightCost` violation is reported
  (the rule is `amount ≤ maxFlightCost`; equality is permitted)

#### Scenario: Validation fails — advance booking days insufficient

- GIVEN a policy with `advanceBookingDays=7`
- WHEN the request has `advanceBookingDays=3`
- THEN `valid: false` and `violations` contains `{ rule: "advanceBookingDays", severity: "ERROR" }`

#### Scenario: Requires approval — amount exceeds approval threshold

- GIVEN a policy with `requiresApproval=true`, `approvalThreshold=2000`
- WHEN the request has `amount=2500`
- THEN `requiresApproval: true` in the response
- AND a row is inserted in `policy_violations` with `requires_approval=true`

#### Scenario: No active policy for department

- GIVEN no active policy exists for the traveler's department
- WHEN `POST /policies/validate` is called
- THEN the response is HTTP 200 with `{ valid: true, violations: [], requiresApproval: false }`
  (no policy means no restriction)

#### Scenario: Kafka event published after validation

- GIVEN a successful validation request
- WHEN `POST /policies/validate` completes
- THEN a `PolicyValidated` (if valid) or `PolicyViolationDetected` (if invalid)
  event is published to Kafka topic `policy-events`
- AND the event conforms to the ADR-003 envelope schema

---

### Requirement: Traveler Service Circuit Breaker  [Circuit Breaker]

The system SHALL isolate failures in the Traveler Service such that
Traveler Service unavailability does not prevent policy validation from
completing.

#### Scenario: Circuit closed — department resolved from Traveler Service

- GIVEN the circuit breaker is closed
- WHEN `POST /policies/validate` is called
- THEN the `TravelerServiceClient` calls `GET /travelers/:travelerId`
- AND the traveler's department is used for policy lookup

#### Scenario: Circuit opens after threshold failures

- GIVEN the Traveler Service returns HTTP 500 for 10 consecutive requests
  (volumeThreshold=10, errorThresholdPercentage=50)
- WHEN the 10th failure is recorded
- THEN the circuit breaker transitions to OPEN
- AND the metric `traveler_service_cb_state{state="open"}` is emitted

#### Scenario: Circuit open — fallback to JWT department

- GIVEN the circuit breaker is OPEN
- WHEN `POST /policies/validate` is called
- THEN the Traveler Service HTTP call is NOT made
- AND the `department` field from the JWT payload is used for policy lookup
- AND the response returns a valid validation result (no error to the caller)

#### Scenario: Circuit half-open — probe call succeeds → closes

- GIVEN the circuit breaker is OPEN and 30 s have elapsed
- WHEN the next `POST /policies/validate` is called (probe)
- AND the Traveler Service responds HTTP 200
- THEN the circuit breaker transitions to CLOSED

---

### Requirement: Traveler Service Retry with Backoff  [Retries]

The system SHALL retry transient Traveler Service failures with exponential
backoff before escalating to the circuit breaker.

#### Scenario: Transient failure — retry succeeds

- GIVEN the Traveler Service returns HTTP 503 on the first attempt
- WHEN the retry interceptor fires
- THEN a second attempt is made after ≥ 200 ms delay
- AND if the second attempt succeeds, the caller receives the department

#### Scenario: All retries exhausted — error escalated

- GIVEN the Traveler Service returns HTTP 503 on all 3 attempts
- WHEN the 3rd retry fails
- THEN the error is propagated to the circuit breaker
- AND `traveler_service_retries_total` is incremented by 3

#### Scenario: Non-retryable error — no retry

- GIVEN the Traveler Service returns HTTP 404
- WHEN the client receives the response
- THEN no retry is performed
- AND HTTP 404 is propagated immediately

---

### Requirement: Policy Rules Cache Consistency  [Cache-aside + Cache Invalidation]

The system SHALL cache active policy rules per department in Redis to reduce
DB round-trips on the validation hot path.

#### Scenario: Cache hit — policy rules served from Redis

- GIVEN Redis contains `policy-service:policy:dept:Engineering` populated from a prior request
- WHEN `POST /policies/validate` is called for a traveler in Engineering
- THEN the policy rules are read from Redis (no DB query for policy rows)
- AND `redis_cache_hits_total{key_type="policy"}` is incremented

#### Scenario: Cache miss — repopulated from DB

- GIVEN Redis does NOT contain `policy-service:policy:dept:Engineering`
- WHEN `POST /policies/validate` is called for Engineering
- THEN the DB is queried for active policies in Engineering
- AND the result is written to Redis with TTL 900 s
- AND `redis_cache_misses_total{key_type="policy"}` is incremented

#### Scenario: Cache invalidated on policy mutation

- GIVEN `policy-service:policy:dept:Engineering` exists in Redis
- WHEN `PUT /policies/:id` is called for an Engineering policy
- THEN Redis key `policy-service:policy:dept:Engineering` is deleted
- AND the next validation for Engineering triggers a cache miss → DB repopulate

#### Scenario: Redis unavailable — fallback to DB

- GIVEN Redis is unreachable
- WHEN `POST /policies/validate` is called
- THEN the service queries the DB directly for policy rules
- AND a WARN log entry is emitted: "Redis unavailable; querying DB directly"
- AND the HTTP response is still returned successfully

---

### Requirement: Policy Idempotency  [Idempotency]

The system SHALL prevent duplicate policy and budget records when a
creation request is retried.

#### Scenario: Duplicate policy creation — returns 409

- GIVEN a policy with `name="Standard"`, `department="Engineering"` exists
- WHEN `POST /policies` is retried with the same `name` and `department`
- THEN HTTP 409 is returned with `error: "POLICY_ALREADY_EXISTS"`
- AND no duplicate row is inserted in `travel_policies`

#### Scenario: Duplicate budget creation — returns 409

- GIVEN a budget for `department="Engineering"`, `fiscalYear=2024` exists
- WHEN `POST /budgets` is retried with the same combination
- THEN HTTP 409 is returned with `error: "BUDGET_ALREADY_EXISTS"`
- AND no duplicate row is inserted in `departmental_budgets`

---

### Requirement: Service Health and Readiness

The system SHALL expose `/health` (liveness) and `/ready` (readiness)
endpoints that are unauthenticated.

#### Scenario: Service healthy

- GIVEN the service has started
- WHEN `GET /health` is called
- THEN HTTP 200 is returned with `{ status: "healthy", timestamp: <ISO-8601> }`

#### Scenario: Service ready — DB and Redis connected

- GIVEN the DB and Redis connections are established
- WHEN `GET /ready` is called
- THEN HTTP 200 is returned with `{ status: "ready", database: "connected" }`

---

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
