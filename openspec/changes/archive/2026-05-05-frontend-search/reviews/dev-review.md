# Developer Review Report: frontend-search

**Reviewer Role**: Senior Developer
**Verdict**: FAIL
**Sub-Module**: [SM-FE-03] Flight Search Feature

---

## Checklist Results

| ID | Item | Status | Notes |
|---|---|---|---|
| DR-FE-01 | All referenced libraries already in package.json | PASS | React 18, RTK Query, MUI v5, Zod, react-hook-form, react-router-dom — all present from SM-FE-01/02 |
| DR-FE-02 | All infra components available | PASS | No new infra; RTK Query in-memory cache; API Gateway already running |
| DR-FE-03 | All env vars exist or have add-task | PASS | `REACT_APP_API_URL` already in `window.__ENV__`; no new env vars needed |
| DR-FE-04 | Runtime version consistent with PROJECT.md | PASS | React 18, TypeScript 5.x, Node 22 — all used |
| DR-FE-05 | New dependencies evaluated for licence/security | PASS | No new dependencies |
| DR-FE-06 | Version-specific API usage noted | PASS | No version-specific APIs beyond what's in use |
| DR-FE-07 | Platform-specific constraints documented | PASS | N/A |
| DR-TC-01 | DB migration tasks exist | PASS | N/A — frontend only |
| DR-TC-02 | Env var tasks exist | PASS | N/A |
| DR-TC-03 | DI wiring tasks exist | PASS | RTK Query inject-endpoints auto-registers on import; barrel export (6.1) ensures import. rootReducer (2.2) wiring task present |
| DR-TC-04 | Infra provisioning tasks exist | PASS | N/A |
| DR-TC-05 | Outbox tasks | PASS | Pattern not applied — skipped |
| DR-TC-06 | Saga state persistence task | PASS | Pattern not applied — skipped |
| DR-TC-07 | Circuit Breaker singleton task | PASS | Delegated to API Gateway — skipped |
| DR-TC-08 | Cache unavailability fallback task | PASS | RTK Query in-memory cache cannot fail independently; fallback N/A |
| DR-TC-09 | Every functional task has named AC + "Must fail if" note | FAIL | No task in tasks.md has an AC, a named verification artifact, or a "Must fail if" note. Systemic BLOCKER — 26/26 tasks unverified |
| DR-TC-10 | OpenAPI spec update task | PASS | No new contracts published; consuming existing endpoints |
| DR-TC-11 | Observability instrumentation task | FAIL | No observability task (no X-Correlation-ID forwarding task, no error boundary task). Architect required this as a fix |
| DR-TC-12 | Feature flag task | PASS | N/A |
| DR-TC-13 | CONTRACTS.md update task | PASS | No new contracts |
| DR-TC-14 | Docs update task | PASS | N/A |
| DR-TO-01 | Migration before code | PASS | N/A |
| DR-TO-02 | Type definitions before consumers | PASS | Task 1.1 (types) precedes all other tasks ✅ |
| DR-TO-03 | Infra provisioning before code | PASS | N/A |
| DR-TO-04 | DI wiring after all components | PASS | Barrel (6.1) and rootReducer (2.2) come after components (4.x) and slice (2.1) |
| DR-TO-05 | Integration tests after implementation | PASS | Group 8 follows groups 1–7 |
| DR-TO-06 | Contract tests after contract implementation | PASS | No contract tests defined (gap already flagged by QA) |
| DR-TO-07 | Unit tests immediately after implementation | WARN | Test tasks are batched in group 8; they don't follow each implementation task immediately |
| DR-TO-08 | Observability after implementation, before integration tests | WARN | No observability task exists |
| DR-TO-09 | Logical development sequence | PASS | types → API → slice → hook → components → page → barrel → mocks → tests — correct sequence |
| DR-CB-01 | File/directory names follow convention | WARN | Task 1.2 creates `flightApi.ts` containing both `searchFlights` AND `searchAirports`, but `design.md` Goals lists `airportApi` as a separate entry (`airportApi — RTK Query query, keepUnusedDataFor: 600`). Inconsistency between design and tasks |
| DR-CB-02 | Class/function names follow conventions | PASS | camelCase hooks, PascalCase components — consistent |
| DR-CB-03 | Error handling matches existing pattern | PASS | FlightResults error banner follows GlobalSnackbar/error state pattern from auth feature |
| DR-CB-04 | Test file structure consistent | PASS | Co-located `.spec.ts` / `.spec.tsx` files match SM-FE-02 convention |
| DR-CB-05 | DB naming convention | PASS | N/A |
| DR-CB-06 | Event naming convention | PASS | N/A |
| DR-CB-07 | Same library as existing pattern | PASS | RTK Query inject, MSW v2, Vitest — all consistent with SM-FE-02 |
| DR-CB-08 | Log statement structure consistent | WARN | No error logging design; no log-statement tasks |
| DR-CB-09 | DI registration consistent | PASS | inject-into-baseApi pattern consistent with authApi |
| DR-PI-RT-01 | Retries only on idempotent ops | PASS | SAFE_METHODS only in baseQueryWithRetry.ts; all three new endpoints are GET ✅ |
| DR-PI-RT-02 | Exponential backoff with jitter | PASS | Already implemented in baseQueryWithRetry.ts (SM-FE-01) |
| DR-PI-RT-03 | Non-retryable 4xx not retried | PASS | Already in baseQueryWithRetry.ts |
| DR-PI-RT-04 | Retry bounded by deadline | PASS | TOTAL_DEADLINE_MS = 30_000 already in place |
| DR-PI-RT-05 | No connection accumulation on retry | PASS | AbortController in baseQueryWithTimeout.ts cleans up per-attempt |
| DR-PI-CA-01 | Cache keys stable across restarts | PASS | RTK Query derives keys from endpoint name + serialised args — deterministic ✅ |
| DR-PI-CA-02 | Cache unavailability handled | PASS | N/A — browser in-memory; cannot become unavailable independently |
| DR-PI-CA-03 | Write-through failure mode | PASS | N/A — cache-aside, read-only |
| DR-PI-CA-04 | Cache stampede | PASS | Single-user browser session; no concurrent instances per user |
| DR-PI-CA-05 | Cache key namespacing | PASS | RTK Query auto-namespaces by reducerPath ('api') + endpoint name |
| DR-AV-01 | Verification artifact paths match project test convention | FAIL | No artifact paths named anywhere in tasks.md — cannot evaluate. Same systemic BLOCKER as DR-TC-09 |
| DR-AV-02 | Artifacts implementable with existing harness | FAIL | No artifacts named — cannot confirm harness availability |
| DR-AV-03 | "Must fail if" notes are plausible | FAIL | No "Must fail if" notes exist |
| DR-AV-04 | Verification layer can observe THEN | FAIL | Several spec THEN clauses assert internal symbols — even if tests were named, the layer would be wrong (QA flagged) |
| DR-AV-05 | Infra-dependent artifacts have prerequisite task | PASS | All test tasks use MSW (no DB/broker infra needed); contract tests missing entirely |
| DR-AV-06 | Artifact naming follows convention | WARN | No artifact names to evaluate |
| DR-AV-07 | Timing/ordering artifacts use deterministic helpers | WARN | Task 8.3 mentions debounce test using `advance timer` — Vitest fake timers required; no task to configure fake timers. Should confirm `vi.useFakeTimers()` in spec |
| DR-AF-01 | Every task names exact file paths | PASS | All tasks include explicit paths (e.g., `src/features/search/flightApi.ts`) |
| DR-AF-02 | Every task names specific function/class | PASS | Interfaces, actions, selectors all named explicitly |
| DR-AF-03 | No task defers to design.md | WARN | Task 3.1: "applies 400 ms debounce via existing `useDebounce` utility" — does not specify import path (`../../common/hooks/useDebounce`). An agent would need to find it |
| DR-AF-04 | Every AC uses concrete pass/fail conditions | FAIL | No ACs present in tasks.md. BLOCKER |
| DR-AF-05 | New files specify full path | PASS | All new file paths are explicit |
| DR-AF-06 | Modified file tasks name specific method/section | FAIL | Task 5.2 says "Add `/search` route to `src/routes/AppRoutes.tsx`" but the route **already exists** as a placeholder. The real action is: (a) remove inline `function SearchPage()` placeholder, (b) add `import { SearchPage } from '../features/search'`. No agent would know this without reading the file |
| DR-AF-07 | New deps specify exact package + version | PASS | No new deps |
| DR-AF-08 | Config keys named exactly | PASS | No new config keys |
| DR-AF-09 | Tasks use imperative mood | PASS | "Create", "Add", "Write", "Register" — consistent |
| DR-CX-01 | No premature abstraction | PASS | `useFlightSearch` hook is justified — wraps debounce + lazy trigger used by SearchForm; not over-abstracted |
| DR-CX-02 | No over-engineering | PASS | Feature-slice + RTK Query is appropriate for SPA of this scale |
| DR-CX-03 | No under-engineering | PASS | Caching (5 min), retry (inherited), and policy badge are all required |
| DR-DX-01 | Tasks understandable without system knowledge | WARN | Task 7.3 specifies `src/mocks/server.ts` but server.ts is a 2-line wrapper; actual handler registration is in `src/mocks/handlers/index.ts`. An agent updating `server.ts` would not achieve the desired result |
| DR-DX-02 | No "magic" mechanism | PASS | RTK Query inject pattern is standard and documented |
| DR-DX-03 | Config values not hardcoded | WARN | TTL values (300, 600, 60) are hardcoded in `keepUnusedDataFor` fields in task descriptions — acceptable for RTK Query config, but should be constants from a config file for maintainability |
| DR-DX-04 | Non-obvious choices include rationale | PASS | Design.md Decisions section covers all major choices |
| DR-DX-05 | Pattern changes require one-file edit | PASS | `baseQueryWithRetry.ts` is the single retry config location |

