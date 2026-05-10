# Architect Review Report: frontend-auth

**Reviewer Role**: Solution Architect  
**Verdict**: PASS WITH WARNINGS  
**Sub-Module**: [SM-FE-02] Authentication Feature  
**ADRs Reviewed**: ADR-001, ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-007, ADR-008, ADR-010, ADR-011  
**Date**: 2026-05-04  
**Precondition**: BA Review (Step 1) must be complete before this report is acted upon.

---

## Checklist Results

| ID | Severity | Item | Status | Notes |
|---|---|---|---|---|
| AR-ADR-01 | BLOCKER | All applicable ADRs reviewed | PASS | ADR-005 (security/JWT storage), ADR-006 (API Gateway as JWT issuer), ADR-007 (observability), ADR-008 (NFRs), ADR-010 (testing) all checked |
| AR-ADR-02 | BLOCKER | No ADR-mandated pattern absent without exception | PASS | All patterns accounted for with sound reasoning |
| AR-ADR-03 | BLOCKER | No design violates an Accepted ADR | PASS | Redux-memory-only token storage explicitly satisfies ADR-005 Zero Trust principle |
| AR-ADR-04 | BLOCKER | ADR deviations documented in proposal.md | PASS | No violations; deviations (OQ-02 cookie vs memory) documented and resolved |
| AR-ADR-05 | WARNING | Patterns requiring governing ADR reference it in design.md PSL | PASS | Cache Invalidation references RTK Query/Redux; governing ADR-002 (Redis/cache infra) is noted as not applicable since this is in-memory browser state, not Redis |
| AR-ADR-06 | WARNING | No deprecated ADR used for justification | PASS | N/A — all referenced ADRs are Accepted |
| AR-ADR-07 | INFO | Significant uncovered decisions noted in proposal.md | PASS | OQ-01 through OQ-03 documented and decided |
| AR-PSL-01 | BLOCKER | PSL present as first section of design.md | PASS | Present and complete — all 13 patterns addressed |
| AR-PSL-02 | BLOCKER | Applied patterns have design section with concrete values | PASS | Cache Invalidation section in design.md is concrete: `baseApi.util.resetApiState()` synchronously on `logout` dispatch |
| AR-PSL-03 | BLOCKER | Applied patterns have SHALL requirement + GIVEN/WHEN/THEN scenario | PASS | REQ-AUTH-01-S03 covers Cache Invalidation scenario; REQ-AUTH-01 has the SHALL |
| AR-PSL-04 | BLOCKER | "Already in place" patterns genuinely covered by existing infra | PASS | Timeouts and Retries are legitimately from SM-FE-01 `baseQueryWithTimeout` / `baseQueryWithRetry` with no new code needed |
| AR-PSL-05 | WARNING | Rationale for each PSL decision is sound | PASS | All "Not applicable" rationales are credible and technically accurate for a single-process browser SPA |
| AR-PSL-06 | WARNING | Standard patterns not silently omitted | PASS | Timeouts and Retries explicitly addressed (already in place); no DB writes, no event publishing |
| AR-PSL-07 | WARNING | Bulkheads considered for new downstream dependencies | PASS | Correctly marked N/A — single-threaded JS, no thread pool; backend circuit breakers own this concern |
| AR-PSL-08 | INFO | PSL architectural assumptions populated | PASS | Present and complete |
| AR-DOM-01 | BLOCKER | No cross-service DB reads | PASS | Frontend module — no database access of any kind |
| AR-DOM-02 | BLOCKER | No cross-service DB writes | PASS | Same as above |
| AR-DOM-03 | BLOCKER | Cross-service reads via API/read model only | PASS | All data reads go through API Gateway REST endpoints |
| AR-DOM-04 | BLOCKER | Cross-service writes via events/saga | PASS | No cross-service writes from frontend; logout is fire-and-forget HTTP POST |
| AR-DOM-05 | BLOCKER | Does not expose another service's internal data model | PASS | `JwtUserPayload` is a frontend-local projection of JWT claims — not a leakage of traveler-service internals |
| AR-DOM-06 | WARNING | Public API / event contracts versioned | PASS | Consuming `/api/v1/...` versioned paths; no new contracts emitted |
| AR-DOM-07 | WARNING | Shared domain concepts referenced by ID only | PASS | `userId` (sub claim UUID) is referenced by ID; full traveler object not embedded |
| AR-DOM-08 | WARNING | No domain logic from another bounded context | WARN | `RoleGuard` implements role-hierarchy ranking (`ADMIN > MANAGER > EMPLOYEE`). This hierarchy is also enforced server-side by API Gateway / services. Duplicating it in the frontend is pragmatic but creates a potential drift risk if roles change. See Warning W-01. |
| AR-DOM-09 | INFO | New shared types added to CONTRACTS.md | INFO | `JwtUserPayload` / `TokenPairResponse` are frontend-local types; not a shared contract. No action required. |
| AR-RES-01 | BLOCKER | Every outbound call has an explicit timeout | PASS | 10s timeout enforced by `baseQueryWithTimeout` (SM-FE-01); explicitly confirmed in design.md Resilience section |
| AR-RES-02 | BLOCKER | Retries only on idempotent operations | PASS | SAFE_METHODS restriction from SM-FE-01 means POST /login and POST /refresh are never auto-retried |
| AR-RES-03 | BLOCKER | Circuit Breaker on every slow-failure external call | PASS (N/A) | Correctly not applied at frontend layer — API Gateway owns circuit breaking per ADR-006. Rationale is sound. |
| AR-RES-04 | BLOCKER | Circuit Breaker fallback is safe | PASS (N/A) | N/A |
| AR-RES-05 | WARNING | Timeout values within PROJECT.md defaults | PASS | 10s matches `HTTP read timeout: 10s` in PROJECT.md Section 7 |
| AR-RES-06 | WARNING | Retry backoff uses exponential backoff with jitter | PASS (N/A) | POST endpoints excluded from retry; GET retries handled by SM-FE-01 |
| AR-RES-07 | WARNING | Retry count bounded by deadline, not count alone | PASS (N/A) | N/A for auth endpoints |
| AR-RES-08 | WARNING | Non-retryable error codes explicitly listed | PASS | 401/400/403 listed as non-retryable in SM-FE-01 SAFE_METHODS design |
| AR-RES-09 | WARNING | Circuit Breaker thresholds consistent | PASS (N/A) | N/A |
| AR-RES-10 | INFO | Bulkheads considered for new downstream dependencies | INFO | Correctly dismissed for single-threaded JS runtime |
| AR-TXN-01 | BLOCKER | DB write + event publish uses Outbox | PASS (N/A) | No DB writes; no event publishing from frontend |
| AR-TXN-02 | BLOCKER | Cross-service transaction uses Saga | PASS (N/A) | Login is a synchronous single-service operation |
| AR-TXN-03 | BLOCKER | Saga compensating transactions defined | PASS (N/A) | N/A |
| AR-TXN-04 | BLOCKER | Idempotency guard for duplicate-request endpoints | PASS | Login POST duplicates simply re-authenticate — explicitly justified. Refresh token is single-use by server-side rotation. |
| AR-CAC-01 | BLOCKER | Caching infra matches PROJECT.md | PASS | Cache Invalidation applied to RTK Query in-memory cache (browser Redux state), not a new Redis instance. No new caching infrastructure introduced. |
| AR-CAC-02 | BLOCKER | Cache unavailability handled gracefully | PASS (N/A) | In-memory browser cache — unavailability cannot occur independently of the JS runtime |
| AR-CAC-03 | BLOCKER | All write paths that change cached data listed as invalidation triggers | PASS | `logout` is the only invalidation trigger; all RTK Query entries evicted synchronously. Login does not need invalidation (fresh session). |
| AR-CAC-04 | WARNING | Cache key schema follows project convention | PASS (N/A) | RTK Query manages its own internal key schema; no Redis keys |
| AR-CAC-05 | WARNING | TTL appropriate for data change frequency | PASS | RTK Query per-endpoint `keepUnusedDataFor` governed by SM-FE-01 defaults; auth tokens use server-enforced TTL |
| AR-CTR-01 | BLOCKER | Every API endpoint has complete schema | PASS | `design.md` API/Interface Contracts section covers all 3 endpoints with request, response 200, and error status codes. Backed by `openapi-api-gateway.yaml`. |
| AR-CTR-02 | BLOCKER | Domain events have complete schema | PASS (N/A) | No domain events produced by frontend |
| AR-CTR-03 | BLOCKER | No backwards-incompatible contract change | PASS | This change only *consumes* existing api-gateway contracts; no contract is modified |
| AR-CTR-04 | WARNING | New contracts registered in CONTRACTS.md | WARN | No CONTRACTS.md file referenced or updated. The consumed API contracts (`/auth/login`, `/auth/refresh`, `/auth/logout`) are new frontend-layer consumers. See Warning W-02. |
| AR-CTR-05 | WARNING | Event schemas use explicit version field | PASS (N/A) | No events |
| AR-CTR-06 | WARNING | API contracts include consistent error response schema | PASS | `ErrorResponse` schema in `openapi-api-gateway.yaml` includes `error`, `message`, `correlationId`, `timestamp` — matches PROJECT.md standard error format |
| AR-CTR-07 | INFO | Contract tests identified in tasks.md | INFO | No Pact/contract tests in tasks.md. Frontend is a consumer of api-gateway. See Suggestion S-01. |
| AR-OBS-01 | BLOCKER | Observability section present with specific metrics/logs/traces | PASS | design.md has detailed tables for structured log events and metrics counters |
| AR-OBS-02 | BLOCKER | Applied resilience patterns emit required signals | PASS (N/A) | Retry/Circuit Breaker not newly applied; SM-FE-01 owns those signals |
| AR-OBS-03 | BLOCKER | Applied caching pattern emits hit/miss counters | WARN | Cache Invalidation is applied, but no `cache_hit_total` / `cache_miss_total` metric is defined for the RTK Query cache. The PROJECT.md observability standards (Section 8) list cache hit/miss as required signals when caching is applied. The design emits `frontend_auth_logout_total` but does not emit a cache-eviction confirmation metric. See Warning W-03. |
| AR-OBS-04 | BLOCKER | Applied Outbox emits pending count/relay lag | PASS (N/A) | N/A |
| AR-OBS-05 | BLOCKER | Applied Saga emits step-level events | PASS (N/A) | N/A |
| AR-OBS-06 | WARNING | Metric names/labels consistent with observability standards | PASS | `frontend_auth_*` naming is coherent with SM-FE-01 pattern and is service-prefixed |
| AR-OBS-07 | WARNING | Log entries include correlation/request ID | WARN | Login failure (network) and token refresh failure log entries include `correlationId` — but login success, logout, and token refresh success log entries do NOT include `correlationId`. The PROJECT.md required log fields include `correlationId` as mandatory. See Warning W-04. |
| AR-OBS-08 | WARNING | Error log entries include structured fields | PASS | Error entries in design.md error handling table include `statusCode` and `correlationId` |
| AR-OBS-09 | INFO | Alerting thresholds identified | INFO | No alerting thresholds defined. Non-blocking for a frontend SPA; alert rules are typically defined in Prometheus/Grafana configs outside the spec. |
| AR-SEC-01 | BLOCKER | Auth enforced on every non-public endpoint | PASS | `PrivateRoute` (SM-FE-01) blocks access to all protected routes; `/login` is the only intentionally public route |
| AR-SEC-02 | BLOCKER | Authorisation specified with roles | PASS | `RoleGuard` enforces role hierarchy; renders null for insufficient role |
| AR-SEC-03 | BLOCKER | No hardcoded secrets | PASS | `REACT_APP_API_URL` is environment variable; JWT_SECRET is server-side only |
| AR-SEC-04 | BLOCKER | PII / sensitive data handling documented | PASS | Tokens stored in Redux memory only; no `localStorage`, `sessionStorage`, cookies documented with ADR-005 reference; log exclusion of `password`/tokens explicitly specified |
| AR-SEC-05 | WARNING | Input validation specified for every API endpoint | PASS | Zod schema on LoginForm (`z.string().email()`, `z.string().min(8)`); server-side validation covered by api-gateway OpenAPI spec |
| AR-SEC-06 | WARNING | Auth mechanism consistent with project standard | PASS | JWT Bearer, 8h access token, 7d refresh, RBAC — all consistent with ADR-005 |
| AR-SEC-07 | WARNING | Data in transit encrypted | PASS | All calls go through API Gateway over HTTPS (TLS 1.3 per ADR-005) |
| AR-SEC-08 | INFO | ORM / parameterised queries | INFO (N/A) | Frontend module — no DB queries |
| AR-CON-01 | WARNING | Technology choices consistent with PROJECT.md tech stack | PASS | React 18, RTK Query, Redux Toolkit, react-hook-form, Zod, MSW v2 — all consistent with ADR-002 and SM-FE-01 precedents |
| AR-CON-02 | WARNING | Architectural style consistent with existing services | PASS | Feature-slice structure (`src/features/auth/`), common hooks pattern, barrel exports — all consistent with SM-FE-01 layout |
| AR-CON-03 | WARNING | No re-implementation of existing shared functionality | PASS | Reuses SM-FE-01 `baseQueryWithRetry`, `baseQueryWithTimeout`, `logger`, `metrics`, `notificationSlice`, common components |
| AR-CON-04 | WARNING | New cross-cutting patterns documented in proposal.md | PASS | The mutex-based refresh serialisation is a new pattern within the frontend; it is described in both proposal.md and design.md |

