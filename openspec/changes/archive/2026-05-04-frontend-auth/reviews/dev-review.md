# Developer Review Report: frontend-auth

**Reviewer Role**: Senior Developer  
**Verdict**: PASS WITH WARNINGS  
**Sub-Module**: [SM-FE-02] Authentication Feature  
**Date**: 2026-05-04  
**Checklist version**: dev-review-checklist v1.0

---

## Checklist Results Summary

| Section | ID | Severity | Status | Notes |
|---|---|---|---|---|
| DR-FE | DR-FE-01 | BLOCKER | **FAIL** | `@hookform/resolvers` missing from `package.json` — needed by T08 `zodResolver` |
| DR-FE | DR-FE-02 | BLOCKER | PASS | No new infra components required |
| DR-FE | DR-FE-03 | BLOCKER | PASS | No new env vars required |
| DR-FE | DR-FE-04 | BLOCKER | PASS | RTK Query v2, React 18, TypeScript 5 — all consistent |
| DR-FE | DR-FE-05 | WARNING | PASS | All referenced libraries are well-maintained, no known CVEs |
| DR-TC | DR-TC-01 | BLOCKER | PASS | No DB changes — frontend only |
| DR-TC | DR-TC-02 | BLOCKER | PASS | No new env vars |
| DR-TC | DR-TC-03 | BLOCKER | PASS | T04 handles DI (rootReducer registration); T06 updates `baseApi.ts` |
| DR-TC | DR-TC-04 | BLOCKER | PASS | No new infrastructure resources |
| DR-TC | DR-TC-09 | BLOCKER | **WARN** | T11 (MSW handlers) has no AC paired — acceptable since it is an enabler task, not functional; all functional tasks have verification artifacts |
| DR-TC | DR-TC-10 | WARNING | PASS | No public API interface changes — frontend internal only |
| DR-TC | DR-TC-11 | WARNING | PASS | Observability instrumentation is part of T05/T06 per spec REQ-AUTH-08 |
| DR-TO | DR-TO-01 | BLOCKER | PASS | No migrations |
| DR-TO | DR-TO-02 | BLOCKER | PASS | T01 (types) precedes all consuming tasks |
| DR-TO | DR-TO-03 | BLOCKER | PASS | No infra provisioning needed |
| DR-TO | DR-TO-04 | BLOCKER | **WARN** | T06 updates `baseApi.ts` but T04 wires `authReducer` — T06 calls `(api.getState() as RootState).auth.accessToken`, which requires T04 to be complete. Dependency T04→T06 is stated but the ordering in the wave diagram places T05 and T06 in the same Wave 3 without an explicit T04-must-precede-T06 note inside T06 itself. |
| DR-TO | DR-TO-05 | BLOCKER | PASS | Integration tests follow implementations |
| DR-CB | DR-CB-01 | BLOCKER | PASS | File/directory names match existing conventions (camelCase files, `__tests__` directories, `.spec.ts(x)` suffix) |
| DR-CB | DR-CB-02 | BLOCKER | PASS | Naming follows existing codebase (camelCase functions, PascalCase components) |
| DR-CB | DR-CB-03 | BLOCKER | **WARN** | T11 adopts a new `src/mocks/handlers/` sub-directory approach, but the existing MSW setup uses a flat `src/mocks/handlers.ts` file (not a directory). This structural divergence will require updating `src/mocks/server.ts` — no task covers this update. |
| DR-CB | DR-CB-04 | BLOCKER | PASS | Test file convention matches: `__tests__/*.spec.ts(x)` co-located with source, `describe/it` style |
| DR-CB | DR-CB-07 | WARNING | PASS | `baseQueryWithReauth` wraps `baseQueryWithRetry` — consistent library approach |
| DR-CB | DR-CB-08 | WARNING | PASS | Log structure references existing `logger.ts` from SM-FE-01 |
| DR-PI | Cache Invalidation | — | PASS | `baseApi.util.resetApiState()` on logout — correct RTK Query API; synchronous; no key stability concern |
| DR-AV | DR-AV-01 | BLOCKER | **WARN** | `src/common/hooks/__tests__/useAuth.spec.ts` — the `__tests__` sub-directory does not exist yet under `src/common/hooks/`; however, the existing codebase has `useDebounce.spec.ts` co-located flat in `src/common/hooks/` (not in `__tests__/`). The path in tasks.md diverges from the existing convention for this directory. |
| DR-AV | DR-AV-02 | BLOCKER | PASS | All test harnesses (Vitest, @testing-library/react, MSW v2, renderHook) are present |
| DR-AV | DR-AV-03 | BLOCKER | PASS | All "Must fail if" notes are technically plausible |
| DR-AV | DR-AV-04 | BLOCKER | **WARN** | REQ-AUTH-04-S04 (mutex/concurrency test) requires deterministic concurrent execution. No fake-timer or controlled-concurrency helper is specified. Real `Promise` racing in JSDOM/Vitest is non-deterministic without explicit control — the "Must fail if" note does not explain the concurrency control mechanism. |
| DR-AV | DR-AV-07 | WARNING | **WARN** | REQ-AUTH-04-S04 concurrency AC relies on timing/ordering with no fake-clock or ordered-resolution helper identified in tasks.md |
| DR-AF | DR-AF-01 | BLOCKER | PASS | All tasks list exact file paths |
| DR-AF | DR-AF-02 | BLOCKER | PASS | Specific function/component names specified in every task |
| DR-AF | DR-AF-03 | BLOCKER | **WARN** | T06 says "Implement the wrapper as described in REQ-AUTH-04 and `design.md`" without fully inlining the mutex implementation detail. The design.md describes a `Promise` flag approach but T06 also gives the module-level variable pattern — partially self-contained but could be clearer. |
| DR-AF | DR-AF-07 | WARNING | **FAIL** | `@hookform/resolvers` not in `package.json` and no install task exists in `tasks.md` |
| DR-CX | DR-CX-01 | WARNING | PASS | No premature abstraction identified |
| DR-CX | DR-CX-02 | WARNING | PASS | Pattern complexity (mutex, reauth) is proportionate to the concurrent-refresh risk |
| DR-CX | DR-CX-03 | WARNING | PASS | Correct patterns applied; no under-engineering |
| DR-DX | DR-DX-03 | WARNING | PASS | Timeout/retry constants from SM-FE-01 are already in config objects |