---

## Feasibility Assessment

| Design Element | Feasible? | Notes |
|---|---|---|
| RTK Query `useLazySearchFlightsQuery` | ✅ Yes | RTK Query 2.x lazy query API available |
| RTK Query `useSearchAirportsQuery` with `skip` | ✅ Yes | Standard RTK Query conditional fetch |
| `useValidatePolicyQuery` per FlightCard | ✅ Yes | inject-into-baseApi pattern; 50 simultaneous queries are technically feasible (browser permits) |
| MUI `Autocomplete` for AirportInput | ✅ Yes | MUI v5 Autocomplete available |
| `useDebounce` at hook level | ✅ Yes | `src/common/hooks/useDebounce.ts` confirmed in codebase |
| Zod schema for SearchForm | ✅ Yes | Zod + react-hook-form already used in LoginForm |
| RTK Query `keepUnusedDataFor` per endpoint | ✅ Yes | Supported since RTK Query 1.x; overrides `baseApi` default of 60s |
| Vitest fake timers for debounce test | ✅ Yes | `vi.useFakeTimers()` available in Vitest 1.x |

---

## Task Completeness

### Missing Tasks

| Implied Action | Where in design.md / codebase | Suggested Task |
|---|---|---|
| Replace placeholder `SearchPage` in AppRoutes.tsx | AppRoutes.tsx already has inline placeholder + `/search` route | Correct task 5.2: "In `src/routes/AppRoutes.tsx`, remove the inline placeholder `function SearchPage()` and replace with `import { SearchPage } from '../features/search'`" |
| Update `src/mocks/handlers/index.ts` to include inventoryHandlers + policyHandlers | `handlers/index.ts` is the barrel; `server.ts` doesn't import individual handlers | Correct task 7.3: "In `src/mocks/handlers/index.ts`, import `inventoryHandlers` and `policyHandlers` and spread them into the `handlers` array" |
| Add observability: X-Correlation-ID forwarding + error boundary | Architect required this; no task exists | New task: "In `src/api/baseQueryWithReauth.ts`, read `X-Correlation-ID` from API response headers and attach to structured console.error logs for failed requests" |
| `airportApi` naming vs `flightApi` | design.md Goals names `airportApi` separately; tasks.md collapses both into `flightApi.ts` | Clarify in task 1.2: either the combined file is intentional (rename the section in design.md) or split into `flightApi.ts` + `airportApi.ts` |
| Specify `useDebounce` import path | Task 3.1 says "existing useDebounce utility" without path | Update task 3.1 to include `import { useDebounce } from '../../common/hooks/useDebounce'` |
| Pact contract tests for consumed APIs | ADR-010 requires contract tests; QA flagged | Add task: "Write Pact consumer contract test for `GET /inventory/flights/search` at `src/features/search/__tests__/contracts/flightApi.contract.spec.ts`" |

