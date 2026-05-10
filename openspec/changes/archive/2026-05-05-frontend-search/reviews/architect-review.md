# Architect Review Report: frontend-search

**Reviewer Role**: Solution Architect
**Verdict**: FAIL
**Sub-Module**: [SM-FE-03] Flight Search Feature
**ADRs Reviewed**: ADR-001, ADR-002, ADR-005, ADR-006, ADR-007, ADR-008, ADR-010, ADR-011

---

## Checklist Results

| ID | Item | Status | Notes |
|---|---|---|---|
| AR-ADR-01 | All applicable ADRs reviewed | PASS | ADR-001 through ADR-011 reviewed |
| AR-ADR-02 | No ADR-mandated pattern absent without exception | WARN | Circuit Breaker (ADR-011) applicability at frontend layer not addressed — CB lives at gateway (ADR-006) but design doesn't acknowledge this |
| AR-ADR-03 | No pattern violates an accepted ADR | WARN | Per-card policy API design (N simultaneous GET calls per search) poses rate-limit collision risk per ADR-006 (100 req / 15 min / user) |
| AR-ADR-04 | ADR deviations documented in proposal | PASS | No formal deviation; applicability gaps are omissions, not deliberate overrides |
| AR-ADR-05 | Governing ADRs referenced in Pattern Selection Log | FAIL | No Pattern Selection Log exists in design.md |
| AR-ADR-06 | Deprecated ADRs not used as justification | PASS | No deprecated ADRs cited |
| AR-ADR-07 | Significant uncovered decisions flagged for new ADR | PASS | No new infrastructure introduced |
| AR-PSL-01 | Pattern Selection Log present as first section of design.md | FAIL | Section is entirely absent — BLOCKER |
| AR-PSL-02 | Applied patterns have concrete config values in design.md | FAIL | Caching TTL values present, but no PSL section wraps them |
| AR-PSL-03 | Applied patterns have SHALL + scenario in delta spec | WARN | RTK Query caching applied but no WCAG/performance/observability patterns have spec entries |
| AR-PSL-04 | "Already in place" patterns genuinely covered by existing infra | PASS | Timeout/retry infra from SM-FE-01/02 is genuinely in place |
| AR-PSL-05 | Not-applicable rationale is credible | FAIL | Cannot evaluate — PSL is absent |
| AR-PSL-06 | Standard patterns not silently omitted | WARN | Circuit Breaker and Correlation ID propagation not addressed in design |
| AR-PSL-07 | Bulkheads considered for new downstream dependency | WARN | policyApi introduces a new downstream (Policy Service); N-per-result call fan-out not bounded |
| AR-PSL-08 | Architectural assumptions populated | FAIL | PSL absent |
| AR-DOM-01 | No cross-service DB read | PASS | Frontend only; no DB access |
| AR-DOM-02 | No cross-service DB write | PASS | Frontend only; no DB access |
| AR-DOM-03 | Cross-service reads via API/read model only | PASS | All reads via RTK Query → API Gateway → backend service |
| AR-DOM-04 | Cross-service writes via domain events/saga | PASS | N/A for read-only search feature |
| AR-DOM-05 | No internal data model leakage | PASS | FlightOffer and AirportOption are view models only |
| AR-DOM-06 | Public contracts versioned | PASS | Consuming existing versioned API Gateway contracts; no new API published |
| AR-DOM-07 | Shared concepts referenced by ID | PASS | offerId, travelerId referenced by ID only |
| AR-DOM-08 | No domain logic from another bounded context | WARN | Policy compliance derived inside FlightCard component. Policy validation logic should be owned by Policy Service — this is acceptable as a read (calling the service), but the badge rendering decision logic (compliant / exceeds-policy) belongs to the UI layer. Low risk, but design should explicitly note this is a display concern |
| AR-DOM-09 | New shared types registered in CONTRACTS.md | PASS | No new contracts introduced — consuming existing endpoints |
| AR-RES-01 | All outbound calls have explicit timeout | PASS | `baseQueryWithTimeout.ts` 10s timeout applies globally to all RTK Query calls |
| AR-RES-02 | Retries only on idempotent operations | PASS | `baseQueryWithRetry.ts` restricts retries to SAFE_METHODS (GET/HEAD/OPTIONS) — all three new API calls are GET |
| AR-RES-03 | Circuit Breaker on all synchronous external calls | WARN | CB is handled by API Gateway (ADR-006: 50% failure / 30s window). Frontend has no CB. Design does not explicitly acknowledge this delegation — ambiguous to future implementers |
| AR-RES-04 | Circuit Breaker has safe fallback | WARN | API Gateway CB fallback not documented from the frontend's perspective. FlightResults error banner handles the observable outcome, but the linkage to gateway CB is not stated |
| AR-RES-05 | Timeout values within PROJECT.md ranges | PASS | 10s is consistent with project-wide default |
| AR-RES-06 | Retry uses exponential backoff with jitter | PASS | `baseQueryWithRetry.ts` (established SM-FE-01) uses exponential backoff |
| AR-RES-07 | Retry bounded by deadline not only count | PASS | `TOTAL_DEADLINE_MS = 30_000` in `baseQueryWithRetry.ts` |
| AR-RES-08 | Non-retryable error codes explicit | PASS | SAFE_METHODS retry; 4xx not retried per existing implementation |
| AR-RES-09 | CB thresholds consistent with existing services | PASS | N/A — CB at gateway layer |
| AR-RES-10 | Bulkheads considered for new dependency | WARN | 50-offer search → 50 simultaneous policy calls; no concurrency cap. Risk of flooding Policy Service under normal usage |
| AR-TXN-01–09 | Transaction / Saga / Outbox patterns | PASS | N/A — no backend writes in search feature |
| AR-CAC-01 | Cache infrastructure matches PROJECT.md | PASS | Client-side RTK Query in-memory cache; distinct from server-side Redis (PROJECT.md). Frontend caching is appropriate at this layer |
| AR-CAC-02 | Cache unavailability handled gracefully | PASS | RTK Query falls back to network on cache miss by design |
| AR-CAC-03 | All write paths listed as invalidation triggers | PASS | Read-only feature; no write paths |
| AR-CAC-04 | Cache key schema follows convention | PASS | RTK Query auto-keys by endpoint + serialized args |
| AR-CAC-05 | TTL appropriate for data change frequency | WARN | Policy TTL 60s: adequate. Flight search TTL 300s: matches backend cache. Airport TTL 600s: airports change rarely — acceptable. However, a flight price change between search and booking (within 5-min window) is not flagged as a known limitation |
| AR-CAC-06 | Write-through/read-through only if middleware supports | PASS | Cache-aside pattern via RTK Query |
| AR-CAC-07 | Cold-start stampede risk addressed | PASS | N/A — client-side cache, single user session |
| AR-CAC-08 | Shared cache namespace isolation | PASS | Per-user browser memory; no cross-user sharing |
| AR-CTR-01 | All API endpoints have complete schema | PASS | Consuming existing OpenAPI-documented endpoints |
| AR-CTR-02 | Domain events have complete schema | PASS | N/A — no events emitted |
| AR-CTR-03 | No backwards-incompatible contract changes | PASS | additive-only (new reducers, new routes) |
| AR-CTR-04 | New contracts registered in CONTRACTS.md | PASS | No new contracts published |
| AR-CTR-05 | Event schemas versioned | PASS | N/A |
| AR-CTR-06 | Error responses consistent with standard format | PASS | FlightResults error banner consumes existing `baseQueryWithReauth` error format |
| AR-CTR-07 | Contract tests required in tasks.md | WARN | No contract test task listed for RTK Query endpoint schema validation |
| AR-OBS-01 | Observability section present in design.md with specific signals | FAIL | Section entirely absent — BLOCKER |
| AR-OBS-02 | Resilience patterns emit required signals | FAIL | Retry count / circuit state not mentioned (retry telemetry is in `baseQueryWithRetry.ts` metrics but not referenced for this change) |
| AR-OBS-03 | Cache patterns emit hit/miss counters | FAIL | No cache hit/miss counter design for RTK Query (client-side; Prometheus not applicable, but no alternative browser telemetry defined) |
| AR-OBS-04–05 | Outbox / Saga signals | PASS | N/A |
| AR-OBS-06 | Metric names consistent with project standards | WARN | No frontend metric design at all |
| AR-OBS-07 | Logs include correlation/request ID | WARN | X-Correlation-ID propagation from API Gateway responses not explicitly carried through to error logs |
| AR-OBS-08 | Error logs include structured fields | WARN | No error boundary / structured error log design in spec or design.md |
| AR-OBS-09 | Alerting thresholds identified | WARN | None |
| AR-SEC-01 | Auth enforced on all non-public endpoints | PASS | `/search` wrapped in `PrivateRoute`; API calls use `baseQueryWithReauth` (Bearer injection) |
| AR-SEC-02 | Authorization roles specified | PASS | All authenticated employees can search; no admin-only data in scope |
| AR-SEC-03 | Secrets managed per project standard | PASS | `window.__ENV__` runtime injection; no hardcoded values |
| AR-SEC-04 | PII handled and documented | PASS | FlightOffer contains no traveler PII; search params (airports, dates) are not PII |
| AR-SEC-05 | Input validation specified | WARN | Zod schema described in design but not specified (field rules, max lengths, format patterns) in the spec |
| AR-SEC-06 | Auth mechanism consistent with standard | PASS | JWT Bearer via `baseQueryWithReauth` — consistent with ADR-005 |
| AR-SEC-07 | Data in transit encrypted | PASS | All calls via HTTPS through API Gateway |
| AR-SEC-08 | No string concatenation for queries | PASS | RTK Query serializes params as URLSearchParams |
| AR-CON-01 | Technology choices consistent with PROJECT.md | PASS | React 18, RTK Query, MUI v5, Zod, Vitest — all per ADR-002 |
| AR-CON-02 | Architectural layering consistent | PASS | feature-slice pattern with components/pages/hooks/slice/api mirrors SM-FE-02 auth feature |
| AR-CON-03 | No reimplementation of existing shared utilities | PASS | `useDebounce`, `baseQueryWithReauth`, `baseApi`, `PrivateRoute` all reused |
| AR-CON-04 | New cross-cutting patterns flagged for ADR | PASS | No new cross-cutting patterns; `policyApi.ts` follows existing `flightApi.ts` injection convention |
| AR-CON-05 | Design serves as reasonable precedent | WARN | Per-card policy API call fan-out (N calls per search result) is a non-standard pattern that should be documented as an explicit convention (or anti-pattern) for future SM-FE modules |