---

## ADR Conformance

| ADR | Title | Applicable? | Status | Notes |
|---|---|---|---|---|
| ADR-001 | Architecture Style (DDD + Microservices) | Partial | PASS | Frontend module; bounded context separation respected via API Gateway |
| ADR-002 | Technology Stack | Yes | PASS | React 18, TypeScript 5, Vitest, MSW v2 — all compliant |
| ADR-003 | Communication Patterns (REST + Events) | Yes | PASS | Consumes REST API Gateway endpoints; no event publishing |
| ADR-004 | Data Management (Database-per-service) | N/A | PASS | No database; Redux in-memory store is not a shared data store |
| ADR-005 | Security Model (Zero Trust, JWT, RBAC) | Yes — Primary | PASS | Tokens in Redux memory only; no localStorage/cookies; Zod validation; no secrets in logs; RBAC via RoleGuard |
| ADR-006 | API Gateway (centralized auth, routing) | Yes | PASS | All auth calls target API Gateway at `:4000/api/v1`; gateway is sole JWT issuer; frontend never issues tokens |
| ADR-007 | Monitoring & Observability | Yes | PASS WITH GAPS | Structured logs and metrics defined; `correlationId` missing from some success events (W-04); cache hit/miss metric absent (W-03) |
| ADR-008 | NFRs (p95 < 500ms, 80% coverage) | Yes | PASS | 80% test coverage target stated in spec NFR table; 10s timeout aligns with read timeout standard |
| ADR-010 | Testing Strategy | Yes | PASS | Unit tests for all components; MSW v2 for integration; coverage target ≥ 80% per spec |
| ADR-011 | Error Handling (circuit breaker, backoff, idempotency) | Yes | PASS | Non-retryable 4xx codes respected; refresh idempotency handled by server-side token rotation |