### Redundant Tasks
- None detected.

---

## Task Ordering Issues

| Issue | Current Order | Correct Order |
|---|---|---|
| Unit tests batched in group 8, not co-located with implementation tasks | 1.1 → 4.6 (impl), then 8.1–8.9 (all tests) | Preferred: test task immediately follows implementation task (e.g., 1.1 types + 1.2 types test, then 2.1 slice + 2.2 slice test). Grouped-at-end is functional but less incremental. WARNING only. |

---

## Codebase Consistency

| Area | Consistent? | Notes |
|---|---|---|
| Feature-slice directory structure | ✅ Yes | `components/`, `pages/`, `hooks/`, `api/`, `slice/`, `types/` — mirrors `features/auth/` |
| RTK Query inject-into-baseApi | ✅ Yes | Matches `authApi.ts` exactly: `baseApi.injectEndpoints({ endpoints: (build) => ({...}), overrideExisting: false })` |
| Co-located `.spec.tsx` tests | ✅ Yes | Matches auth feature test placement |
| MSW handler file naming | ✅ Yes | `inventory.handlers.ts`, `policy.handlers.ts` — matches `auth.handlers.ts` naming |
| MSW handler barrel update | ❌ Wrong file | Task 7.3 says update `server.ts`; correct target is `handlers/index.ts` |
| AppRoutes placeholder replacement | ❌ Missing | Task 5.2 does not account for existing placeholder function |
| rootReducer.ts import | ⚠️ Incomplete | Task 2.2 says "Register `search: searchReducer`" but doesn't specify the import line to add |
| Barrel export (index.ts) | ✅ Matches | auth/index.ts pattern: re-export slice, actions, selectors, api, pages, hooks |

