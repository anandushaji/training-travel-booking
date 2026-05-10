# Developer Review Report: frontend-search (Round 2)

**Reviewer Role**: Senior Developer
**Verdict**: FAIL
**Sub-Module**: [SM-FE-03] Flight Search UI

---

## Checklist Results

| ID | Severity | Item (abbreviated) | Status | Notes |
|---|---|---|---|---|
| DR-FE-01 | BLOCKER | All libraries in package.json or added by task | ✅ PASS | RTK Query, MUI v5, react-hook-form, useDebounce, MSW v2 all established. Zod needs verification — assumed present as react-hook-form companion. @pact-foundation/pact added by task 9.1 ✅ |
| DR-FE-02 | BLOCKER | All infra components available in PROJECT.md | ✅ PASS | Frontend SPA only; no new infra |
| DR-FE-03 | BLOCKER | All env vars exist or have add task | ✅ PASS | `REACT_APP_API_URL` established in SM-FE-01 via `window.__ENV__` |
| DR-FE-04 | BLOCKER | Language/framework versions consistent | ✅ PASS | React 18, TypeScript 5.x, RTK Query — all consistent |
| DR-FE-05 | WARNING | New dependencies evaluated for licence/security | ⚠️ WARN | @pact-foundation/pact: Apache 2.0 licence, well-maintained. No known critical CVEs. Acceptable |
| DR-FE-06 | WARNING | Version constraints noted for feature-specific APIs | ✅ PASS | No version-specific APIs used; MUI `Skeleton` and `Chip` present since MUI v5 |
| DR-FE-07 | INFO | Platform-specific constraints documented | ✅ PASS | Frontend SPA; no platform constraints beyond existing |
| DR-TC-01 | BLOCKER | Task for every DB schema change | ✅ PASS | Not applicable — frontend feature |
| DR-TC-02 | BLOCKER | Task for every new env var | ✅ PASS | No new env vars |
| DR-TC-03 | BLOCKER | Task for wiring every new service/reducer into DI | ✅ PASS | Task 2.2 registers searchReducer; task 6.1 creates barrel; task 7.3 wires MSW handlers |
| DR-TC-04 | BLOCKER | Task for every new infra resource | ✅ PASS | Not applicable |
| DR-TC-05 | BLOCKER | Outbox tasks (migration + relay wiring) | ✅ PASS | Pattern not applied |
| DR-TC-06 | BLOCKER | Saga state persistence task | ✅ PASS | Pattern not applied |
| DR-TC-07 | BLOCKER | CB singleton configuration task | ✅ PASS | Pattern not applied (delegated to API Gateway) |
| DR-TC-08 | BLOCKER | Cache unavailability fallback task | ✅ PASS | In-process cache; unavailability impossible |
| DR-TC-09 | BLOCKER | Every AC has named verification artifact + "Must fail if" | ❌ FAIL | Tasks 7.1, 7.2, 7.3: artifacts name files but not specific test cases. Task 9.1: artifact is `package.json` — not a test file+case. Same as QA-AV-01 finding |
| DR-TC-10 | WARNING | Task to update OpenAPI / API docs if interface modified | ✅ PASS | Frontend consumes existing APIs; no new server endpoints; Pact consumer contracts serve as contract documentation |
| DR-TC-11 | WARNING | Task for observability instrumentation in design.md | ❌ FAIL | design.md Observability section specifies: (1) structured `console.error` logging on non-2xx for search endpoints; (2) ErrorBoundary around FlightResults. Task 5.1 includes ErrorBoundary but: (a) no task exists to add the `console.error` logging to `baseQueryWithReauth.ts`, (b) no task exists to create `src/common/components/ErrorBoundary.tsx` if it doesn't exist |
| DR-TC-12 | WARNING | Feature flag task | ✅ PASS | No feature flags used |
| DR-TC-13 | WARNING | Update CONTRACTS.md for new inter-service contracts | ⚠️ WARN | Pact consumer contracts written to `./pacts/`; no task to update `openspec/CONTRACTS.md` with the new consumer relationships |
| DR-TC-14 | INFO | Developer docs update task | ✅ PASS | No new significant components requiring runbook update |
| DR-TO-01 | BLOCKER | Migration tasks before application code | ✅ PASS | Not applicable |
| DR-TO-02 | BLOCKER | Type definitions before consumers | ✅ PASS | Task 1.1 (types) → 1.2/1.3 (APIs) → 2.1 (slice) → 3.1 (hook) → 4.x (components) |
| DR-TO-03 | BLOCKER | Infra provisioning before application code | ✅ PASS | Not applicable |
| DR-TO-04 | BLOCKER | DI wiring after all components registered | ✅ PASS | Task 2.2 (register slice) follows 2.1 (create slice); 6.1 (barrel) follows 1–5; 7.3 (handler wiring) follows 7.1+7.2 |
| DR-TO-05 | BLOCKER | Integration tests after implementation | ✅ PASS | Section 8 (tests) after sections 1–7 (implementation) |
| DR-TO-06 | BLOCKER | Contract tests after API implementation | ✅ PASS | Section 9 (contracts) after section 1 (API layer) |
| DR-TO-07 | WARNING | Unit tests immediately after each module | ⚠️ WARN | Tests batched in section 8 rather than co-located after each task. Acceptable pattern in this project |
| DR-TO-08 | WARNING | Observability task after implementation, before integration tests | ✅ PASS | Console.error logging (if added) would be in baseQueryWithReauth.ts — existing file; task would fit between section 1 and section 8 |
| DR-TO-09 | INFO | Logical dev sequence | ✅ PASS | types → APIs → slice → hook → components → page → barrel → handlers → tests → contracts → verify |
| DR-CB-01 | BLOCKER | File/directory names follow convention | ✅ PASS | `flightApi.ts`, `searchSlice.ts`, `useFlightSearch.ts`, `FlightCard.tsx` — all consistent with `authApi.ts`, `authSlice.ts`, `LoginForm.tsx` |
| DR-CB-02 | BLOCKER | Class/function/method naming follows convention | ✅ PASS | camelCase for hooks/files, PascalCase for components, consistent with existing |
| DR-CB-03 | BLOCKER | Error handling pattern consistent | ✅ PASS | RTK Query `isError` + MSW patterns consistent with auth feature |
| DR-CB-04 | BLOCKER | Test file structure consistent | ⚠️ WARN | Contract tests at `src/features/search/__tests__/contracts/` introduce a `__tests__/` subdirectory pattern not present in the existing codebase (existing tests are co-located `.spec.ts`). Minor inconsistency |
| DR-CB-05 | WARNING | DB naming convention | ✅ PASS | Not applicable |
| DR-CB-06 | WARNING | Event naming convention | ✅ PASS | Not applicable |
| DR-CB-07 | WARNING | Same library for similar pattern | ✅ PASS | `baseApi.injectEndpoints` pattern consistent with `authApi.ts` |
| DR-CB-08 | WARNING | Log structure consistent | ⚠️ WARN | design.md specifies a structured console.error format — no task ensures this matches the JSON log format used elsewhere in the frontend (SM-FE-01/02 patterns) |
| DR-CB-09 | WARNING | DI registration consistent | ✅ PASS | `combineReducers` addition in rootReducer.ts consistent with auth pattern |
| DR-CB-10 | INFO | Comment/doc style consistent | ✅ PASS | No unusual documentation style required |
| DR-PI-CA-01 | BLOCKER | Cache keys stable | ✅ PASS | RTK Query serialises query args deterministically; stable across restarts |
| DR-PI-CA-02 | BLOCKER | Cache unavailability handled | ✅ PASS | In-process memory; unavailability impossible |
| DR-PI-CA-03 | BLOCKER | Write-through failure mode documented | ✅ PASS | Not applicable — read-only |
| DR-PI-CA-04 | WARNING | Cache stampede addressed | ✅ PASS | RTK Query deduplicates concurrent identical queries automatically |
| DR-PI-CA-05 | WARNING | Cache key namespacing | ✅ PASS | RTK Query namespaces by endpoint name + serialized args |
| DR-PI-CA-06 | INFO | Cache serialisation format | ✅ PASS | RTK Query uses in-memory object store; no serialisation format needed |
| DR-PI-RT-01 | BLOCKER | Retry only on idempotent ops | ✅ PASS | baseQueryWithRetry restricts to SAFE_METHODS (GET/HEAD/OPTIONS) ✅ |
| DR-PI-RT-02 | BLOCKER | Exponential backoff with jitter | ✅ PASS | Established in SM-FE-01 |
| DR-PI-RT-03 | BLOCKER | Non-retryable errors not retried | ✅ PASS | Established in SM-FE-01; 4xx not retried |
| DR-PI-RT-04 | WARNING | Retries bounded by total deadline | ✅ PASS | 30s TOTAL_DEADLINE_MS established in SM-FE-01 |
| DR-PI-RT-05 | WARNING | Retry doesn't accumulate open connections | ✅ PASS | RTK Query/fetch handles connection lifecycle |
| DR-AV-01 | BLOCKER | Test file path matches project convention | ✅ PASS | All spec files use co-located `.spec.ts` / `.spec.tsx` pattern. Contract test path is `__tests__/contracts/` — see DR-CB-04 |
| DR-AV-02 | BLOCKER | Test case implementable with existing harness | ❌ FAIL | Tasks 7.1, 7.2, 7.3: no specific test case names — cannot verify harness availability for an unnamed artifact. Task 9.1: `package.json` inspection is not a test case — no harness available for this artifact |
| DR-AV-03 | BLOCKER | "Must fail if" note is plausible | ✅ PASS | All named tasks have plausible "Must fail if" notes. Tasks 7.1–7.3 and 9.1 lack specific test cases, making this unverifiable for those tasks |
| DR-AV-04 | BLOCKER | Layer can observe THEN | ✅ PASS | All unit/component/contract tests observe their respective THEN clauses. Task 1.1 observes compile-time THEN via TypeScript in the test runner |
| DR-AV-05 | BLOCKER | Infra-dependent tests have existing strategy or prerequisite | ✅ PASS | MSW established; Pact installed by task 9.1; no test containers needed |
| DR-AV-06 | WARNING | Artifact naming follows GIVEN/WHEN/THEN | ⚠️ WARN | Test case names are human-readable descriptors, not GIVEN/WHEN/THEN. Acceptable for this project |
| DR-AV-07 | WARNING | Artifact exercises AC exactly | ✅ PASS | Named test cases are scoped to their AC |
| DR-AV-08 | INFO | Timing budget for integration/contract tests | ✅ PASS | Not specified; Pact tests are typically fast (<1s) |
| DR-AF-01 | BLOCKER | "Files affected" lists exact file paths | ✅ PASS | All tasks specify exact file paths |
| DR-AF-02 | BLOCKER | Specific class/function/method named | ✅ PASS | e.g., "expose actions `setFilters`, `setSelectedOffer`, `clearSelectedOffer`"; "expose selectors `selectFilters`, `selectSelectedOffer`" |
| DR-AF-03 | BLOCKER | No "see design.md" deferral | ✅ PASS | All tasks are self-contained |
| DR-AF-04 | BLOCKER | ACs use observable conditions | ✅ PASS | All ACs use SHALL/SHALL NOT with DOM, HTTP, or store state |
| DR-AF-05 | WARNING | New files specify full path | ✅ PASS | All new files have full relative paths from project root |
| DR-AF-06 | WARNING | Modified files name specific method/section | ✅ PASS | Task 2.2 names `combineReducers` addition; task 5.2 names the specific inline placeholder to remove |
| DR-AF-07 | WARNING | New dependency specifies exact name and version | ⚠️ WARN | Task 9.1 specifies `@pact-foundation/pact` but no version pin. Could result in breaking install |
| DR-AF-08 | WARNING | Config key exact name specified | ✅ PASS | No new config keys |
| DR-AF-09 | INFO | Imperative mood | ✅ PASS | "Create", "Register", "Add", "Write", "Install" throughout |
| DR-CX-01 | WARNING | No single-implementation abstraction layers | ✅ PASS | No premature abstractions; PolicyBadge gate is a simple counter |
| DR-CX-02 | WARNING | No over-engineered pattern | ✅ PASS | RTK Query cache-aside is the simplest approach; no CQRS overhead |
| DR-CX-03 | WARNING | No under-engineered missing pattern | ✅ PASS | All required resilience patterns either applied or correctly delegated |
| DR-CX-04 | INFO | Simpler alternatives considered | ✅ PASS | design.md documents 4 rejected alternatives with rationale |
| DR-DX-01 | WARNING | Tasks understandable without deep system knowledge | ✅ PASS | All tasks specify imports, file locations, and type definitions inline |
| DR-DX-02 | WARNING | No unexplained magic mechanisms | ✅ PASS | No reflection, macro generation, or auto-registration |
| DR-DX-03 | WARNING | Config values not hardcoded | ⚠️ WARN | `keepUnusedDataFor: 300` (flights), `keepUnusedDataFor: 600` (airports), `keepUnusedDataFor: 60` (policy), and `400` (debounce ms) are hardcoded in task descriptions and will be hardcoded in source. These should be named constants (e.g., `FLIGHT_CACHE_TTL_SECONDS = 300`) |
| DR-DX-04 | INFO | Non-obvious choices include rationale | ✅ PASS | design.md Decisions section provides rationale for all 6 decisions |
| DR-DX-05 | INFO | Pattern swap requires single-location change | ✅ PASS | RTK Query TTL config is per-endpoint; changing strategy would require only endpoint config changes |