---

## ADR Conformance

| ADR | Title | Applicable? | Status | Notes |
|---|---|---|---|---|
| ADR-001 | Architecture Style | Yes (bounded context integrity) | PASS | Frontend observes DDD boundaries; no cross-context leakage |
| ADR-002 | Technology Stack | Yes | PASS | React 18, RTK Query, MUI v5, Vitest, Zod all used correctly |
| ADR-005 | Security Model | Yes | PASS | JWT Bearer, PrivateRoute, no PII stored |
| ADR-006 | API Gateway Pattern | Yes (rate limiting) | WARN | N-per-card policy calls risk breaching 100 req/15min rate limit under 50-result search |
| ADR-007 | Monitoring & Observability | Yes | FAIL | No X-Correlation-ID propagation design; no error telemetry section |
| ADR-008 | NFR — p95 < 500ms | Yes | WARN | Caching covers happy path; no design for measuring or enforcing p95 from the client |
| ADR-010 | Testing Strategy | Yes | PASS | 80% coverage in tasks 9.1; Vitest; contract tests absent (see AR-CTR-07) |
| ADR-011 | Error Handling & Resilience | Partial | WARN | Retry/timeout via existing infra. CB at gateway; not acknowledged in design |

### Violations

- ❌ **AR-PSL-01**: Pattern Selection Log is absent from `design.md`. Required before implementation begins.
- ❌ **AR-OBS-01**: Observability section absent from `design.md`. Minimum required: correlation ID forwarding design and browser-side error reporting approach.

