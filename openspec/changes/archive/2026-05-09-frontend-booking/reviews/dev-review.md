# Developer Review Report: frontend-booking

**Reviewer Role**: Senior Developer
**Verdict**: PASS WITH WARNINGS
**Sub-Module**: [SM-FE-04] Booking Feature

---

## Checklist Results

### DR-FE — Technical Feasibility

| ID | Severity | Item | Status | Notes |
|---|---|---|---|---|
| DR-FE-01 | BLOCKER | All libraries in package.json | ✅ PASS | RTK Query, React Router v6, MUI v5, RHF + Zod, MSW, Pact all already installed; design explicitly states no new npm dependencies |
| DR-FE-02 | BLOCKER | All infrastructure in PROJECT.md | ✅ PASS | RTK Query in-memory cache only; no Redis, Kafka, or DB needed; all infrastructure is existing browser runtime |
| DR-FE-03 | BLOCKER | Env vars exist or have tasks | ✅ PASS | No new env vars; API base URL via existing `VITE_API_BASE_URL` (established in SM-FE-01) |
| DR-FE-04 | BLOCKER | Runtime/framework versions consistent | ✅ PASS | TypeScript 5.x, React 18, RTK Query 2.x, React Router v6 — all consistent with PROJECT.md |
| DR-FE-05 | WARNING | New deps evaluated for licence/security | ✅ PASS | No new dependencies introduced |
| DR-FE-06 | WARNING | Version-specific feature requirements noted | ✅ PASS | No version-specific API usage; design is consistent with existing RTK Query 2.x patterns |
| DR-FE-07 | INFO | Platform constraints documented | ✅ PASS | N/A — browser frontend; no platform-specific constraints |

### DR-TC — Task Completeness

| ID | Severity | Item | Status | Notes |
|---|---|---|---|---|
| DR-TC-01 | BLOCKER | DB migration task for every schema change | ✅ PASS | N/A — frontend; no database |
| DR-TC-02 | BLOCKER | Task for every new env var / config key | ✅ PASS | No new env vars |
| DR-TC-03 | BLOCKER | DI wiring task for every new component | ✅ PASS | Task 2.2 wires `bookingReducer` into rootReducer; task 3.2 wires `bookingHandlers`; task 7.1 adds routes; task 8.1 creates barrel |
| DR-TC-04 | BLOCKER | Task for every new infrastructure resource | ✅ PASS | N/A — no new infrastructure |
| DR-TC-05 | BLOCKER | Outbox: migration + relay tasks | ✅ PASS | Pattern not applied — skipped |
| DR-TC-06 | BLOCKER | Saga: state persistence task | ✅ PASS | Pattern not applied (backend-owned) — skipped |
| DR-TC-07 | BLOCKER | Circuit Breaker: singleton config task | ✅ PASS | Pattern not applied — skipped |
| DR-TC-08 | BLOCKER | Cache: unavailability fallback task | ✅ PASS | Cache-aside applied (RTK Query in-memory); unavailability N/A for in-memory browser cache |
| DR-TC-09 | BLOCKER | Every AC has named executable artifact + Must-fail-if | ✅ PASS | All 29 tasks now have ACs, named artifacts, and Must-fail-if notes |
| DR-TC-10 | WARNING | Task for updating OpenAPI spec if interface changed | ✅ PASS | Frontend is consumer only; no OpenAPI spec changes |
| DR-TC-11 | WARNING | Task for observability instrumentation from design.md | ❌ FAIL | **No task for extending `baseQueryWithReauth.ts` logging predicate to include `/bookings` paths** (explicitly specified in design.md Observability section) |
| DR-TC-12 | WARNING | Task for feature flags | ✅ PASS | No feature flags in project |
| DR-TC-13 | WARNING | Task for updating CONTRACTS.md | ❌ FAIL | **No task for registering the Pact consumer contract in `openspec/CONTRACTS.md`** after task 9.1 writes the pact file |
| DR-TC-14 | INFO | Task for developer documentation | ✅ PASS | No new architecture; no README update needed |

**Additional missing implied action** (not a named checklist item but a DR-AF-06 gap):

