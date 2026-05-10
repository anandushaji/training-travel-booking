# Council Review Report: frontend-search

**Sub-Module**: [SM-FE-03] Flight Search Feature
**Review Date**: 2026-05-04

---

## Individual Verdicts

| Reviewer | Verdict | Critical Issues |
|---|---|---|
| BA | FAIL | Filter/sort results behavior unspecified (FR-11); p95 < 500ms NFR absent; no WCAG requirement; 3 BLOCKERs |
| Architect | FAIL | Pattern Selection Log absent from design.md; Observability section absent from design.md; rate-limit risk from N-per-card policy calls; 2 BLOCKERs |
| QA | FAIL | All 25 spec scenarios lack GIVEN clauses; THEN clauses assert internal symbols; no failure-path scenarios for any external call; 0/25 ACs have named verification artifacts; no contract tests; systemic BLOCKERs throughout |
| Dev | FAIL | All 26 tasks lack ACs and verification artifacts; Task 5.2 misleading (route already exists); Task 7.3 targets wrong file; missing Pact prerequisite; 4 concrete task-level BLOCKERs |

---

## Council Verdict: FAIL

**Rationale**: All four reviewers independently returned FAIL; the council verdict is FAIL by definition. The failures are systemic and cross-cutting: the spec, design, and tasks all require material revision before implementation can begin.

---

## Conflict Resolutions

### Conflict 1: Per-card policy call fan-out — Architect (WARN risk) vs. Dev (acceptable, document)

- **Architect position**: N simultaneous `GET /policies/validate` calls per search (up to 50) risks ADR-006 rate limit (100 req/15min/user). Flagged as WARNING, not BLOCKER. Suggested mitigation: concurrent call cap or batch endpoint.
- **Dev position**: Pattern is technically feasible; should be documented as a deliberate design choice, not a general-purpose pattern.
- **Resolution**: No conflict — both reviewers agree the pattern is acceptable with documentation. The Architect's P2 recommendation (document and consider concurrency cap) stands. **Decision required from user: No** — proceed with existing design; add documentation note and a concurrency cap of ≤10 concurrent policy calls via the `useFlightSearch` hook or `PolicyBadge` component.

### Conflict 2: `airportApi` file split — design.md (separate file) vs. tasks.md (combined into flightApi.ts)

- **Architect position**: No conflict raised — design.md Goals section lists `airportApi` separately but architect didn't flag inconsistency.
- **Dev position**: design.md Goals names `airportApi` as a separate file; tasks.md collapses both into `flightApi.ts`. Flagged as DR-CB-01 WARNING.
- **Resolution**: Consolidation into `flightApi.ts` is architecturally acceptable — airport search is inventory-domain data, same bounded context. Update design.md to remove the separate `airportApi` entry and clarify that both endpoints live in `flightApi.ts`. **Decision required from user: No** — keep consolidated; fix design.md note.

---

## Consolidated Action List

### P1 — Blockers (must fix before /opsx:apply)