---

## Pattern Selection Log Audit

*Cannot fully audit — PSL is absent. Based on reading design.md, the following patterns are implicitly applied:*

| Pattern | Spec Decision | Architect Assessment | Notes |
|---|---|---|---|
| Cache-aside (RTK Query client) | Applied (implicit) | Correct | TTL values reasonable; invalidation N/A for read-only feature |
| Retry (baseQueryWithRetry.ts) | Already in place | Correct | GET-only; exponential backoff with 30s deadline |
| Timeout (baseQueryWithTimeout.ts) | Already in place | Correct | 10s global timeout |
| Circuit Breaker | Not applied (implicit) | Acceptable | CB is at API Gateway layer; design must explicitly acknowledge this delegation |
| Bulkheads | Not applied | Risk | N-concurrent policy calls not bounded; should note max concurrency |

### Pattern Gaps (should be added)
- **Correlation ID Propagation**: Frontend should forward `X-Correlation-ID` from API Gateway responses into error logs/telemetry (ADR-007). This is not a new infrastructure pattern — it's an existing header convention that the frontend RTK Query base query should pass through.

### Pattern Misapplications
- None detected, but the N-per-card policy call fan-out pattern is unusual and warrants documentation.

---

## Domain Boundary Integrity

| Check | Status | Notes |
|---|---|---|
| Owns its data store | PASS | Frontend has no data store; ephemeral browser memory only |
| No direct cross-service DB access | PASS | N/A |
| Cross-service reads via API/read model | PASS | RTK Query → API Gateway → Inventory/Policy services |
| Cross-service writes via events/saga | PASS | N/A (read-only) |
| Public interface versioned | PASS | No new contracts published |