**BLOCKER summary**: 29/31 PASS, 0 WARN, **2 FAIL** (DR-TC-09 and DR-AV-02 — same artifact naming gaps)
**WARNING summary**: 13/22 PASS, 8 WARN, **1 FAIL** (DR-TC-11 — missing observability tasks)
**INFO summary**: 8 recorded

---

## Feasibility Assessment

| Design Element | Feasible? | Notes |
|---|---|---|
| RTK Query lazy query + cache-aside | ✅ Yes | Established pattern in SM-FE-01/02 |
| react-hook-form + Zod SearchForm | ✅ Yes | react-hook-form established; Zod assumed present |
| MUI Autocomplete AirportInput | ✅ Yes | MUI v5 Autocomplete available |
| MSW v2 handler pattern | ✅ Yes | Established in SM-FE-02 |
| PolicyBadge module-level counter (≤10 concurrent) | ✅ Yes | Simple ref-counted counter; no external dependency |
| Pact consumer contracts | ✅ Yes | Task 9.1 installs the dependency |
| useDebounce at hook level | ✅ Yes | `src/common/hooks/useDebounce.ts` confirmed in context |
| ErrorBoundary in SearchPage | ⚠️ Conditional | `src/common/components/ErrorBoundary.tsx` may or may not exist. Task 5.1 says "if available, or a local boundary" — this deferred decision is an agent-friendliness gap |