### Violations

None (no BLOCKER-level ADR violations found).

---

## Pattern Selection Log Audit

| Pattern | Spec Decision | Architect Assessment | Notes |
|---|---|---|---|
| Database-per-service | Not applicable | AGREE | Frontend module — no database |
| CQRS | Not applicable | AGREE | Single-process Redux is not a CQRS system; distinction is correct |
| Saga (Choreography) | Not applicable | AGREE | Login is synchronous single-service; no distributed tx |
| Saga (Orchestration) | Not applicable | AGREE | Same |
| Outbox | Not applicable | AGREE | No event publishing |
| Idempotency | Not applicable | AGREE | Duplicate login re-authenticates safely; refresh is single-use by server |
| Timeouts | Already in place | AGREE | `baseQueryWithTimeout` in SM-FE-01 — no new code required |
| Retries | Already in place | AGREE | `baseQueryWithRetry` SAFE_METHODS restriction correct for auth POSTs |
| Circuit Breaker | Not applicable | AGREE | Frontend circuit breaking is not standard; ADR-006 assigns this to API Gateway |
| Bulkheads | Not applicable | AGREE | Single-threaded JS; no thread pool to partition |
| Cache-aside | Not applicable | AGREE | Auth tokens are not cache-store resident |
| Read-through | Not applicable | AGREE | Same |
| Write-through | Not applicable | AGREE | Same |
| Cache Invalidation | **Applied** | AGREE | RTK Query `resetApiState()` on logout is the correct pattern for preventing data leakage across user sessions |

