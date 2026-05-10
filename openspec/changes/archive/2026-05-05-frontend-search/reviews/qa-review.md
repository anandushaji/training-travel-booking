# QA Review Report: frontend-search

**Reviewer Role**: QA Engineer
**Verdict**: FAIL
**Sub-Module**: [SM-FE-03] Flight Search Feature

---

## Checklist Results

| ID | Item | Status | Notes |
|---|---|---|---|
| QA-SC-01 | Scenarios follow WHEN/THEN structure | WARN | Structure is WHEN/THEN (not GIVEN/WHEN/THEN) — GIVEN clauses are consistently absent |
| QA-SC-02 | GIVEN describes specific, constructable precondition | FAIL | Every scenario omits GIVEN entirely. A tester cannot construct test state from "WHEN user submits" alone — is the user authenticated? Has a previous search run? What is the Redux store state? BLOCKER |
| QA-SC-03 | WHEN describes single concrete action | PASS | WHEN clauses are generally single actions |
| QA-SC-04 | THEN describes observable, verifiable outcome | FAIL | Multiple THEN clauses assert internal implementation details, not observable outcomes: "THEN `useLazySearchFlightsQuery` SHALL be triggered", "THEN `searchSlice.setSelectedOffer` SHALL be dispatched", "THEN `useSearchAirportsQuery` SHALL be called". These cannot be verified by a tester without reading source code. BLOCKER |
| QA-SC-05 | AND clauses individually verifiable | PASS | No AND clauses used |
| QA-SC-06 | Scenarios distinctly named | PASS | Names are unique and descriptive |
| QA-SC-07 | GIVEN clauses specify relevant data values | FAIL | No GIVEN clauses exist at all — implies default but unstated preconditions |
| QA-SC-08 | THEN clauses include output characteristics | WARN | Some THEN clauses specify UI element types (chip, spinner) but not their text content or ARIA roles |
| QA-SC-09 | Each scenario tests one behaviour | PASS | Scenarios are focused |
| QA-HP-01 | Every requirement has a happy-path scenario | PASS | All 9 requirements have ≥1 success scenario |
| QA-HP-02 | No requirement has only failure scenarios | PASS | |
| QA-HP-03 | Happy path covers all permitted user roles | WARN | "Employee" role not explicitly stated in any scenario; implied by PrivateRoute |
| QA-HP-04 | Happy path for write ops verifies response + state | PASS | Select button scenario covers both dispatch and navigation |
| QA-HP-05 | Multi-step flow covered end-to-end | WARN | Search → select → navigate flow is not covered as an integrated scenario |
| QA-FP-01 | Transient failure scenario for each external call | FAIL | Three external API calls (flight search, airport typeahead, policy validate) have no transient failure scenarios. "Error banner on API failure" is one generic scenario covering `FlightResults`, but it does not cover: (a) timeout on airport typeahead, (b) policy API 503, (c) retry behavior for flight search 503. BLOCKER |
| QA-FP-02 | Permanent failure scenario for each external call | FAIL | No 404 / permanent error scenarios for any of the three external endpoints. BLOCKER |
| QA-FP-03 | Invalid-input scenario for every validation rule | FAIL | Validation scenarios present only for "empty required fields". Missing: invalid IATA code format, return date before departure date, adults = 0 (below min), adults > 9 (above max), non-existent airport code. BLOCKER |
| QA-FP-04 | Precondition-unmet rejection scenarios | FAIL | No scenario for: user's JWT expires while on search page (401 from search API); user navigates to `/search` from a protected route after session timeout. BLOCKER |
| QA-FP-05 | Transient failure specifies system response | FAIL | No transient failure scenarios exist to evaluate |
| QA-FP-06 | Permanent failure specifies exact error response | FAIL | No permanent failure scenarios exist to evaluate |
| QA-FP-07 | Downstream unavailability distinguishes timeout vs connection refused | FAIL | No timeout vs hard-failure distinction for any endpoint |
| QA-FP-08 | Background process failure covered | PASS | N/A — no background processes |
| QA-EC-01 | Boundary values tested at exact boundary | FAIL | adults min=1 and max=9 boundary scenarios absent; airport typeahead exactly 2 characters boundary absent. BLOCKER |
| QA-EC-02 | Invalid enum value scenarios | FAIL | No invalid `cabinClass` scenario; no invalid `sortBy` scenario for searchSlice. WARN |
| QA-EC-03 | Empty collections, null values, zero quantities | PASS | Zero-results empty state is covered |
| QA-EC-04 | Terminal-state scenarios | PASS | N/A — no state machine beyond offer selection |
| QA-EC-05 | Date/time edge cases | FAIL | Departure date in past not covered; return date before departure date not covered. WARN |
| QA-EC-06 | Extremely long input values | WARN | No max-length IATA scenario; airport search query with 200+ chars not tested |
| QA-EC-07 | Unicode/special characters | WARN | Airport name typeahead with special characters not tested |
| QA-PT-CA-01 | Cache hit scenario (data returned without API call) | FAIL | No spec scenario for: WHEN same search params submitted again within 300s TTL, THEN results returned from RTK Query cache and no HTTP request made. BLOCKER |
| QA-PT-CA-02 | Cache miss scenario (API called, result cached) | FAIL | No spec scenario for first-call-populates-cache behavior. BLOCKER |
| QA-PT-CA-03 | Cache unavailable degrades gracefully | PASS | N/A — browser in-memory cache cannot be "unavailable" |
| QA-PT-CA-04 | Write invalidates cache | PASS | N/A — read-only feature |
| QA-PT-CA-05 | TTL expiry results in fresh read | FAIL | No scenario for: after 300s, repeated search triggers fresh HTTP call. WARN |
| QA-PT-RT-01 | Transient failure → eventual success after retry | FAIL | No retry success scenario for flight search or airport typeahead. BLOCKER |
| QA-PT-RT-02 | All retries exhausted → error returned | FAIL | No retry exhaustion scenario. BLOCKER |
| QA-PT-RT-03 | Non-retryable 4xx → no retry | FAIL | No non-retryable error scenario (e.g., 400 from invalid params). BLOCKER |
| QA-PT-RT-04 | Retry count not exceeded | FAIL | No retry count verification scenario. WARN |
| QA-PT-CB-01 to CB-04 | Circuit Breaker scenarios | PASS | CB delegated to API Gateway; not applicable at frontend layer |
| QA-PT-ID, SA, OB | Idempotency, Saga, Outbox | PASS | Patterns not applied — skipped |
| QA-AC-01 | Every task has at least one AC | FAIL | `tasks.md` tasks are implementation steps (create file X, write Y) with no acceptance criteria field. BLOCKER |
| QA-AC-02 | Every AC is binary | FAIL | No ACs present to evaluate — same BLOCKER as QA-AC-01 |
| QA-AC-03 | Every AC is observable | FAIL | No ACs present |
| QA-AC-04 | Every functional task references a spec scenario | FAIL | No spec scenario references in any task description. BLOCKER |
| QA-AC-05 | No vague AC language | PASS | N/A — no ACs present |
| QA-AC-06 | Pattern tasks cover failure path | FAIL | Test tasks (8.x) mention test scenarios in passing but do not constitute formal ACs |
| QA-AC-07 | External integration ACs specify test double strategy | WARN | Test tasks mention MSW but not as formal ACs |
| QA-AC-08 | ACs ordered simple-to-complex | PASS | N/A |
| QA-AV-01 | Every AC names artifact (test file + test case name) | FAIL | No ACs exist; no artifact names specified anywhere. BLOCKER |
| QA-AV-02 | Verification artifacts are auto-executable | FAIL | Cannot evaluate — no artifacts named |
| QA-AV-03 | Every artifact has "Must fail if" note | FAIL | No "Must fail if" notes anywhere in tasks.md or spec. BLOCKER |
| QA-AV-04 | Verification layer can observe THEN clause | FAIL | Several THEN clauses assert internal Redux/RTK symbols — unit tests using these as assertions would not be layer-appropriate (they test implementation, not behaviour) |
| QA-AV-05 | Contract tests for external API assertions | FAIL | No contract test tasks for GET /inventory/flights/search or GET /policies/validate. BLOCKER |
| QA-AV-06 | Artifacts named after GIVEN/WHEN/THEN | FAIL | No artifact naming at all |
| QA-AV-07 | Artifacts exercise AC exactly | FAIL | Cannot evaluate |
| QA-AV-08 | Concurrency conditions reproduced | PASS | N/A |
| QA-TS-01 | Unit test tasks for business logic | PASS | Tasks 8.1–8.9 cover unit testing for all components, slice, hooks |
| QA-TS-02 | Integration test tasks for external calls | WARN | All 8.x tests use MSW (unit-level mocks) — no integration test tasks with real API Gateway or real service |
| QA-TS-03 | Contract test tasks for new/modified API contracts | FAIL | No contract test tasks for the two consumed APIs. BLOCKER |
| QA-TS-04 | E2E test tasks for user-facing happy path | WARN | No E2E task for the search → select → navigate flow |
| QA-TS-05 | Test tasks ordered after implementation tasks | PASS | Group 8 follows groups 1–7 |
| QA-TS-06 | Pattern implementation tasks have failure-mode tests | FAIL | Retry/cache pattern failure modes not covered in any test task |
| QA-TS-07 | Performance test tasks for NFR latency targets | FAIL | No performance/load test task despite p95 < 500ms NFR. WARN |
| QA-TD-01 | GIVEN clauses specify entity attributes | FAIL | No GIVEN clauses exist. BLOCKER |
| QA-TD-02 | GIVEN count/quantity clauses use exact values | WARN | "2 or more characters" used instead of exactly 2 |
| QA-TD-03 | GIVEN time references are precise | FAIL | No time-based GIVEN clauses (e.g., "GIVEN 300s have not elapsed since last search") |
| QA-TD-04 | GIVEN clauses describe system state not infrastructure | PASS | N/A — no GIVEN clauses to violate this |
| QA-TD-05 | Complex setup noted for fixture | WARN | No fixture notes in spec |
| QA-CC-01 | Read-then-write race condition scenarios | PASS | N/A — no shared resource writes in search |
| QA-CC-02 | Idempotency key race condition | PASS | N/A |
| QA-CC-03 | Saga compensation race condition | PASS | N/A |
| QA-CC-04 | Cache invalidation concurrent read race | PASS | N/A — no writes |
| QA-CC-05 | Optimistic locking conflict | PASS | N/A |