---

## Pattern Implementation Correctness

### Retries (Already in place — new GET endpoints apply existing logic)

| Check | Status | Notes |
|---|---|---|
| SAFE_METHODS only | ✅ Pass | GET /inventory/flights/search, GET /inventory/airports/search, GET /policies/validate — all GET |
| Exponential backoff with jitter | ✅ Pass | Existing baseQueryWithRetry.ts |
| 30s total deadline | ✅ Pass | TOTAL_DEADLINE_MS = 30_000 |
| 4xx non-retryable | ✅ Pass | Existing implementation |

### Cache-aside (Applied — RTK Query in-memory)

| Check | Status | Notes |
|---|---|---|
| Cache keys deterministic | ✅ Pass | RTK Query auto-derives from endpoint + serialised args |
| TTL values correctly applied per endpoint | ✅ Pass | Per-endpoint `keepUnusedDataFor` overrides global default |
| Unavailability handled | ✅ Pass | N/A — browser memory; RTK Query's default is re-fetch on cache miss |
| Stampede risk | ✅ Pass | Single user per browser session; no shared cache between users |

---

## Agent-Friendliness Assessment

| Task | Self-Contained? | File Paths? | Names Explicit? | Criteria Concrete? |
|---|---|---|---|---|
| 1.1 (types) | ✅ | ✅ | ✅ | ❌ No AC |
| 1.2 (flightApi) | ⚠️ | ✅ | ✅ | ❌ No AC |
| 1.3 (policyApi) | ✅ | ✅ | ✅ | ❌ No AC |
| 2.1 (searchSlice) | ✅ | ✅ | ✅ | ❌ No AC |
| 2.2 (rootReducer) | ⚠️ Missing import | ✅ | ✅ | ❌ No AC |
| 3.1 (useFlightSearch) | ⚠️ useDebounce path missing | ✅ | ✅ | ❌ No AC |
| 4.1–4.6 (components) | ✅ | ✅ | ✅ | ❌ No AC |
| 5.1 (SearchPage) | ✅ | ✅ | ✅ | ❌ No AC |
| 5.2 (AppRoutes) | ❌ Route already exists; task misleading | ✅ | ⚠️ Placeholder not mentioned | ❌ No AC |
| 6.1 (barrel) | ✅ | ✅ | ✅ | ❌ No AC |
| 7.1 (inventory handlers) | ✅ | ✅ | ✅ | ❌ No AC |
| 7.2 (policy handlers) | ✅ | ✅ | ✅ | ❌ No AC |
| 7.3 (register handlers) | ❌ Wrong file (`server.ts` instead of `handlers/index.ts`) | ❌ Wrong path | ❌ Wrong target | ❌ No AC |
| 8.1–8.9 (tests) | ⚠️ No spec scenario references | ✅ | ✅ | ❌ No named test cases |
| 9.1 (run tests) | ✅ | ✅ | ✅ | ⚠️ "≥80% coverage" is vague without a failing threshold |
| 9.2 (build) | ✅ | ✅ | ✅ | ✅ "zero TS errors" is concrete |