| # | Fix | Raised By | Artifact | Source Reference |
|---|---|---|---|---|
| P1-01 | Add GIVEN clauses to all 25 spec scenarios specifying: authentication state, Redux store state, and relevant MSW handler state | QA (QA-SC-02, QA-TD-01) | `specs/frontend-search/spec.md` | Every scenario |
| P1-02 | Replace all THEN clauses that assert internal symbols with observable-outcome assertions (e.g., "THEN `useLazySearchFlightsQuery` SHALL be triggered" → "THEN a `GET /inventory/flights/search` request SHALL be made with the submitted parameters") | QA (QA-SC-04), BA (BA-LA-02) | `specs/frontend-search/spec.md` | Scenarios: "Successful form submission…", "Select button…", "clearSelectedOffer dispatched…", "Typeahead fires…" |
| P1-03 | Add failure-path scenarios for all 3 external calls: (a) flight search 503 → retry → success; (b) flight search 503 all-retries-exhausted → error banner; (c) flight search 400 → no retry; (d) airport typeahead 503 → AirportInput error; (e) policy validate 503 → PolicyBadge UNKNOWN state | QA (QA-FP-01, QA-FP-02), BA (BA-BR-05) | `specs/frontend-search/spec.md` | All FlightResults, AirportInput, FlightCard requirements |
| P1-04 | Add boundary validation scenarios: adults=0 (error), adults=10 (error), return date before departure date (error), departure date in past (error), IATA code with invalid format (error) | QA (QA-EC-01, QA-FP-03), BA (BA-BR-02, BA-BR-04) | `specs/frontend-search/spec.md` | SearchForm requirement |
| P1-05 | Add RTK Query cache-behavior scenarios: (a) same params within 300s TTL → no HTTP call (cache hit); (b) first call → HTTP call made → result cached (cache miss) | QA (QA-PT-CA-01, QA-PT-CA-02) | `specs/frontend-search/spec.md` | flightApi requirement |
| P1-06 | Add retry-pattern scenarios: (a) 503 → retry → success; (b) 503 for 30s deadline → error returned; (c) 400 → no retry, immediate error | QA (QA-PT-RT-01, QA-PT-RT-02, QA-PT-RT-03) | `specs/frontend-search/spec.md` | flightApi / FlightResults requirements |
| P1-07 | Add filter/sort results requirement + scenarios: "WHEN sortBy='price' THEN displayed results SHALL appear sorted by price ascending"; "WHEN maxPrice is set THEN offers above maxPrice SHALL be excluded from display" | BA (FR-11), QA (QA-EC-02 follow-on) | `specs/frontend-search/spec.md` | New requirement under searchSlice |
| P1-08 | Add measurable performance NFR: "The system SHALL display initial flight search results within p95 500ms of form submission under cached conditions (RTK Query TTL: 300s)" | BA (NFR-01, BA-NFR-01), Architect (ADR-008) | `specs/frontend-search/spec.md` | New NFR requirement |
| P1-09 | Add accessibility requirement with scenario: "All interactive form elements SHALL have accessible labels conforming to WCAG 2.1 AA" with a scenario for screen-reader label verification | BA (NFR-04, BA-NFR-05), Architect (AR-ADR-02) | `specs/frontend-search/spec.md` | New NFR requirement |
| P1-10 | Add Pattern Selection Log as first section of design.md with entries: Cache-aside (Applied, RTK Query, TTL values), Retry (Already in place, baseQueryWithRetry.ts), Timeout (Already in place, baseQueryWithTimeout.ts), Circuit Breaker (Delegated to API Gateway per ADR-006), Bulkheads (Not applied, risk documented) | Architect (AR-PSL-01), QA (QA-PT-CA-01 prerequisite) | `design.md` | |
| P1-11 | Add Observability section to design.md: X-Correlation-ID forwarding from API Gateway response headers into error logs; browser error boundary design; acknowledgement that Prometheus metrics N/A at client layer | Architect (AR-OBS-01), Dev (DR-TC-11) | `design.md` | ADR-007 |
| P1-12 | Add ACs to all functional tasks in tasks.md with format: AC statement referencing spec scenario, named verification artifact (test file path + test case name), "Must fail if" note | QA (QA-AV-01, QA-AC-01), Dev (DR-TC-09, DR-AF-04) | `tasks.md` | docs/workflow/acceptance-criteria.md |
| P1-13 | Correct task 5.2: "In `src/routes/AppRoutes.tsx`, remove the inline placeholder `function SearchPage(): React.ReactElement { … }` and add `import { SearchPage } from '../features/search'` at the top. The `/search` route already exists and does not need to be modified." | Dev (DR-AF-06) | `tasks.md` | AppRoutes.tsx lines ~16-18 |
| P1-14 | Correct task 7.3: "In `src/mocks/handlers/index.ts`, import `inventoryHandlers` from `./inventory.handlers` and `policyHandlers` from `./policy.handlers`, then spread both into the `handlers` array alongside `authHandlers`." (not server.ts) | Dev (DR-DX-01) | `tasks.md` | `src/mocks/handlers/index.ts` |
| P1-15 | Add contract test prerequisite task + contract test tasks: install `@pact-foundation/pact` as dev dep; write Pact consumer test for `GET /inventory/flights/search`; write Pact consumer test for `GET /policies/validate` | QA (QA-TS-03, QA-AV-05), Dev (DR-AV-02) | `tasks.md` | ADR-010 |

### P2 — Should Fix (before /opsx:archive)