### Pattern Gaps (should be added)

None identified.

### Pattern Misapplications (applied incorrectly)

None identified.

---

## Domain Boundary Integrity

| Check | Status | Notes |
|---|---|---|
| Owns its data store | PASS | No data store; Redux in-memory state is session-scoped to the browser tab |
| No direct cross-service DB access | PASS | Frontend module — impossible by construction |
| Cross-service reads via API/read model | PASS | All reads via API Gateway REST (`/api/v1/auth/*`) |
| Cross-service writes via events/saga | PASS | No writes to other services; logout is fire-and-forget HTTP POST |
| Public interface versioned | PASS | Consuming `/api/v1/` versioned paths; no new public interface emitted |

---

## Resilience / Transaction / Caching Assessment

### Resilience

| Aspect | Assessment | Notes |
|---|---|---|
| Timeout coverage | PASS | 10s blanket timeout from SM-FE-01; consistent with PROJECT.md read timeout default |
| Retry exclusion of POSTs | PASS | SAFE_METHODS restriction correctly excludes login/refresh from auto-retry |
| Single-reauth mutex | PASS | Promise-based mutex prevents concurrent refresh storms; design is technically sound |
| Refresh failure handling | PASS | Forced logout on failed refresh is the correct safe-fail behaviour |
| Logout failure handling | PASS | Best-effort fire-and-forget is correct; refresh token expires naturally in 7d |