---

## Resilience / Caching Assessment

### Caching

| Aspect | Assessment | Notes |
|---|---|---|
| Infrastructure | Client-side RTK Query in-memory | Correct for frontend; distinct from server-side Redis |
| Flight search TTL (300s) | Acceptable | Matches inventory-service backend cache TTL |
| Airport typeahead TTL (600s) | Acceptable | Airport codes are stable; 10-min client cache is fine |
| Policy badge TTL (60s) | Marginal | Policy rules can change within 60s (e.g., budget exhausted); acceptable risk given search-stage badge is advisory |
| Stale price risk | Not addressed | Offer price fetched at search time may have changed by booking time (within 5-min cache window). Design should flag this as a known limitation |

### Resilience (Inherited)

| Aspect | Assessment | Notes |
|---|---|---|
| Timeout (10s) | Inherited; adequate | All three new API endpoints (flights, airports, policies) subject to 10s abort |
| Retry (GET-only, exp. backoff, 30s cap) | Inherited; adequate | Applies correctly to all three new GET endpoints |
| Circuit Breaker | Delegated to API Gateway | Must be documented explicitly in design.md |
| N-concurrent policy calls | Risk | 50 offers × 1 policy call = 50 simultaneous requests. No concurrency cap. Possible ADR-006 rate limit collision (100 req/15min/user) |

---

## Observability & Security Assessment

| Area | Status | Notes |
|---|---|---|
| Observability section in design.md | FAIL | Entirely absent — blocks implementation guidance |
| X-Correlation-ID forwarding | WARN | ADR-007 mandates correlation ID in all service calls. Frontend should read `X-Correlation-ID` from API Gateway response headers and include it in structured error logs |
| Browser error telemetry | WARN | No error boundary design. Unhandled RTK Query errors should be logged with structured fields (endpoint, status code, correlationId) |
| Cache hit/miss counters | WARN | Not applicable to browser-side; acknowledge explicitly |
| Auth consistent with standard | PASS | JWT Bearer via baseQueryWithReauth |
| Input validation (Zod) | WARN | Zod schema mentioned but field-level rules not fully specified (IATA format regex, date format, adults range) |
| Secrets management | PASS | window.__ENV__ pattern |
| PII handling | PASS | No PII in search parameters or FlightOffer schema |