### Issues
- **Systemic**: All 26 tasks lack ACs and verification artifacts. An AI agent implementing these tasks has no machine-verifiable stopping condition — it cannot confirm "I am done with this task" without one.
- **Task 5.2**: Critically misleading. The `/search` route already exists in `AppRoutes.tsx` with an inline placeholder. An agent following this task as written would add a duplicate route. Correct action: replace placeholder import, not add a route.
- **Task 7.3**: Points to `src/mocks/server.ts` (a 2-line wrapper) instead of `src/mocks/handlers/index.ts` where handlers are actually aggregated.
- **Task 3.1**: Missing `useDebounce` import path — agent would have to search the codebase.

---

## AC Verification Feasibility

All tasks lack ACs and verification artifacts. Evaluation against DR-AV policy:

| Blockers Summary | Count |
|---|---|
| Tasks with no named verification artifact | 26 / 26 |
| Tasks with no "Must fail if" note | 26 / 26 |
| Spec scenarios with no artifact mapping | 25 / 25 |
| Contract test harness available (Pact) | Not confirmed — no Pact in package.json |

**Notable additional DR-AV-02 concern**: Contract tests (required by ADR-010, flagged by QA) would require Pact to be added to `package.json`. No prerequisite task exists to install `@pact-foundation/pact`. This is a missing prerequisite blocker for the contract-test layer.

---

## Complexity Assessment

The design is appropriately complex for the requirement. The feature-slice structure, RTK Query inject-into-baseApi pattern, and component composition are all proportionate to an SPA of this scale. The `useFlightSearch` hook is a reasonable abstraction wrapping debounce + lazy trigger. The per-card `PolicyBadge` fan-out is the only potentially over-engineered concern (N simultaneous API calls) but it is a deliberate design decision with documented trade-offs. No simpler alternative would preserve the per-result policy display requirement.