---

## Feasibility Assessment

| Design Element | Feasible? | Notes |
|---|---|---|
| RTK Query v2 (`createApi`, `injectEndpoints`) | Yes | `@reduxjs/toolkit ^2.11.2` in `package.json` |
| `react-hook-form` v7 | Yes | `react-hook-form ^7.75.0` in `package.json` |
| `zod` v3 | Yes | `zod ^3.25.76` in `package.json` |
| `@hookform/resolvers` (`zodResolver`) | **No** | **NOT in `package.json`**. `LoginForm.tsx` (T08) uses `zodResolver` from `@hookform/resolvers/zod` but the package is absent. |
| MSW v2 handlers (`http.post`, `HttpResponse`) | Yes | `msw ^2.14.2` in devDependencies |
| `renderHook` from `@testing-library/react` | Yes | `@testing-library/react ^14.3.1` — includes `renderHook` |
| `atob` for JWT decode in JSDOM | Yes | JSDOM 24 includes `atob`/`btoa` |
| `baseQueryWithRetry` as wrappable function | Yes | Exported as `const baseQueryWithRetry: BaseQueryFn` |
| `RootState` type for casting in `baseQueryWithReauth` | Yes | `rootReducer.ts` exports `RootState` |
| `notificationSlice` / `addNotification` | Yes | Present in `src/features/notifications/notificationSlice.ts` |
| `LoadingButton` component | Yes | Exported from `src/common/components/index.ts` |
| `FormField`, `TextInput` | Yes | Exported from `src/common/components/index.ts` |
| `AppRoutes.tsx` placeholder `LoginPage` | Yes | Inline stub at line 7-9 — replaceable by T09/T12 |
| `PrivateRoute` cast for `state.auth` | Yes | Already has forward-compatible cast at line 12 |

### Blockers

**B1 — Missing `@hookform/resolvers` dependency (DR-FE-01 / DR-AF-07)**  
`zodResolver` is imported by `LoginForm.tsx` (T08) from `@hookform/resolvers/zod`, but this package does not exist in `package.json`. Without an install task, T08 will fail at `npm install` / compile time.

---

## Task Completeness

### Missing Tasks