---

## Scenario Inventory

| Scenario | Requirement | Type | Testability |
|---|---|---|---|
| Required-field validation on empty submit | SearchForm | Error/Validation | Automatable (needs GIVEN) |
| Successful form submission triggers flight search | SearchForm | Happy Path | Needs clarification — THEN references internal RTK symbol |
| Return date optional for one-way trips | SearchForm | Edge Case | Automatable (needs GIVEN) |
| Typeahead skipped for short input | AirportInput | Boundary | Automatable (needs GIVEN) |
| Typeahead fires after 2+ characters | AirportInput | Happy Path | Automatable (needs GIVEN; "2+" is imprecise) |
| Selecting an airport populates the IATA field | AirportInput | Happy Path | Automatable (needs GIVEN) |
| Loading skeleton during API call | FlightResults | Loading State | Automatable (needs GIVEN) |
| Empty-state message for zero results | FlightResults | Edge Case | Automatable (needs GIVEN) |
| Error banner on API failure | FlightResults | Failure | Partially — no HTTP status specified |
| Cards rendered for each offer | FlightResults | Happy Path | Automatable (needs GIVEN with offer count) |
| Policy badge shows loading while validating | FlightCard | Loading State | Automatable (needs GIVEN) |
| COMPLIANT badge for within-policy offer | FlightCard | Happy Path | Automatable |
| EXCEEDS-POLICY badge for out-of-policy offer | FlightCard | Happy Path | Automatable |
| Select button dispatches selectedOffer and navigates | FlightCard | Happy Path | Needs clarification — THEN references `searchSlice.setSelectedOffer` |
| setSelectedOffer updates state | searchSlice | Happy Path | Automatable |
| clearSelectedOffer resets state | searchSlice | Happy Path | Automatable |
| setFilters updates sort and price cap | searchSlice | Happy Path | Automatable |
| searchFlights lazy query uses correct URL and params | flightApi | Happy Path | Automatable |
| searchAirports skips query for short input | flightApi | Boundary | Automatable |
| Unauthenticated user redirected from /search | SearchPage | Security | Automatable |
| Authenticated user lands on SearchPage | SearchPage | Happy Path | Automatable (needs GIVEN with auth state) |
| clearSelectedOffer dispatched on mount | SearchPage | Happy Path | Needs clarification — THEN references internal dispatch |
| search key present in root state | rootReducer | Happy Path | Automatable |
| /search route renders SearchPage | AppRoutes | Happy Path | Automatable |
| search state is initialised at store creation | rootReducer (MODIFIED) | Happy Path | Automatable |