The only under-complexity concern is the absence of an error boundary component — unhandled RTK Query errors in `FlightCard` (e.g., during policy validation) could propagate to the React tree without a boundary. This should be added as a task.

---

## Summary

The task list is technically feasible, structurally ordered correctly, and aligned with the existing codebase conventions in all major respects. The RTK Query patterns, MSW setup, Vitest test structure, and Redux slice conventions all follow the SM-FE-02 precedent cleanly. However, the spec cannot be handed to an implementing agent as-is due to three concrete task-level defects: (1) **All 26 tasks lack acceptance criteria and verification artifacts** — an agent has no stopping condition; (2) **Task 5.2 is incorrect** — the `/search` route already exists as a placeholder, and the task must say "replace placeholder" not "add route"; (3) **Task 7.3 references the wrong file** — `server.ts` instead of `handlers/index.ts`. These three defects, combined with the systemic AC gap inherited from the spec and tasks.md authoring stage, make the change FAIL the implementability standard.

---

## Required Fixes

1. **[DR-TC-09 / DR-AF-04]** Add ACs to every functional task in `tasks.md`. Each AC must: (a) reference the spec scenario by name, (b) name the verification artifact as `<test-file-path>: "<test case name>"`, (c) include a "Must fail if" note. Minimum viable format:
   ```
   AC: GIVEN <state> WHEN <action> THEN <observable outcome>
   Artifact: src/features/search/searchSlice.spec.ts: "setSelectedOffer updates state"
   Must fail if: setSelectedOffer action is removed or selectedOffer selector returns wrong value
   ```
2. **[DR-AF-06]** Rewrite task 5.2: "In `src/routes/AppRoutes.tsx`, remove the inline placeholder `function SearchPage(): React.ReactElement { ... }` (lines ~16-18) and add `import { SearchPage } from '../features/search'` at the top. The `/search` route definition already exists and does not need to be added."
3. **[DR-DX-01]** Rewrite task 7.3: "In `src/mocks/handlers/index.ts`, import `inventoryHandlers` from `./inventory.handlers` and `policyHandlers` from `./policy.handlers`, then spread both into the `handlers` array alongside `authHandlers`."
4. **[DR-AF-03]** Update task 3.1 to specify: `import { useDebounce } from '../../common/hooks/useDebounce'` as the import to use in `useFlightSearch.ts`.
5. **[DR-TC-09 / DR-AV-02]** Add prerequisite task: "Install `@pact-foundation/pact` as a dev dependency (`npm install --save-dev @pact-foundation/pact --no-package-lock --legacy-peer-deps`)" before the contract test tasks (8.10, 8.11 from QA Required Fixes).
6. **[DR-CB-01]** Align `airportApi` naming between design.md and tasks.md: either (a) rename the Goals entry in design.md to note that `airportApi` endpoints are part of `flightApi.ts`, or (b) split into a separate `src/features/search/airportApi.ts` task.
7. **[DR-TC-11]** Add observability task: "In `src/api/baseQueryWithReauth.ts`, after a failed query (non-2xx), log a structured error including `{ endpoint, status, correlationId: response.headers['x-correlation-id'] ?? 'unknown', timestamp }` via `console.error` (browser-safe structured logging)."

## Suggestions (non-blocking)

- Add task 2.3: "Update `src/api/tagTypes.ts` to add `'Flight'` and `'Airport'` tag types for future use when booking mutations need to invalidate search cache."
- Consider adding a `React.ErrorBoundary` component task for `FlightCard` to prevent policy API errors from crashing the results list.
- Move test tasks to be co-located with their implementation tasks (e.g., task 2.1.test immediately after 2.1) to enable incremental verification during implementation.

---

*All four reviewer reports are now ready. Hand them all to `review-synthesizer` to produce the final council verdict.*