| Implied Action | Where in design.md | Suggested Task |
|---|---|---|
| Install `@hookform/resolvers` | design.md "Dependencies" → T08 uses `zodResolver` | New **T00 (or insert before T08)**: `npm install @hookform/resolvers` — add `"@hookform/resolvers": "^3.x"` to `package.json` dependencies |
| Update `src/mocks/server.ts` to import from `handlers/index.ts` | T11 creates `src/mocks/handlers/auth.handlers.ts` + `handlers/index.ts` but `server.ts` still imports from `./handlers` (flat file) | T11 must also update `src/mocks/server.ts` to `import { handlers } from './handlers/index'` — or the new handlers will never be registered |
| Observability task is distributed across T05/T06 with no dedicated task | design.md Observability section — `logger.ts` / `metrics.ts` calls needed in `authApi.ts` and `baseQueryWithReauth.ts` | Acceptable as embedded in T05/T06, but the observability instrumentation should be called out explicitly in those tasks' ACs to be verifiable |

### Redundant Tasks

None identified.

---

## Task Ordering Issues

| Issue | Current Order | Correct Order |
|---|---|---|
| T06 reads `(api.getState() as RootState).auth.accessToken` — requires T04 (auth reducer registered) to be complete, but this prerequisite is listed in the dependency graph and not explicitly restated in T06's description | Wave 3: T05, T06 listed together without restating T04 prerequisite inside T06 | T06 should note "Requires T04 complete" in its prerequisites field. Low risk since dependency graph is correct — flagged as WARNING only. |

---

## Codebase Consistency

| Area | Consistent? | Notes |
|---|---|---|
| Naming conventions | Yes | `camelCase` files, `PascalCase` components, `__tests__/` directory — all match |
| Error handling | Yes | `addNotification` dispatch for UI errors matches existing `notificationSlice` pattern |
| Library choices | **Partial** | `@hookform/resolvers` is a new package not yet installed. `react-hook-form` + `zod` combo is consistent with the spec intent. |
| Test structure | **Partial** | `src/features/auth/__tests__/` follows the `__tests__/` convention used elsewhere. However, `src/common/hooks/__tests__/useAuth.spec.ts` diverges from the existing flat co-location pattern in `src/common/hooks/` (e.g., `useDebounce.spec.ts` is flat, not in `__tests__/`). |
| MSW handler structure | **No** | T11 creates a `handlers/` sub-directory but the codebase uses a flat `src/mocks/handlers.ts`. `server.ts` imports `{ handlers } from './handlers'` (resolves to the flat file) and will not automatically pick up the new directory. A corresponding `server.ts` update is missing. |
| Redux selector naming | Yes | `selectAccessToken`, `selectUser` etc. match the `select*` prefix convention |

---

## Pattern Implementation Correctness

### Cache Invalidation (Applied)

| Item | Status | Notes |
|---|---|---|
| `baseApi.util.resetApiState()` called synchronously on logout | PASS | Design specifies same synchronous tick; T03 implements via `logoutAction` thunk |
| Reset happens before `PrivateRoute` redirect | PASS | Redux middleware ordering ensures state is updated before React re-renders |
| Test verifies cache is actually evicted (not just that the action was dispatched) | WARN | T03's test spies on `baseApi.util.resetApiState` — this verifies dispatch, not actual cache eviction. Acceptable for unit level; integration-level verification is not required here. |

### Token Refresh Mutex (Implicit sub-pattern under Retries/Reauth)

| Item | Status | Notes |
|---|---|---|
| Mutex prevents concurrent refresh storms | PASS (design intent) | Design specifies module-level `Promise` flag; T06 specifies the exact variable pattern |
| Mutex released on both success and failure paths | PASS | T06 explicitly states "release the mutex before retrying" and "release the mutex and dispatch logout()" |
| Second concurrent 401 waits for mutex then retries with new token | PASS | Design describes waiters then retry with already-refreshed token |
| Mutex is module-level singleton (not per-request) | PASS | T06 says `let mutex: Promise<boolean> | null = null` at module scope |
| Concurrency test is deterministic | **WARN** | REQ-AUTH-04-S04 test involves concurrent Promises — the task does not specify how to control resolution order in tests. Risk of flaky test without a controlled Promise resolution helper. |

---

## Agent-Friendliness Assessment

| Task | Self-Contained? | File Paths? | Names Explicit? | Criteria Concrete? |
|---|---|---|---|---|
| T01 | Yes | Yes | Yes | Yes |
| T02 | Yes | Yes | Yes | Yes — fixture generation method provided |
| T03 | Yes | Yes | Yes | Yes — spy approach described |
| T04 | Yes | Yes | Yes | Yes |
| T05 | Yes | Yes | Yes | Yes — exact mutation signatures given |
| T06 | Partial | Yes | Yes | Partial — mutex implementation refers to design.md for the Promise pattern |
| T07 | Yes | Yes | Yes | Yes |
| T08 | Yes | Yes | Yes | Yes — Zod schema inline |
| T09 | Yes | Yes | Yes | Yes |
| T10 | Yes | Yes | Yes | Yes — ROLE_RANK lookup table provided |
| T11 | **Partial** | Yes | Yes | Partial — does not mention updating `src/mocks/server.ts` |
| T12 | Yes | Yes | Yes | Yes — exact import replacement shown |