**Totals**: 16 automatable, 7 need clarification/GIVEN, 2 too vague (internal symbol assertions).

---

## Happy Path Coverage

| Requirement | Happy-path scenario? | Notes |
|---|---|---|
| SearchForm collects flight search parameters | ✅ Yes | "Successful form submission triggers flight search" |
| AirportInput provides typeahead suggestions | ✅ Yes | "Typeahead fires after 2+ characters" + "Selecting an airport…" |
| FlightResults renders offer list | ✅ Yes | "Cards rendered for each offer" |
| FlightCard displays offer details and policy badge | ✅ Yes | "COMPLIANT badge…" + "Select button…" |
| searchSlice manages filter/sort state | ✅ Yes | Three slice action scenarios |
| flightApi exposes lazy search and airport typeahead | ✅ Yes | "searchFlights lazy query uses correct URL" |
| SearchPage orchestrates search flow at /search | ✅ Yes | "Authenticated user lands on SearchPage" |
| searchReducer registered in rootReducer | ✅ Yes | "search key present in root state" |
| /search route added to AppRoutes | ✅ Yes | "/search route renders SearchPage" |

---

## Failure Path Coverage

| Failure Type | Covered? | Notes |
|---|---|---|
| Invalid input (empty required fields) | ✅ Partial | Required-field empty covered; IATA format, date range, adults out-of-range NOT covered |
| Precondition not met (unauthenticated) | ✅ Yes | Unauthenticated redirect scenario |
| Precondition not met (JWT expires during session) | ❌ Missing | No scenario for 401 returned by search API after session expiry |
| Transient failure (API 5xx) | ⚠️ Partial | "Error banner on API failure" covers FlightResults; no scenarios for airport or policy transient failures |
| Permanent failure (API 4xx) | ❌ Missing | No permanent failure scenarios |
| Policy API failure → UNKNOWN badge | ❌ Missing | Mentioned in design.md only |
| Boundary (adults=0, adults=9, exactly 2 chars) | ❌ Missing | No boundary scenarios |
| Return date before departure date | ❌ Missing | |
| Concurrent | ✅ N/A | No shared write resource |