---

## Consistency With Existing Architecture

The design is architecturally coherent with SM-FE-01 and SM-FE-02. The feature-slice structure (`components/`, `pages/`, `hooks/`, `api/`, `slice/`, `types/`) is consistent. Reuse of `baseQueryWithReauth`, `baseApi`, `PrivateRoute`, and `useDebounce` is appropriate. The RTK Query inject-into-baseApi pattern for `flightApi` and `policyApi` matches `authApi`.

The one potentially precedent-setting non-standard decision is the **per-card fire-and-forget policy API call** pattern. For a list of 50 results this generates 50 simultaneous GET requests. If adopted without documentation, future SM-FE modules (e.g., expense list) could unknowingly replicate this pattern at larger scale. It should be explicitly documented in design.md as a deliberate choice (not a general pattern to follow) with its stated trade-off.

---

## Summary

The frontend-search design is largely coherent and architecturally sound for a React/Redux SPA. It correctly reuses all established infrastructure, respects domain boundaries, and follows the feature-slice convention. However two structural blockers prevent a PASS: (1) the Pattern Selection Log is absent from `design.md` (AR-PSL-01), and (2) there is no observability section (AR-OBS-01) — which matters because ADR-007 requires correlation ID propagation and ADR-007/ADR-011 require structured error telemetry. Additionally, the per-card policy API call fan-out (N calls per search result) poses a concrete ADR-006 rate limit risk under normal usage (50 results = 50 policy calls + 1 search call = 51 of the 100 allowed requests per 15 minutes) that the design does not acknowledge or mitigate.

---

## Required Fixes

1. **[AR-PSL-01]** Add a Pattern Selection Log as the first section of `design.md`. Columns: Pattern | Decision | Rationale. Minimum entries: Cache-aside (Applied, RTK Query), Retry (Already in place, baseQueryWithRetry.ts), Timeout (Already in place, baseQueryWithTimeout.ts), Circuit Breaker (Not applicable — delegated to API Gateway per ADR-006, cite ADR), Bulkheads (Not applied — document N-call fan-out risk and its mitigation).
2. **[AR-OBS-01]** Add an Observability section to `design.md` covering: (a) `X-Correlation-ID` forwarding — read from API Gateway response header, attach to any structured error log entry; (b) browser-side error boundary for unhandled RTK Query errors (log: endpoint, HTTP status, correlationId, timestamp); (c) explicit note that Prometheus metrics are not applicable at client layer.
3. **[AR-ADR-06 / AR-RES-10]** Add a note to `design.md` Risks section: N simultaneous policy calls (up to 50) per search may approach the ADR-006 rate limit (100 req/15min/user). Mitigation: limit concurrent in-flight policy calls to ≤10 via a semaphore or sequential queue in `PolicyBadge`, or batch policy validation into a single `POST /policies/validate-batch` call if Policy Service supports it (open question for Product).

## Suggestions (non-blocking)

- Add a stale-price warning note to `FlightCard` design: if the user holds the search page open longer than the 5-min cache TTL and then selects a flight, the price shown may differ from the booking confirmation price. Consider a "prices refreshed X minutes ago" indicator.
- Document in `design.md` that the per-card policy call fan-out pattern is a deliberate choice for this module, and is NOT a general pattern to be replicated in list views with larger data sets.
- Add a Pact contract test task for `GET /inventory/flights/search` and `GET /policies/validate` to `tasks.md` to satisfy ADR-010 contract testing requirements.

---

*Hand this report to `qa-reviewer` along with the change folder.*