### Issues

1. **T06** — The mutex implementation says "or equivalent boolean flag + Promise resolve pattern" which leaves the exact implementation open. An agent may produce a broken mutex if it chooses the wrong pattern. Recommend inlining one canonical implementation in T06 and removing the "or equivalent" option.

2. **T11** — Does not instruct updating `src/mocks/server.ts` from `import { handlers } from './handlers'` (flat file) to the new `handlers/index.ts` file. An agent executing T11 exactly as written will create the new files but the MSW server will still load the old empty handlers array, causing all auth-related MSW tests (T05–T09) to fail silently.

---

## AC Verification Feasibility

| Task | AC | Artifact Named? | Test Path Valid? | Harness Available? | Must-Fail Plausible? | Layer OK? |
|---|---|---|---|---|---|---|
| T02 | REQ-AUTH-02-S01/S02/S03 | Yes | `src/features/auth/__tests__/jwt.utils.spec.ts` ✓ | Yes — pure Vitest unit | Yes | Yes |
| T03 | REQ-AUTH-01-S01/S02 | Yes | `src/features/auth/__tests__/authSlice.spec.ts` ✓ | Yes — Redux store unit | Yes | Yes |
| T03 | REQ-AUTH-01-S03 | Yes | Same file, spy on `baseApi.util.resetApiState` | Yes | Yes — spy would not be called if logout reducer didn't trigger the thunk | Yes |
| T05 | REQ-AUTH-03-S01/S02 | Yes | `src/features/auth/__tests__/authApi.spec.ts` ✓ | Yes — MSW v2 + RTK Query test store | Yes | Yes |
| T05 | REQ-AUTH-08-S01 | Yes | Same file, logger spy | Yes | Yes | Yes |
| T06 | REQ-AUTH-04-S01/S02/S03 | Yes | `src/api/__tests__/baseQueryWithReauth.spec.ts` ✓ | Yes — matches existing `src/api/__tests__/` convention | Yes | Yes |
| T06 | REQ-AUTH-04-S04 | Yes | Same file | **Partial** | **Partial** — concurrent `Promise` behaviour in JSDOM is non-deterministic without controlled resolution; the AC may pass spuriously or fail flakily | **Warn** |
| T07 | REQ-AUTH-05-S01/S02 | Yes | `src/common/hooks/__tests__/useAuth.spec.ts` | **Warn** — existing convention in `src/common/hooks/` is flat co-location (e.g., `useDebounce.spec.ts`), not `__tests__/` sub-dir | Yes | Yes |
| T08 | REQ-AUTH-06-S01/S02/S04 | Yes | `src/features/auth/__tests__/LoginForm.spec.tsx` ✓ | Yes | Yes | Yes |
| T09 | REQ-AUTH-06-S03 | Yes | `src/features/auth/__tests__/LoginPage.spec.tsx` ✓ | Yes | Yes | Yes |
| T10 | REQ-AUTH-07-S01/S02 | Yes | `src/features/auth/__tests__/RoleGuard.spec.tsx` ✓ | Yes | Yes | Yes |

### Blockers

- **T06 / REQ-AUTH-04-S04**: The mutex concurrency test (`POST /api/v1/auth/refresh` called exactly once when two concurrent 401s fire) is not reliably implementable without a deterministic concurrent-Promise helper. The task must either:
  - Specify use of `vi.useFakeTimers()` + controlled `Promise` resolution (e.g., deferred resolvers), **or**
  - Downgrade this to a WARNING-level scenario and implement it as a best-effort integration test with retries.
  
  Without this, the AC verification artifact risks being either a vacuous test (always passes) or a flaky test (non-deterministic). **Classified as BLOCKER per DR-AV-07 (timing/concurrency without deterministic helpers).**

- **T11 / MSW server import**: `server.ts` imports from `'./handlers'` (resolves to the flat `handlers.ts` file). T11 creates a `handlers/` directory with `index.ts` but does not update `server.ts`. All MSW-dependent tests (T05, T06, T07, T08, T09) will silently use an empty handler array, causing false-passing tests (no 401 intercept means no auth header check, etc.). **This is a BLOCKER — all AC verification artifacts for REQ-AUTH-03 through REQ-AUTH-06 depend on MSW functioning correctly.**