### Caching

| Aspect | Assessment | Notes |
|---|---|---|
| Infrastructure | PASS | RTK Query in-memory browser cache — no new server-side cache infrastructure |
| Invalidation trigger completeness | PASS | `logout` is the only required trigger; login creates a new isolated session |
| Synchronous eviction | PASS | `resetApiState()` is synchronous — zero consistency window |
| Multi-user data leakage prevention | PASS | Correctly motivated by shared-terminal scenario |

---

## Observability & Security Assessment

| Area | Status | Notes |
|---|---|---|
| Required metrics present | PASS | `frontend_auth_login_total`, `frontend_auth_refresh_total`, `frontend_auth_logout_total` with appropriate labels |
| Cache hit/miss metric | **WARN** | Cache Invalidation is applied but no cache-eviction or cache-hit/miss counter defined (W-03) |
| Log events: coverage | PASS | 7 distinct log events covering success, failure, and forced-logout paths |
| Log events: correlationId completeness | **WARN** | `correlationId` missing from login-success, token-refresh-success, and logout log entries (W-04) |
| Auth consistent with standard | PASS | JWT Bearer, ADR-005, RBAC, 8h access / 7d refresh — fully consistent |
| Input validation specified | PASS | Zod schema on LoginForm; no raw user input reaches API without validation |
| Secrets management | PASS | `JWT_SECRET` is server-side only; `REACT_APP_API_URL` is an env var; no secrets in source |
| Sensitive data exclusion from logs | PASS | Explicit prohibition on logging `password`, `accessToken`, `refreshToken` — spec enforces this as a SHALL |

---

## Consistency With Existing Architecture

The design is architecturally native to the project. It extends the SM-FE-01 foundation in the expected way — wrapping `baseQueryWithRetry` rather than replacing it, reusing `notificationSlice`, `logger`, `metrics`, and common UI components, and following the same feature-slice directory layout (`src/features/auth/`). The mutex-based refresh serialisation is a well-understood pattern for RTK Query reauth and introduces no new libraries. The decision to apply Cache Invalidation via `baseApi.util.resetApiState()` on logout is architecturally sound and does not introduce server-side cache infrastructure. The role hierarchy constant in `RoleGuard` is a minor duplication of server-side logic but is a standard practice for frontend authorization UX; the risk is manageable if role values remain stable (which they do, as an enum in `openapi-api-gateway.yaml`).

---

## Warnings

### W-01 — Role Hierarchy Duplication Risk (AR-DOM-08)

**Severity**: WARNING  
**Location**: `design.md` → `RoleGuard`; `tasks.md` T10  
**Issue**: The role hierarchy ranking (`EMPLOYEE=1, MANAGER=2, ADMIN=3`) is hardcoded in the frontend `RoleGuard`. If the API Gateway or traveler-service adds a new role or changes the hierarchy, the frontend will drift silently without a type error or build failure.  
**Recommendation**: Document the `ROLE_RANK` constant as a contract-derived value in `auth.types.ts` with a comment linking it to the `openapi-api-gateway.yaml` role enum. Add a build-time assertion or unit test that the set of keys in `ROLE_RANK` equals the set of values in the `UserRole` union type, so that a new role added to the type would cause a compile error rather than a silent gap.