- **`src/routes/routes.config.ts`**: `AppRoutes.tsx` imports route path strings from `ROUTES` (a central constants map in `routes.config.ts`). Task 7.1 specifies route paths inline (`'/bookings/new'`, `'/bookings/:id/confirmation'`, etc.) but does not mention adding these to `routes.config.ts`. Without this, the route paths will be magic strings in `AppRoutes.tsx`, breaking the existing project convention.

### DR-TO — Task Ordering

| ID | Severity | Item | Status | Notes |
|---|---|---|---|---|
| DR-TO-01 | BLOCKER | Migration tasks before app code | ✅ PASS | N/A — no migrations |
| DR-TO-02 | BLOCKER | Type/interface tasks before consumers | ✅ PASS | Task 1.1 (types) is first; 1.2 (bookingApi) consumes types → correct order |
| DR-TO-03 | BLOCKER | Infrastructure tasks before app code | ✅ PASS | N/A — no new infrastructure |
| DR-TO-04 | BLOCKER | DI tasks after all components registered | ✅ PASS | Task 2.2 (rootReducer) after 2.1 (slice); task 8.1 (barrel) after all components |
| DR-TO-05 | BLOCKER | Integration tests after implementation | ✅ PASS | All spec files in same task as implementation; Pact test (9.1) is last |
| DR-TO-06 | BLOCKER | Contract tests after contract implementation | ✅ PASS | Task 9.1 (Pact) is last; `bookingApi` (1.2) is implemented in task 1 |
| DR-TO-07 | WARNING | Unit tests immediately after implementation | ✅ PASS | Each task includes its own spec file — not batched at the end |
| DR-TO-08 | WARNING | Observability task after implementation, before tests | ⚠️ WARN | No observability task exists (see DR-TC-11); if added, it should come after task 1.2 (API layer) and before component integration tests |
| DR-TO-09 | INFO | Logical development sequence | ✅ PASS | types → API → slice → reducerWire → MSW → hook → components → pages → routing → barrel → contract — consistent with search module structure |

### DR-CB — Codebase Consistency

| Area | Status | Notes |
|---|---|---|
| File and directory naming | ✅ PASS | `booking.types.ts`, `bookingApi.ts`, `bookingSlice.ts`, `hooks/useBooking.ts`, `components/BookingForm.tsx` — all follow `camelCase.ts` / `PascalCase.tsx` conventions |
| Function/class naming | ✅ PASS | `useBooking`, `BookingForm`, `BookingPage`, `bookingReducer`, `selectActiveBooking` — all follow existing PascalCase/camelCase/selector prefix conventions |
| Error handling pattern | ✅ PASS | RTK Query error surfaced as `error` return from hook; `Alert` component for display — matches existing `useFlightSearch` pattern |
| Test file structure | ✅ PASS | Co-located `.spec.ts/.spec.tsx`; Pact tests in `__tests__/contracts/` — matches SM-FE-03 convention exactly |
| Barrel structure | ✅ PASS | Task 8.1 barrel follows same 4-category structure as `features/search/index.ts` |
| RTK Query injection pattern | ✅ PASS | `baseApi.injectEndpoints()` with `overrideExisting: false` — matches `flightApi.ts` |
| MSW handler split | ✅ PASS | `booking.handlers.ts` per-domain file, spread into `handlers/index.ts` — matches `inventory.handlers.ts` / `policy.handlers.ts` pattern |
| Route constants | ⚠️ WARN | Task 7.1 specifies inline path strings (`'/bookings/new'` etc.) but `AppRoutes.tsx` uses `ROUTES` constants from `routes.config.ts` — task must also update `routes.config.ts` |
| Structured logging | ⚠️ WARN | `baseQueryWithReauth.ts` logging predicate extended in design.md Observability section but no task covers this extension |
| Redux store wiring | ✅ PASS | Task 2.2 adds `booking: bookingReducer` to `rootReducer.ts` — exactly matches existing `search: searchReducer` pattern |

### DR-PI — Pattern Implementation Correctness

#### Cache-aside (Applied — RTK Query)