### Missing failure scenarios (critical)
1. `GET /inventory/flights/search` 503 → retry → success
2. `GET /inventory/flights/search` 503 (all retries exhausted) → FlightResults shows error banner
3. `GET /inventory/flights/search` 400 (invalid params) → no retry, error banner
4. `GET /inventory/airports/search` transient failure → AirportInput shows error or fallback
5. `GET /policies/validate` 503 → PolicyBadge shows UNKNOWN/UNAVAILABLE state
6. 401 on search endpoint → user redirected to login (session expiry mid-session)
7. adults = 0 → validation error on SearchForm
8. adults = 10 → validation error on SearchForm
9. return date before departure date → validation error on SearchForm

---

## Pattern-Specific Scenarios

### Cache-aside (RTK Query — applied)

| Scenario Required | Present in Spec? | Notes |
|---|---|---|
| Cache hit: same params within TTL returns without API call | ❌ Missing | BLOCKER — No scenario for "WHEN same search submitted again within 300s, THEN no HTTP call is made" |
| Cache miss: first call fetches from API, result cached | ❌ Missing | BLOCKER — No scenario verifying cache population on first call |
| TTL expiry: after 300s, repeated search makes fresh HTTP call | ❌ Missing | WARNING |
| Cache unavailable | ✅ N/A | Browser in-memory — cannot be independently unavailable |

### Retry (baseQueryWithRetry.ts — already in place, but new endpoints added)