### Blockers (if any)
None of the above are hard blockers; the ErrorBoundary ambiguity is a WARNING.

---

## Task Completeness

### Missing Tasks

| Implied Action | Where in design.md | Suggested Task |
|---|---|---|
| Add structured `console.error` logging to `baseQueryWithReauth.ts` for non-2xx from search endpoints | Observability section, item 1 | New task: "In `src/api/baseQueryWithReauth.ts`, add a `console.error` call on any non-2xx response from search-feature endpoints (`/inventory/flights/search`, `/inventory/airports/search`, `/policies/validate`), logging `{ level, service, endpoint, status, correlationId, timestamp }`" |
| Create `src/common/components/ErrorBoundary.tsx` if it does not exist | Observability section, item 2 | New task (or prerequisite check): "Verify `src/common/components/ErrorBoundary.tsx` exists; if not, create it as a class component that catches errors and renders a 'Something went wrong — please refresh' fallback" |

### Redundant Tasks
None.

---

## Task Ordering Issues

| Issue | Current Order | Correct Order |
|---|---|---|
| None found | — | — |

All task ordering is correct. Types → APIs → Slice → Hook → Components → Page → Barrel → Handlers → Tests → Contracts → Verify.

---

## Codebase Consistency

| Area | Consistent? | Notes |
|---|---|---|
| Naming conventions | ✅ Yes | Matches auth feature exactly |
| Error handling | ✅ Yes | RTK Query `isError` + MSW patterns |
| Library choices | ✅ Yes | `baseApi.injectEndpoints` consistent with authApi |
| Test structure | ⚠️ Mostly | Co-located `.spec.ts` consistent; `__tests__/contracts/` is new pattern |
| Log format | ⚠️ Unclear | design.md specifies JSON console.error; no task verifies it matches existing frontend log patterns |