| ID | Severity | Item | Status | Notes |
|---|---|---|---|---|
| DR-PI-CA-01 | BLOCKER | Cache keys deterministic and stable | ✅ PASS | RTK Query uses `{ endpointName, queryArgs }` as key — deterministic by library design; `keepUnusedDataFor: 0` for `getBookingById` prevents stale cache during polling |
| DR-PI-CA-02 | BLOCKER | Cache unavailability handled | ✅ PASS | N/A — in-memory browser cache; cannot become unavailable |
| DR-PI-CA-03 | BLOCKER | Write-through failure mode documented | ✅ PASS | N/A — cache-aside only; no write-through |
| DR-PI-CA-04 | WARNING | Cold-start stampede addressed | ✅ PASS | N/A — in-memory, single browser instance; no stampede concern |
| DR-PI-CA-05 | WARNING | Cache key namespacing | ✅ PASS | RTK Query provides isolation via `baseApi` reducerPath; per-feature tags (`Bookings` tag) further namespace correctly |
| DR-PI-CA-06 | INFO | Cache serialisation format | ✅ PASS | RTK Query default JSON normalisation — consistent with existing `flightApi` and `policyApi` |

#### Retries (Already in place — baseQueryWithRetry.ts)

| ID | Severity | Item | Status | Notes |
|---|---|---|---|---|
| DR-PI-RT-01 | BLOCKER | Retries only on idempotent ops | ✅ PASS | `SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']`; `POST /bookings` is excluded; confirmed in design.md PSL |
| DR-PI-RT-02 | BLOCKER | Exponential back-off includes jitter | ✅ PASS | `backoffDelay()` in `baseQueryWithRetry.ts` includes jitter (confirmed from source) |
| DR-PI-RT-03 | BLOCKER | Non-retryable errors not retried | ✅ PASS | Only `RETRYABLE_STATUSES = [408, 500, 502, 503, 504]` trigger retry; 4xx not included |
| DR-PI-RT-04 | WARNING | Retries bounded by deadline | ✅ PASS | `TOTAL_DEADLINE_MS = 30_000` hard wall-clock deadline |
| DR-PI-RT-05 | WARNING | Connection reuse on retry | ✅ PASS | RTK Query fetch API manages connections; no connection accumulation |

#### Saga (Already in place — backend)

All DR-PI-SA items: PASS — backend-owned; frontend only triggers via `POST /bookings` and polls outcome.

### DR-AV — AC Verification Feasibility

| Task | AC | Artifact Named? | Test Path Valid? | Harness Available? | Must-Fail Plausible? | Layer OK? |
|---|---|---|---|---|---|---|
| 1.1 | Types shape | ✅ | ✅ `.spec.ts` co-located | ✅ TS compile | ✅ | ✅ Unit |
| 1.2 | createBooking POST body | ✅ | ✅ `.spec.ts` co-located | ✅ MSW + RTK renderWithProviders | ✅ | ✅ Integration |
| 1.2 | getBookings params | ✅ | ✅ | ✅ | ✅ | ✅ Integration |
| 1.2 | getBookingById zero TTL | ✅ | ✅ | ✅ | ✅ | ✅ Integration |
| 1.2 | cancelBooking endpoint | ✅ | ✅ | ✅ | ✅ | ✅ Integration |
| 2.1 | setActiveBooking / clear / setPolling | ✅ | ✅ `.spec.ts` co-located | ✅ configureStore pure unit | ✅ | ✅ Unit |
| 2.2 | booking slice present at store | ✅ | ⚠️ | ✅ | ✅ | ✅ Unit |
| 3.1 | POST 201 PENDING | ✅ | ✅ | ✅ MSW | ✅ | ✅ |
| 3.2 | handlers index includes booking | ✅ | ✅ `handlers/index.spec.ts` | ✅ | ✅ | ✅ Unit |
| 4.1 | polls CONFIRMED | ✅ | ✅ | ✅ renderHook + fake timers | ✅ | ✅ Integration |
| 4.1 | stops FAILED | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4.1 | unmount cleanup | ✅ | ✅ | ✅ | ✅ | ✅ |
| 4.1 | createBooking 503 failure | ✅ | ✅ | ✅ MSW + fake timers | ✅ | ✅ |
| 4.1 | poll exhaustion | ✅ | ✅ | ✅ fake timers × 10 | ✅ | ✅ |
| 5.1 | renders offer | ✅ | ✅ | ✅ RTL + Redux provider | ✅ | ✅ |
| 5.1 | submit args | ✅ | ✅ | ✅ userEvent | ✅ | ✅ |
| 5.1 | missing payment method | ✅ | ✅ | ✅ RTL + RHF | ✅ | ✅ |
| 5.2 | renders rows / empty state | ✅ | ✅ | ✅ RTL + MSW | ✅ | ✅ |
| 5.3 | itinerary / cancel button | ✅ | ✅ | ✅ RTL + MSW | ✅ | ✅ |
| 6.1 | redirect / confirm / FAILED | ✅ | ✅ | ✅ MemoryRouter | ✅ | ✅ |
| 6.2 | shows reference / CTA | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6.3 | heading | ✅ | ✅ | ✅ | ✅ | ✅ |
| 6.4 | passes bookingId | ✅ | ✅ | ✅ | ✅ | ✅ |
| 7.1 | four routes resolve | ✅ | ⚠️ | ✅ MemoryRouter | ✅ | ✅ |
| 8.1 | barrel exports | ✅ | ✅ | ✅ | ✅ | ✅ |
| 9.1 | Pact file written | ✅ | ✅ `__tests__/contracts/` | ✅ Pact V3 (established) | ✅ | ✅ Contract |