| Scenario Required | Present in Spec? | Notes |
|---|---|---|
| 503 on flight search → retry → eventual success | ❌ Missing | BLOCKER |
| All retries exhausted (30s deadline) → error returned | ❌ Missing | BLOCKER |
| 400 bad request → no retry, immediate error | ❌ Missing | BLOCKER |
| Retry count not exceeded beyond configured max | ❌ Missing | WARNING |

---

## Acceptance Criteria Quality

**tasks.md does not contain acceptance criteria.** Each task is an implementation directive (e.g., "Create `src/features/search/search.types.ts` — define…") with no AC row or format. This is a structural gap — the tasks.md template was populated with implementation steps but not verification criteria.

| Task | Criterion | Binary? | Observable? | Automatable? | Linked to Spec? |
|---|---|---|---|---|---|
| 1.1 – 9.2 (all) | None defined | N/A | N/A | N/A | ❌ None |

### Issues
- All 26 tasks lack ACs — QA-AC-01, QA-AC-04 BLOCKER applies to the entire tasks.md.

---

## AC Verification Policy Compliance

> Every scenario in the delta spec should be paired with a named, auto-executable verification artifact in `tasks.md` that fails on `THEN` violation.

| Spec Scenario | Artifact Named in tasks.md? | Auto-Executable? | Fails on THEN? | Layer OK? |
|---|---|---|---|---|
| Required-field validation on empty submit | ❌ No — task 8.5 mentions the topic but names no specific test case | — | — | — |
| Successful form submission triggers flight search | ❌ No | — | — | — |
| Return date optional for one-way trips | ❌ No | — | — | — |
| Typeahead skipped for short input | ❌ No | — | — | — |
| Typeahead fires after 2+ characters | ❌ No | — | — | — |
| Selecting an airport populates the IATA field | ❌ No | — | — | — |
| Loading skeleton during API call | ❌ No | — | — | — |
| Empty-state message for zero results | ❌ No | — | — | — |
| Error banner on API failure | ❌ No | — | — | — |
| Cards rendered for each offer | ❌ No | — | — | — |
| Policy badge shows loading while validating | ❌ No | — | — | — |
| COMPLIANT badge for within-policy offer | ❌ No | — | — | — |
| EXCEEDS-POLICY badge for out-of-policy offer | ❌ No | — | — | — |
| Select button dispatches selectedOffer and navigates | ❌ No | — | — | — |
| setSelectedOffer updates state | ❌ No | — | — | — |
| clearSelectedOffer resets state | ❌ No | — | — | — |
| setFilters updates sort and price cap | ❌ No | — | — | — |
| searchFlights lazy query uses correct URL and params | ❌ No | — | — | — |
| searchAirports skips query for short input | ❌ No | — | — | — |
| Unauthenticated user redirected from /search | ❌ No | — | — | — |
| Authenticated user lands on SearchPage | ❌ No | — | — | — |
| clearSelectedOffer dispatched on mount | ❌ No | — | — | — |
| search key present in root state | ❌ No | — | — | — |
| /search route renders SearchPage | ❌ No | — | — | — |
| search state is initialised at store creation | ❌ No | — | — | — |

### Unverified ACs (BLOCKERs)
All 25 spec scenarios are unverified. **0 / 25 scenarios have a named, auto-executable verification artifact.** This is a systemic gap, not isolated misses.

---

## Test Strategy Coverage

| Layer | Applicable | Supported by Spec | Notes |
|---|---|---|---|
| Unit (component, slice, hook) | Yes | ✅ Yes | tasks 8.1–8.9 cover all units via Vitest + MSW |
| Integration (real API Gateway + services) | Partially | ❌ No | All 8.x tests use MSW mocks — no real-service integration tests planned |
| Contract (Pact for GET /flights/search, GET /policies/validate) | Yes | ❌ Missing | No contract test task. ADR-010 requires contract tests for all API consumers. BLOCKER |
| E2E (search → select → navigate) | Yes | ❌ Missing | No E2E task covering the full user journey |
| Performance (k6, p95 < 500ms per ADR-008) | Yes (NFR exists) | ❌ Missing | No performance test task |

---

## Summary