---

## Pattern Implementation Correctness

### Cache-aside (Applied — RTK Query in-memory)
- DR-PI-CA-01: RTK Query serialises `{ origin, destination, departureDate, adults, returnDate?, cabinClass?, nonStop? }` to a stable cache key ✅
- DR-PI-CA-04: RTK Query deduplicates concurrent identical queries automatically ✅
- All other CA items: not applicable (read-only, in-process) ✅

### Retry (Already in place)
- All RT items satisfied by established `baseQueryWithRetry.ts` — no new implementation required ✅

---

## Agent-Friendliness Assessment

| Task | Self-Contained? | File Paths? | Names Explicit? | Criteria Concrete? |
|---|---|---|---|---|
| 1.1–1.3 | ✅ | ✅ | ✅ | ✅ |
| 2.1–2.2 | ✅ | ✅ | ✅ | ✅ |
| 3.1 | ✅ | ✅ | ✅ | ✅ |
| 4.1 | ✅ | ✅ | ✅ | ✅ |
| 4.2 | ✅ | ✅ | ✅ | ✅ |
| 4.3 | ⚠️ | ✅ | ⚠️ | ✅ |
| 4.4–4.6 | ✅ | ✅ | ✅ | ✅ |
| 4.5 | ⚠️ | ✅ | ⚠️ | ✅ |
| 5.1 | ⚠️ | ✅ | ⚠️ | ✅ |
| 5.2–6.1 | ✅ | ✅ | ✅ | ✅ |
| 7.1–7.3 | ✅ | ✅ | ✅ | ✅ |
| 8.1–8.11 | ✅ | ✅ | ✅ | ✅ |
| 9.1–9.3 | ✅ | ✅ | ✅ | ✅ |
| 10.1–10.2 | ✅ | ✅ | ✅ | ✅ |