**Notes on ⚠️ rows:**
- **Task 2.2** (`rootReducer.spec.ts`): Artifact path assumes `src/app/rootReducer.spec.ts` exists. This file was likely created in SM-FE-02 when `authReducer` was registered. If it doesn't exist, the agent must CREATE it, not just "add assertion". The task description says "add assertion for booking slice initial state" without clarifying create vs. update — minor ambiguity. Low risk since the pattern is clear.
- **Task 7.1** (`AppRoutes.spec.tsx`): Task says "add four route resolution tests (or update existing file)" — "or update" is appropriate since this file exists from SM-FE-03. File path is clear.

### DR-AF — Agent-Friendliness Assessment

| Task | Self-Contained? | File Paths? | Names Explicit? | Criteria Concrete? |
|---|---|---|---|---|
| 1.1 | ✅ | ✅ `src/features/booking/booking.types.ts` | ✅ All type names listed | ✅ |
| 1.2 | ✅ | ✅ `src/features/booking/bookingApi.ts` | ✅ Endpoint names + HTTP methods + TTLs | ✅ |
| 2.1 | ✅ | ✅ `src/features/booking/bookingSlice.ts` | ✅ All actions + selectors named | ✅ |
| 2.2 | ✅ | ✅ `src/app/rootReducer.ts` | ✅ `booking: bookingReducer` explicit | ✅ |
| 3.1 | ✅ | ✅ `src/mocks/handlers/booking.handlers.ts` | ✅ All 4 handlers with status codes | ✅ |
| 3.2 | ⚠️ | ✅ `src/mocks/handlers/index.ts` | ✅ | ✅ | Missing: does not say "add import `bookingHandlers` from `./booking.handlers`" |
| 4.1 | ✅ | ✅ `src/features/booking/hooks/useBooking.ts` | ✅ polling params explicit (base 1s, ×2, max 10, cap 30s) | ✅ |
| 5.1 | ✅ | ✅ `src/features/booking/components/BookingForm.tsx` | ✅ Radio options listed, submit callback named | ✅ |
| 5.2 | ✅ | ✅ `src/features/booking/components/BookingList.tsx` | ✅ Columns, pagination, StatusBadge specified | ✅ |
| 5.3 | ✅ | ✅ `src/features/booking/components/BookingDetails.tsx` | ✅ Cancel condition explicit | ✅ |
| 6.1 | ✅ | ✅ `src/features/booking/pages/BookingPage.tsx` | ✅ CONFIRMED/FAILED/null-offer cases all explicit | ✅ |
| 6.2 | ✅ | ✅ `src/features/booking/pages/BookingConfirmationPage.tsx` | ✅ `clearActiveBooking` on mount specified | ✅ |
| 6.3 | ✅ | ✅ `src/features/booking/pages/BookingListPage.tsx` | ✅ | ✅ |
| 6.4 | ✅ | ✅ `src/features/booking/pages/BookingDetailsPage.tsx` | ✅ | ✅ |
| 7.1 | ⚠️ | ⚠️ Only `AppRoutes.tsx` mentioned | ✅ Route paths listed | ✅ | **`routes.config.ts` not mentioned** — agent must infer this from codebase context |
| 8.1 | ✅ | ✅ `src/features/booking/index.ts` | ✅ All export symbols listed | ✅ |
| 9.1 | ✅ | ✅ `src/features/booking/__tests__/contracts/bookingApi.contract.spec.ts` | ✅ Pact V3 + MSW lifecycle explicitly stated | ✅ |