The frontend-search spec has adequate happy path coverage and well-named scenarios, but fails on almost every testability dimension. The most critical structural problem is that **tasks.md contains no acceptance criteria at all** — each task is an implementation directive with no paired verification criterion, no named test case, no "must fail if" condition, and no spec scenario reference. This violates the AC Verification Policy for all 25 spec scenarios simultaneously. Beyond this systemic gap, the spec has pervasive GIVEN-clause omissions (no scenario specifies precondition state), several THEN clauses that assert internal Redux/RTK symbols rather than observable outcomes, and complete absence of failure path scenarios for all three external API calls (inventory search, airport typeahead, policy validate). The retry and cache patterns are applied but have zero pattern-specific failure scenarios. A QA engineer building a test suite from this spec would be forced to make fundamental decisions about test preconditions, failure injection, and expected behavior on failures — none of which should require guessing. Significant revision is needed.

---

## Required Fixes

1. **[QA-SC-02 / QA-TD-01]** Add GIVEN clauses to every scenario specifying: authentication state, Redux store state, and MSW handler configuration. Example: "GIVEN an authenticated Employee, the Redux store is at initial state, and the inventory API returns a 200 with 5 offers".
2. **[QA-SC-04]** Replace all internal-symbol THEN clauses with observable-outcome THEN clauses:
   - "THEN `useLazySearchFlightsQuery` SHALL be triggered" → "THEN a `GET /inventory/flights/search` request SHALL be made with the submitted parameters"
   - "THEN `searchSlice.setSelectedOffer` SHALL be dispatched" → "THEN the selected offer SHALL be stored in Redux state and the browser SHALL navigate to `/bookings/new`"
   - "THEN `useSearchAirportsQuery` SHALL be called" → "THEN a `GET /inventory/airports/search` request SHALL be made"
3. **[QA-FP-01 / QA-FP-02]** Add failure scenarios for all three external calls:
   - Flight search 503 (transient) → retry → success; flight search 503 (all retries exhausted) → error banner; flight search 400 → no retry, error banner
   - Airport typeahead 503 → AirportInput shows error state or clears dropdown
   - Policy validate 503 → PolicyBadge shows UNKNOWN state
4. **[QA-FP-03 / QA-EC-01]** Add validation boundary scenarios to SearchForm: adults = 0, adults = 10, return date before departure date, departure date in past, IATA code with invalid format (e.g., "JF" — only 2 chars).
5. **[QA-PT-CA-01 / QA-PT-CA-02]** Add cache behavior scenarios to flightApi spec: (a) WHEN same params submitted within 300s TTL, THEN no HTTP request is made and results are returned from cache; (b) WHEN params submitted for the first time, THEN HTTP request is made and results are cached.
6. **[QA-PT-RT-01 / QA-PT-RT-02 / QA-PT-RT-03]** Add retry scenarios: (a) 503 followed by 200 within retry window → success; (b) 503 for entire 30s deadline → error returned; (c) 400 → no retry, immediate error.
7. **[QA-AC-01 / QA-AV-01 / QA-AV-03]** Restructure tasks.md to add for every implementation task (1.1–6.1, 7.x): an explicit AC in the format `AC: GIVEN <state> WHEN <action> THEN <observable outcome>`, a named verification artifact `(src/features/search/<test-file>.spec.ts: "<test case name>")`, and a "Must fail if" note. Tasks 8.x (test tasks) should be collapsed into their corresponding implementation tasks as AC-verification pairs.
8. **[QA-TS-03]** Add contract test tasks: `8.10 Write src/features/search/__tests__/contracts/flightApi.contract.spec.ts — Pact consumer test for GET /inventory/flights/search response schema` and `8.11 Write src/features/search/__tests__/contracts/policyApi.contract.spec.ts — Pact consumer test for GET /policies/validate response schema`.

## Suggestions (non-blocking)

- Add a scenario: "WHEN the search page has been open for 300s and the user resubmits the same params, THEN a fresh HTTP request is made and results are updated" — validates TTL expiry behavior.
- Add an E2E task: "9.3 Run Puppeteer E2E test: authenticated employee searches JFK→LAX, sees results, selects a flight, lands on /bookings/new with selectedOffer in Redux state."
- Consider adding a property-based test for the `searchSlice` reducer to cover all action/state combinations without specifying individual scenarios.

---

*Hand this report to `dev-reviewer` along with the change folder and the codebase context (relevant source files and existing test patterns).*