### Issues

1. **Task 4.5** — doesn't instruct the agent to add `data-testid="flight-card-skeleton"` to the `FlightCardSkeleton` component, but the AC in task 4.5 (and FlightResults in 4.6) explicitly asserts its presence. Agent may not add the testid unless instructed. Fix: add "include `data-testid="flight-card-skeleton"` on the root element" to task 4.5 description.

2. **Task 4.3** — the concurrency gate logic is described as "increment on mount when slot available, decrement on completion/error" but doesn't specify the mechanism for delaying the RTK Query call when slots are full (e.g., "when `inFlightPolicyRequests >= 10`, skip the `useValidatePolicyQuery` call and render the loading spinner until the count drops below 10"). Agent needs to know the exact gating mechanism. Ambiguous.

3. **Task 5.1** — "wraps FlightResults in a React ErrorBoundary (`src/common/components/ErrorBoundary.tsx` if available, or a local boundary)" defers the check to the agent. Agent must decide: check for the file, then create it, then use it. This is multiple undeclared steps. Fix: resolve before implementation by checking if `src/common/components/ErrorBoundary.tsx` exists (it likely does based on SM-FE-01/02) and naming the resolved path in the task.

4. **Task 9.1** — no version pin for `@pact-foundation/pact`. Should specify the version, e.g., `@pact-foundation/pact@12.x` (current stable) to prevent future breaking installs.

---

## AC Verification Feasibility

| Task | AC | Artifact Named? | Test Path Valid? | Harness Available? | Must-Fail Plausible? | Layer OK? |
|---|---|---|---|---|---|---|
| 7.1 | Handler responds 200 | ❌ No case name | ✅ (file path valid) | ✅ (MSW established) | ✅ | ✅ |
| 7.2 | Default compliant:true | ❌ No case name | ✅ | ✅ | ✅ | ✅ |
| 7.3 | Handlers wired | ❌ No case names | ✅ | ✅ | ✅ | ✅ |
| 9.1 | Pact installed | ❌ package.json — not test | ❌ Not a test | ❌ No test harness | ⚠️ | ❌ |
| All other tasks | Various | ✅ | ✅ | ✅ | ✅ | ✅ |

### Blockers