#### Issues

1. **Task 3.2**: Does not specify the `import { bookingHandlers } from './booking.handlers'` line that must be added to `handlers/index.ts`. An agent might miss the import and only add the spread.

2. **Task 7.1 (DR-AF-06 WARNING)**: Missing `src/routes/routes.config.ts` — the existing codebase uses a `ROUTES` constant map (confirmed from `AppRoutes.tsx`). If the task only instructs adding path strings inline to `AppRoutes.tsx`, the agent will use magic strings, violating the project convention. Task should explicitly say: "Also add `BOOKINGS_NEW`, `BOOKING_CONFIRMATION`, `BOOKINGS_LIST`, `BOOKING_DETAIL` to `src/routes/routes.config.ts`."

---

## Feasibility Assessment

| Design Element | Feasible? | Notes |
|---|---|---|
| RTK Query `injectEndpoints` for bookingApi | ✅ | Established pattern; `baseApi` singleton already exists |
| Redux slice with `createSlice` | ✅ | `searchSlice.ts` provides exact template |
| Manual polling hook via `useEffect`/`setTimeout` | ✅ | React 18 + TypeScript 5.x; AbortController-style cleanup is standard |
| Exponential back-off in hook | ✅ | Pure JS; no library needed |
| `keepUnusedDataFor: 0` for polling endpoint | ✅ | RTK Query built-in config |
| Tag invalidation on mutation | ✅ | RTK Query tagTypes / providesTags / invalidatesTags |
| MSW handler file per domain | ✅ | Established `booking.handlers.ts` pattern |
| Pact V3 consumer contract test | ✅ | SM-FE-03 established this harness; `server.close()/listen()` lifecycle in place |
| `RHF + Zod` for payment method radio group validation | ✅ | Already used in `SearchForm.tsx` |
| `MemoryRouter` + `renderHook` for page / hook tests | ✅ | Established in SM-FE-02/03 test suite |

### Blockers
None.

---

## Task Completeness

### Missing Tasks

| Implied Action | Where in design.md | Suggested Task |
|---|---|---|
| Extend `baseQueryWithReauth.ts` logging predicate to include `/bookings` paths | Observability section: "Logged paths: /flights/search, ..., /bookings, /bookings/:id, /bookings/:id/cancel" | Add task **1.3**: "Update `src/api/baseQueryWithReauth.ts` — extend the error-logging predicate to include `/api/bookings*` path patterns; verify structured log emitted for 4xx/5xx responses to booking endpoints" |
| Update `routes.config.ts` with four new route constants | Implied by existing `ROUTES` constant usage in `AppRoutes.tsx` | Merge into task 7.1: "Also add `BOOKINGS_NEW`, `BOOKING_CONFIRMATION`, `BOOKINGS_LIST`, `BOOKING_DETAIL` keys to `src/routes/routes.config.ts`" |
| Register Pact consumer contract in `openspec/CONTRACTS.md` | design.md implicitly (AR suggestion AR-CTR-04 in architect review) | Add task **9.2**: "Update `openspec/CONTRACTS.md` — add entry for `frontend ↔ booking-service` Pact V3 consumer contract produced by task 9.1" |

### Redundant Tasks
None.

---

## Task Ordering Issues

| Issue | Current Order | Correct Order |
|---|---|---|
| Proposed task 1.3 (logging predicate) | N/A — task doesn't exist yet | Should be added after 1.2 (bookingApi) and before 5.x (component tests that trigger booking endpoints) |
| Proposed task 9.2 (CONTRACTS.md) | N/A — task doesn't exist yet | Should follow 9.1 (after pact file is written) |

---

## Codebase Consistency

| Area | Consistent? | Notes |
|---|---|---|
| Naming conventions | ✅ PASS | All file/function/selector names follow existing conventions |
| Error handling | ✅ PASS | RTK Query error object + `Alert` component; matches `useFlightSearch` pattern |
| Library choices | ✅ PASS | RTK Query, RHF+Zod, MSW, Pact V3, RTL — all established |
| Test structure | ✅ PASS | Co-located `.spec.ts/.spec.tsx`; `__tests__/contracts/` for Pact |
| RTK Query injection | ✅ PASS | `baseApi.injectEndpoints()` |
| Route constants | ⚠️ WARN | Task 7.1 missing `routes.config.ts` update |
| Structured logging | ⚠️ WARN | No task for extending `baseQueryWithReauth.ts` |
| CONTRACTS.md | ⚠️ WARN | No task for registering Pact contract |