### W-02 — Consumed API Contracts Not Registered (AR-CTR-04)

**Severity**: WARNING  
**Location**: `design.md` API/Interface Contracts section  
**Issue**: The three auth endpoints (`/auth/login`, `/auth/refresh`, `/auth/logout`) are consumed for the first time by the frontend in this change. No `CONTRACTS.md` or equivalent consumer-registration file is referenced or updated.  
**Recommendation**: Create or update `openspec/CONTRACTS.md` (or `docs/contracts/consumer-registry.md`) to record that `frontend` is a consumer of these three api-gateway endpoints. This is required for the consumer-driven contract test strategy (ADR-010 Pact requirement).

### W-03 — Cache Eviction Metric Missing (AR-OBS-03)

**Severity**: WARNING  
**Location**: `design.md` Observability section  
**Issue**: Cache Invalidation is listed as an applied pattern. PROJECT.md Section 8 observability standards require `cache_hit_total` and `cache_miss_total` signals for any applied caching pattern. The design defines no metric for cache eviction or cache size.  
**Recommendation**: Add a `frontend_rtk_cache_reset_total` counter (incremented on every `logout`-triggered `resetApiState()` call) to the metrics table in `design.md`, and add a corresponding spec scenario or log event confirming the eviction occurred. This satisfies the spirit of the cache observability requirement for an in-memory browser cache where hit/miss in the Redis sense does not apply.

### W-04 — correlationId Missing From Non-Error Log Events (AR-OBS-07)

**Severity**: WARNING  
**Location**: `design.md` Observability section — log events table  
**Issue**: PROJECT.md Section 8 required log fields include `correlationId` as mandatory. The login-success, token-refresh-success, and logout (both variants) log entries list context fields `{ userId, email, role }` or `{ userId }` but do not include `correlationId`. Only the network-failure log events include `correlationId`.  
**Recommendation**: Add `correlationId` (extracted from the API response `ErrorResponse.correlationId` or from a generated UUID for user-initiated events) to all log entries. For login-success and refresh-success, the `correlationId` is available in the API response headers (`X-Correlation-ID`). Update `design.md` Observability log table and the spec REQ-AUTH-08 verification scenario to assert that `correlationId` is present.

---

## Summary

The SM-FE-02 authentication design is architecturally sound and fully compliant with the primary governing ADRs — most critically ADR-005 (tokens in Redux memory only, no localStorage/cookies, no secrets in logs, RBAC via `RoleGuard`), ADR-006 (API Gateway as sole JWT issuer, all auth flows targeting `:4000/api/v1`), and ADR-002 (tech stack consistency). The Pattern Selection Log is complete and the reasoning is technically credible for a browser SPA context. Domain boundary integrity is clean — this is a pure frontend module with no database and no cross-service coupling beyond well-defined REST contracts. The resilience design (timeout inheritance, POST retry exclusion, single-reauth mutex) is correct and appropriately delegates circuit breaking to the API Gateway layer. No BLOCKER-level violations were found. Four warnings require attention before implementation proceeds: role-hierarchy drift risk (W-01), missing consumer contract registration (W-02), absent cache-eviction metric (W-03), and incomplete `correlationId` coverage in log events (W-04). None of these are blockers, but W-03 and W-04 represent minor but concrete gaps against the project's observability standard (ADR-007). The design is approved to proceed to QA Review (Step 3) with the understanding that the warnings are addressed in the implementation tasks or via a follow-up amendment to `design.md`.

---

## Required Fixes

None (no BLOCKER items failed).

---

## Suggestions (non-blocking)

- **S-01**: Add a Pact consumer contract test task to `tasks.md` for the three api-gateway auth endpoints. ADR-010 mandates Pact for all API consumers; this is absent from the current tasks list.
- **S-02**: Consider adding a `frontend_auth_session_duration_seconds` histogram metric (recorded from login to forced/voluntary logout) as a useful business observability signal for session health.
- **S-03**: The `logoutAction` thunk (T03) that dispatches both `logout()` and `resetApiState()` should be tested for the case where `baseApi` is not yet initialised (e.g., logout called before any RTK Query hydration). Defensive null-check on `baseApi.util` would prevent a rare but possible edge case.

---

> **Handoff**: Pass this report to `qa-reviewer` (Step 3 of 4) along with the change folder at `openspec/changes/frontend-auth/`.