| # | Fix | Raised By | Artifact | Notes |
|---|---|---|---|---|
| P2-01 | Document in proposal.md the explicit decision to use form-submit trigger (not debounced auto-refresh) as a scope narrowing from decomposition, with rationale from design.md Decision §1 | BA (BA-SC-06, BA-SC-05) | `proposal.md` | No functional change required |
| P2-02 | Add N-concurrent-policy-call concurrency cap note + mitigation to design.md Risks section; add cap to task 4.3 (PolicyBadge) to limit ≤10 concurrent in-flight policy calls | Architect (AR-RES-10, AR-ADR-06) | `design.md`, `tasks.md` | Prevents ADR-006 rate limit breach on 50-result searches |
| P2-03 | Add task for X-Correlation-ID forwarding in baseQueryWithReauth.ts (structured error log includes correlationId from response header) | Architect (AR-OBS-07), Dev (DR-TC-11) | `tasks.md` | ADR-007 compliance |
| P2-04 | Add 401-mid-session scenario to SearchPage requirement: "WHEN user's JWT expires and a search API call returns 401, THEN baseQueryWithReauth SHALL attempt token refresh and redirect to login on failure" | QA (QA-FP-04), BA (implicit) | `specs/frontend-search/spec.md` | Builds on existing reauth infrastructure |
| P2-05 | Resolve task 2.2 incompleteness: specify the import line to add (`import { searchReducer } from '../features/search'`) alongside the combineReducers entry | Dev (DR-CB, DR-AF-06) | `tasks.md` | Agent needs explicit import instruction |
| P2-06 | Specify `useDebounce` import path in task 3.1: `import { useDebounce } from '../../common/hooks/useDebounce'` | Dev (DR-AF-03) | `tasks.md` | |
| P2-07 | Add stale-price limitation note to design.md: flight prices cached for 300s may have changed by booking time; FlightCard should display a "prices as of X ago" indicator | Architect (AR-CAC-05), suggestion | `design.md` | |
| P2-08 | Align design.md Goals with tasks.md: remove separate `airportApi` entry from Goals and clarify both endpoints live in `flightApi.ts` | Dev (DR-CB-01) | `design.md` | |

### P3 — Nice to Have (can defer)

| # | Suggestion | Raised By | Notes |
|---|---|---|---|
| P3-01 | Add E2E task: Puppeteer test covering full search → select → navigate to /bookings/new flow | QA (QA-TS-04) | Can be deferred to SM-FE-04 integration |
| P3-02 | Add React ErrorBoundary component for FlightCard to prevent policy API errors crashing the results list | Dev, QA | Low priority; FlightResults error banner partially covers this |
| P3-03 | Add `TAG_TYPES` update task for 'Flight' and 'Airport' tag types in anticipation of booking mutations that may need to invalidate search cache | Dev | Preventive; not required for SM-FE-03 |
| P3-04 | Co-locate test tasks with implementation tasks instead of batching in group 8 | Dev (DR-TO-07) | Style preference; grouped-at-end is functional |
| P3-05 | Add a "prices refreshed X minutes ago" indicator to FlightCard for cache-staleness visibility | Architect, QA | UX enhancement; not a correctness issue |
| P3-06 | Add property-based test for searchSlice reducer to complement scenario-based unit tests | QA (suggestion) | Extra coverage; not required |

---

## Recommendation

❌ **Revise and re-review** — the spec, design, and tasks require material revision across all three artifacts before implementation can begin.

The core issue is structural: the spec was generated without GIVEN clauses (making every scenario unverifiable from a test-data perspective), without failure-path scenarios for any external API call (making the three external dependencies completely un-tested), and without verification artifacts in tasks.md (violating the AC Verification Policy for all 25 scenarios and 26 tasks). Additionally, design.md is missing two mandatory sections (Pattern Selection Log and Observability) that are required before implementation guidance is complete.

The good news: all 15 P1 fixes are targeted spec/design/tasks revisions — no architectural rework is required. The domain model, component structure, RTK Query patterns, and codebase conventions are all sound. The volume of P1 fixes reflects authoring gaps, not design problems.

**Recommended revision approach**: Apply P1-01 through P1-09 to `spec.md`, P1-10 and P1-11 to `design.md`, and P1-12 through P1-15 to `tasks.md`. Then re-run `qa-reviewer` (spec/tasks affected) and `dev-reviewer` (tasks affected). Architect and BA do not need full re-runs — a targeted check of P1-08 through P1-11 by the Architect and P1-07 through P1-09 by the BA is sufficient.

---

## Re-Review Scope

| Fix Area | Re-run Reviewer |
|---|---|
| Spec scenarios (P1-01 through P1-09, P2-04) | `qa-reviewer` |
| tasks.md ACs + verification artifacts (P1-12 through P1-15, P2-02, P2-05, P2-06) | `dev-reviewer`, `qa-reviewer` |
| design.md Pattern Selection Log + Observability (P1-10, P1-11) | `architect-reviewer` (targeted) |
| New requirements: filter/sort, NFR, accessibility (P1-07, P1-08, P1-09) | `ba-reviewer` (targeted — confirm coverage), `qa-reviewer` |

**Minimum re-run set**: `qa-reviewer` (mandatory — affects every QA checklist section), `dev-reviewer` (mandatory — tasks.md completely revised). `architect-reviewer` and `ba-reviewer` can do targeted spot-checks rather than full re-reviews.