---

## Complexity Assessment

The design's complexity is well-proportionate to the requirements. The mutex pattern for concurrent token refresh is the correct and industry-standard solution for this exact problem; simpler alternatives (no mutex) would cause the "already rotated" bug described in `design.md`. The `logoutAction` thunk approach for co-dispatching `logout()` + `resetApiState()` is idiomatic Redux Toolkit and not over-engineered. The `RoleGuard` component with a `ROLE_RANK` lookup table is clean and extensible. No over-engineering is identified. The decision to keep `useAuth` as a thin wrapper over RTK Query (rather than a custom fetch layer) is consistent with the project's RTK Query-first philosophy.

---

## Summary

The change is well-structured and largely implementable, with two critical blockers that must be resolved before implementation begins. **Blocker 1**: `@hookform/resolvers` is missing from `package.json` — T08's `zodResolver` call will fail to compile without an explicit install task added to `tasks.md`. **Blocker 2**: T11 creates a new `src/mocks/handlers/` sub-directory structure but does not update `src/mocks/server.ts`, which still imports the old flat `handlers.ts` file; all MSW-dependent auth tests (T05–T09) will silently receive no HTTP interception, producing false-passing or incorrect test results. Additionally, the mutex concurrency AC (REQ-AUTH-04-S04) lacks a deterministic test strategy for controlled Promise resolution, making the verification artifact unreliable. Two naming-consistency warnings also exist: `src/common/hooks/__tests__/useAuth.spec.ts` should be flat `src/common/hooks/useAuth.spec.ts` to match the `useDebounce.spec.ts` convention, and T06 should inline the canonical mutex implementation rather than offering "or equivalent" options. With these fixes applied, an agent can execute `tasks.md` top-to-bottom with high confidence.

---

## Required Fixes

1. **[BLOCKER] Add `@hookform/resolvers` install task** — Insert a new task (before T08) that adds `@hookform/resolvers ^3.x` to `package.json` `dependencies` and runs `npm install`. File: `tasks.md`.

2. **[BLOCKER] T11 must update `src/mocks/server.ts`** — Add an explicit step to T11: update `src/mocks/server.ts` to replace `import { handlers } from './handlers'` with `import { handlers } from './handlers/index'` (or restructure by having `handlers/index.ts` re-export a combined array, which is the cleaner approach). Alternatively, keep the flat `handlers.ts` and have `auth.handlers.ts` re-export into it.

3. **[BLOCKER] REQ-AUTH-04-S04 concurrency test strategy** — T06's test description for the mutex scenario must specify how concurrent Promises are controlled (e.g., using deferred `Promise` resolvers: `let resolve; const p = new Promise(r => { resolve = r; }); vi.spyOn(globalThis, 'fetch').mockImplementationOnce(() => p)` pattern). Without this, the test is unreliable.

4. **[WARNING] Fix `useAuth.spec.ts` test path** — Change `src/common/hooks/__tests__/useAuth.spec.ts` to `src/common/hooks/useAuth.spec.ts` in T07 to match the flat co-location convention already established in `src/common/hooks/`.

5. **[WARNING] T06 mutex implementation — remove ambiguity** — Replace "or equivalent boolean flag + Promise resolve pattern" with a single canonical implementation snippet so an agent does not choose an incorrect variant.

6. **[WARNING] T04 prerequisite note in T06** — Add `> Requires T04 complete` as an explicit prerequisite note inside T06's task description (the dependency graph already shows this, but the task body itself does not mention it, which risks out-of-order execution by an agent).

---

## Suggestions (non-blocking)

- Consider keeping the flat `src/mocks/handlers.ts` as the registration point and appending auth handlers there (in T11), rather than restructuring to a `handlers/` directory. This avoids the `server.ts` update and is simpler.
- T03's `logoutAction` thunk approach (dispatching both `logout()` and `resetApiState()`) could alternatively use RTK's `listenerMiddleware` for a more declarative pattern — noted as a potential refactor for v2.
- The `useAuth.ts` hook path (`src/common/hooks/`) is correct (not inside `src/features/auth/`), which is good — it signals that `useAuth` is a cross-cutting hook. Consider exporting it from `src/common/hooks/index.ts` (if one exists) rather than from the auth barrel only.