---

## Pattern Implementation Correctness

See checklist results above. All applied patterns (Cache-aside, Retries) are implemented correctly. No new pattern implementation defects found.

---

## Complexity Assessment

The design is appropriately complex for the requirement. The decision to use a manual `useEffect`/`setTimeout` polling loop instead of RTK Query `pollingInterval` is justified by the exponential back-off requirement — using `pollingInterval` would require significant workaround code to achieve the same result. The hook-encapsulated design keeps `BookingPage` simple. No over-engineering found.

The one area that merits mention: `useBooking` combines API mutation, polling, and Redux dispatch. This is the right level of abstraction for this use case — it mirrors `useFlightSearch`'s similar composition of debounce + lazy-query + state. No simpler alternative achieves the same result cleanly.

---

## Summary

SM-FE-04 is implementable. The design maps cleanly onto the existing codebase patterns from SM-FE-01 through SM-FE-03. All 29 tasks have named verification artifacts with plausible Must-fail-if notes, all test file paths follow the project's co-location convention, and the Pact contract harness is already established. Technical feasibility is fully confirmed.

Three WARNING gaps must be addressed before implementation begins: (1) Task 7.1 must also update `routes.config.ts` with the four new route constants — without this, an agent will write magic strings into `AppRoutes.tsx` violating the established convention; (2) A new task 1.3 should be added to extend `baseQueryWithReauth.ts` logging to cover `/bookings` paths, as explicitly specified in the design's Observability section but absent from tasks.md; (3) A new task 9.2 should register the Pact contract in `openspec/CONTRACTS.md` per the architect review recommendation.

An AI agent can execute tasks 1.1 through 9.1 top-to-bottom with high confidence after the three additions are made.

---

## Required Fixes

1. **[DR-TC-11 / DR-CB — WARNING]**: Add task **1.3** to tasks.md: "Update `src/api/baseQueryWithReauth.ts` — extend the error-logging predicate to include `/api/bookings`, `/api/bookings/:id`, and `/api/bookings/:id/cancel` paths; AC: WHEN a booking endpoint returns 4xx or 5xx, THEN a structured log event SHALL be emitted with `level: 'error'`, `endpoint`, `status`, and `correlationId` fields; Artifact: `src/api/baseQueryWithReauth.spec.ts` — add test case 'baseQueryWithReauth — logs structured error for /bookings 4xx response'; Must fail if: logging predicate excludes /bookings paths."

2. **[DR-AF-06 / DR-CB — WARNING]**: Update task **7.1** in tasks.md to also specify: "Add four new route constants to `src/routes/routes.config.ts`: `BOOKINGS_NEW = '/bookings/new'`, `BOOKING_CONFIRMATION = '/bookings/:id/confirmation'`, `BOOKINGS_LIST = '/bookings'`, `BOOKING_DETAIL = '/bookings/:id'`; use these constants in `AppRoutes.tsx`."

3. **[DR-TC-13 — WARNING]**: Add task **9.2** to tasks.md: "Update `openspec/CONTRACTS.md` — add entry for the `frontend ↔ booking-service` Pact V3 consumer contract; AC: CONTRACTS.md contains an entry referencing `pacts/frontend-booking-service.json`."

---

## Suggestions (non-blocking)

- Task 3.2 should explicitly mention adding the import line `import { bookingHandlers } from './booking.handlers'` to `handlers/index.ts` — the current description only mentions spreading the handlers, not importing them.
- Consider adding a `makeStore()` call note to the hook tests (task 4.1) explicitly, since the `useBooking` hook dispatch-tests require a Redux Provider — agent may need to use `renderHook` wrapped in a `makeStore`-based provider.
- The `rootReducer.spec.ts` target for task 2.2 may need to be created rather than updated; clarify "create or update" in the task description.

> All four reviewer reports are now ready. Hand them all to `review-synthesizer` to produce the final council verdict.