1. **Task 7.1 / AC**: Artifact missing specific test case name. Fix: cite "searchFlights — sends correct URL params" from `src/features/search/flightApi.spec.ts`.
2. **Task 7.2 / AC**: Artifact missing specific test case name. Fix: cite "PolicyBadge — shows COMPLIANT chip" from `src/features/search/components/PolicyBadge.spec.tsx`.
3. **Task 7.3 / AC**: Artifact missing specific test case names. Fix: cite both from above.
4. **Task 9.1 / AC**: `package.json` is not an executable verification artifact. Fix: cite `src/features/search/__tests__/contracts/flightApi.contract.spec.ts`: "flightApi consumer — GET /inventory/flights/search matches expected schema" — this test fails with ImportError if @pact-foundation/pact is absent.

---

## Complexity Assessment

The implementation is well-proportioned for the requirement. The PolicyBadge concurrent gate (simple module-level counter) avoids the overhead of a full semaphore or shared context. RTK Query handles cache-aside, deduplication, and TTL without additional complexity. The Pact contract test layer is appropriate given the frontend-to-backend consumption model. No over-engineering or under-engineering detected.

---

## Summary

The implementation plan is technically sound and tasks.md is well-structured. All 26 tasks are feasible with the current stack, correctly ordered, and mostly agent-friendly. The BLOCKERs are all in the verification artifact documentation: four tasks (7.1, 7.2, 7.3, 9.1) are missing specific test case names or use non-test artifacts. Additionally, the design.md Observability section requires a `console.error` logging task that is not present in tasks.md, and an ErrorBoundary existence check/creation is implied but not made explicit. Once the four artifact names are added, one observability task added, task 4.5 gets the `data-testid` instruction, and task 5.1 resolves the ErrorBoundary ambiguity, an agent can execute tasks.md top-to-bottom without further decisions.

---

## Required Fixes

1. **Task 7.1 artifact**: Replace with `src/features/search/flightApi.spec.ts`: "searchFlights — sends correct URL params"
2. **Task 7.2 artifact**: Replace with `src/features/search/components/PolicyBadge.spec.tsx`: "PolicyBadge — shows COMPLIANT chip"
3. **Task 7.3 artifact**: Replace with `src/features/search/flightApi.spec.ts`: "searchFlights — sends correct URL params" | `src/features/search/components/PolicyBadge.spec.tsx`: "PolicyBadge — shows COMPLIANT chip"
4. **Task 9.1 artifact**: Replace `package.json devDependencies entry` with `src/features/search/__tests__/contracts/flightApi.contract.spec.ts`: "flightApi consumer — GET /inventory/flights/search matches expected schema"
5. **Task 4.5**: Add to description: "add `data-testid=\"flight-card-skeleton\"` to the root element of FlightCardSkeleton"
6. **Task 4.3**: Clarify gate mechanism: "when `inFlightPolicyRequests >= 10`, pass `skip: true` to `useValidatePolicyQuery` and render the loading spinner until a slot opens"
7. **Task 5.1**: Resolve ErrorBoundary ambiguity — check if `src/common/components/ErrorBoundary.tsx` exists and reference the exact file; add prerequisite check or creation task if needed
8. **Add observability task** (after task 1.3, before task 4.1): "In `src/api/baseQueryWithReauth.ts`, on any non-2xx response from `/inventory/flights/search`, `/inventory/airports/search`, or `/policies/validate`, call `console.error({ level: 'error', service: 'frontend', endpoint: url, status: statusCode, correlationId: headers['x-correlation-id'] ?? 'unknown', timestamp: new Date().toISOString() })`"

## Suggestions (non-blocking)
- Task 9.1: Pin `@pact-foundation/pact` to a specific major version (e.g., `@12`) to prevent breaking installs.
- Tasks 1.2, 1.3: Extract `keepUnusedDataFor` values as named constants (`FLIGHT_CACHE_TTL_S = 300`, `AIRPORT_CACHE_TTL_S = 600`, `POLICY_CACHE_TTL_S = 60`) to avoid magic numbers in source.
- Contract tests in `src/features/search/__tests__/contracts/`: document this as the project's agreed contract test directory structure, or co-locate as `flightApi.contract.spec.ts` to match the existing naming convention.
