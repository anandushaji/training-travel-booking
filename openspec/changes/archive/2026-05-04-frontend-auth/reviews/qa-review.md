# QA Review Report: Authentication Feature (SM-FE-02)

**Change ID**: frontend-auth  
**Reviewer role**: QA Engineer (Step 3 of 4 — Reviewer Council)  
**Date**: 2026-05-04  
**Spec version reviewed**: `specs/frontend-auth/spec.md` (Status: Proposed)  
**Predecessor reviews**: BA Review (Step 1), Architect Review (Step 2) — assumed complete  

---

## Verdict

> **PASS WITH WARNINGS**

All 8 requirements have at least one happy-path scenario. All ACs name an executable verification artifact with a specific test file path. No requirement is entirely without failure coverage. However, five gaps — three of which are **P1 blockers** — must be resolved before the change is approved for implementation.

---

## Summary Scorecard

| Requirement | Happy path | Failure paths | AC → artifact | Verdict |
|---|---|---|---|---|
| REQ-AUTH-01 authSlice | S01 ✓ | S02 (logout) ✓, S03 (cache reset) ✓ | ✓ | PASS |
| REQ-AUTH-02 jwt.utils | S01 ✓ | S02 (expired) ✓, S03 (malformed) ✓ | ✓ | PASS |
| REQ-AUTH-03 authApi | S01 ✓ | S02 (401) ✓ | ✓ | PASS WITH WARNINGS |
| REQ-AUTH-04 baseQueryWithReauth | S01 ✓ | S02 (refresh+retry) ✓, S03 (failed refresh→logout) ✓, S04 (mutex) ✓ | ✓ | **FAIL — missing scenarios** |
| REQ-AUTH-05 useAuth | S01 ✓ | S02 (401) ✓ | ✓ | PASS WITH WARNINGS |
| REQ-AUTH-06 LoginForm | S03 (success+nav) ✓ | S01 (bad email) ✓, S02 (short pwd) ✓, S04 (toast) ✓ | ✓ | PASS WITH WARNINGS |
| REQ-AUTH-07 RoleGuard | S01 (ADMIN sees MANAGER) ✓ | S02 (EMPLOYEE blocked) ✓ | ✓ | PASS WITH WARNINGS |
| REQ-AUTH-08 Observability | S01 (no credentials) ✓ | — | ✓ | PASS WITH WARNINGS |

---

## Detailed Findings

---

### F-01 [P1 — BLOCKER] REQ-AUTH-04: Missing scenario — null refresh token on 401

**Requirement**: REQ-AUTH-04 (baseQueryWithReauth)  
**Gap type**: Failure path — precondition not met  

The design states (design.md line 157): *"refresh = await fetch POST /auth/refresh with stored refreshToken"*. However, `state.auth.refreshToken` can legitimately be `null` — for example, if a page loads with a stale in-memory token after an abnormal navigation. No scenario covers what happens when the 401 fires and `refreshToken === null`.

**Expected behaviour** (inferred from design): when `refreshToken` is null, the wrapper MUST skip the refresh attempt and immediately dispatch `logout()` without making a network call to `/auth/refresh`.

**Missing scenario**:

```
SCENARIO REQ-AUTH-04-S05 — 401 with no refresh token dispatches logout immediately

GIVEN state.auth.accessToken === "expired-at"
  AND state.auth.refreshToken === null
  AND MSW returns 401 on GET /api/v1/bookings
WHEN the RTK Query bookings query fires
THEN POST /api/v1/auth/refresh is NOT called
  AND dispatch(logout()) is called
  AND the query result contains error.status === 401
```

**Verification artifact**: `src/api/__tests__/baseQueryWithReauth.spec.ts` — add test case `"401 with null refresh token dispatches logout without calling /auth/refresh"`

**Action**: Add REQ-AUTH-04-S05 to `spec.md` and a corresponding test case to T06 coverage list before implementation.

---

### F-02 [P1 — BLOCKER] REQ-AUTH-03 / REQ-AUTH-06: Missing scenario — network timeout during login

**Requirements**: REQ-AUTH-03, REQ-AUTH-06  
**Gap type**: Transient failure / boundary  

The design explicitly documents a `LOGIN_TIMEOUT` error path (design.md line 143: *"A timed-out login results in a FETCH_ERROR which LoginForm surfaces as a generic 'Network error — please try again' message"*). No scenario in spec.md exercises this path. The timeout is enforced by SM-FE-01's `baseQueryWithTimeout` (10 s), but no test verifies that `LoginForm` renders the correct generic toast on `FETCH_ERROR`.

**Missing scenario**:

```
SCENARIO REQ-AUTH-06-S05 — Network timeout during login shows generic error toast

GIVEN MSW delays POST /api/v1/auth/login response beyond REQUEST_TIMEOUT_MS (10 000 ms)
  AND vi.useFakeTimers() advances clock past the timeout
WHEN the user submits valid credentials
THEN state.notifications contains a notification with severity "error"
  AND the notification message matches /network error/i or /please try again/i
  AND state.auth.isAuthenticated === false
```

**Verification artifact**: `src/features/auth/__tests__/LoginForm.spec.tsx` — add test case `"shows generic error toast on network timeout"`

**Action**: Add REQ-AUTH-06-S05 to `spec.md` and coverage to T08.

---

### F-03 [P1 — BLOCKER] REQ-AUTH-05 / proposal OQ-01: Missing scenario — logout API failure is silently swallowed

**Requirements**: REQ-AUTH-05 (`logout` is fire-and-forget), proposal OQ-01 (decided: best-effort)  
**Gap type**: Failure path — permanent failure of non-critical path  

OQ-01 was decided: the logout API call is fire-and-forget; failure is non-blocking. The spec does not include a scenario that asserts this property. Without a test, an implementer who accidentally `await`s the `logoutApi` call and propagates the rejection would break the contract silently.

**Missing scenario**:

```
SCENARIO REQ-AUTH-05-S03 — Logout API failure does not block auth state clear

GIVEN state.auth.isAuthenticated === true
  AND MSW returns 500 on POST /api/v1/auth/logout
WHEN useAuth().logout() is called
THEN state.auth.accessToken === null
  AND state.auth.isAuthenticated === false
  AND no error is thrown or propagated to the caller
  AND state.notifications does NOT contain a new error notification (silent failure)
```

**Verification artifact**: `src/common/hooks/__tests__/useAuth.spec.ts` — add test case `"logout clears auth state even when logoutApi returns 500"`

**Action**: Add REQ-AUTH-05-S03 to `spec.md` and coverage to T07.

---

### F-04 [P2 — WARNING] REQ-AUTH-04-S03: Scenario does not cover refresh network error (vs. 401)

**Requirement**: REQ-AUTH-04-S03  
**Gap type**: Failure path variant — transient vs. permanent failure  

S03 covers `401` on `POST /auth/refresh` (token invalid/expired). The design also lists "Refresh network error" as a distinct error case (design.md line 202): *"Refresh network error → Dispatch logout → redirect"*. A `FETCH_ERROR` (network timeout or DNS failure) is structurally different from a 401 and may be handled by a different code path. A dedicated scenario would prevent regressions.

**Missing scenario**:

```
SCENARIO REQ-AUTH-04-S06 — Refresh network error dispatches logout

GIVEN state.auth.refreshToken === "valid-rt"
  AND MSW causes POST /api/v1/auth/refresh to throw a network error (no response)
WHEN the RTK Query bookings query fires and returns 401
THEN dispatch(logout()) is called
  AND state.auth.accessToken === null
```

**Verification artifact**: `src/api/__tests__/baseQueryWithReauth.spec.ts`

**Action**: Add REQ-AUTH-04-S06 to `spec.md` and a test case to T06. May be promoted to P1 if the implementation treats `FETCH_ERROR` and `{ status: 401 }` in separate branches.

---

### F-05 [P2 — WARNING] REQ-AUTH-07: Missing edge cases for RoleGuard

**Requirement**: REQ-AUTH-07  
**Gap type**: Boundary / precondition not met  

Two boundary cases are unspecified:

1. **Unauthenticated user** (`auth.user === null`): the implementation sketch in T10 handles this (`if (!user || ...) return null`), but no scenario asserts it. A test is needed to prevent an implementer removing the `!user` guard.
2. **Same-role access** (`MANAGER` accessing `MANAGER`-gated content): the hierarchy description implies equal rank is permitted, but no scenario confirms it.

**Missing scenarios**:

```
SCENARIO REQ-AUTH-07-S03 — Unauthenticated user sees nothing in RoleGuard

GIVEN state.auth.user === null
WHEN <RoleGuard requiredRole="EMPLOYEE"><div>secret</div></RoleGuard> is rendered
THEN the text "secret" is NOT present in the DOM

SCENARIO REQ-AUTH-07-S04 — Same-role user can see same-role-gated content

GIVEN state.auth.user.role === "MANAGER"
WHEN <RoleGuard requiredRole="MANAGER"><div>secret</div></RoleGuard> is rendered
THEN the text "secret" is visible in the DOM
```

**Verification artifact**: `src/features/auth/__tests__/RoleGuard.spec.tsx`

**Action**: Add REQ-AUTH-07-S03 and S04 to `spec.md` and coverage to T10. These are low-risk but the null-user case is a likely runtime crash vector.

---

### F-06 [P3 — ADVISORY] REQ-AUTH-08: Observability — only login success scenario; no failure-log scenario

**Requirement**: REQ-AUTH-08  
**Gap type**: Failure path coverage for observability  

Only REQ-AUTH-08-S01 (login success, no credentials in log) is specified. The design documents additional log events: login failure (401), refresh failure, forced logout. While these are not separate ACs, having at least one negative-case observability assertion (e.g., confirming a `warn` log is emitted on refresh failure, or that a failed login does NOT log the password) would improve confidence that the logger integration is complete.

**Advisory**: No new scenario is strictly required for PASS, but the team should consider adding:
- `REQ-AUTH-08-S02`: login failure (401) emits `info` log with `{ email }` and no `password` field.

**Verification artifact**: `src/features/auth/__tests__/authApi.spec.ts`

---

## AC Verification Policy Compliance

Each AC in spec.md names a specific test file. All artifacts are co-located test files (`*.spec.ts` / `*.spec.tsx`) that are executed as part of the Vitest suite (`npm test`). The following table confirms compliance per AC Verification Policy:

| Scenario | Test file | Test case named? | Auto-execute? | Fails on THEN violation? |
|---|---|---|---|---|
| REQ-AUTH-01-S01 | `authSlice.spec.ts` | Implicit (task T03 names it) | ✓ Vitest | ✓ |
| REQ-AUTH-01-S02 | `authSlice.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-01-S03 | `authSlice.spec.ts` | Spy on `resetApiState` | ✓ | ✓ |
| REQ-AUTH-02-S01 | `jwt.utils.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-02-S02 | `jwt.utils.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-02-S03 | `jwt.utils.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-03-S01 | `authApi.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-03-S02 | `authApi.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-04-S01 | `baseQueryWithReauth.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-04-S02 | `baseQueryWithReauth.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-04-S03 | `baseQueryWithReauth.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-04-S04 | `baseQueryWithReauth.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-05-S01 | `useAuth.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-05-S02 | `useAuth.spec.ts` | Implicit | ✓ | ✓ |
| REQ-AUTH-06-S01 | `LoginForm.spec.tsx` | Implicit | ✓ | ✓ |
| REQ-AUTH-06-S02 | `LoginForm.spec.tsx` | Implicit | ✓ | ✓ |
| REQ-AUTH-06-S03 | `LoginPage.spec.tsx` | Implicit | ✓ | ✓ |
| REQ-AUTH-06-S04 | `LoginForm.spec.tsx` | Implicit | ✓ | ✓ |
| REQ-AUTH-07-S01 | `RoleGuard.spec.tsx` | Implicit | ✓ | ✓ |
| REQ-AUTH-07-S02 | `RoleGuard.spec.tsx` | Implicit | ✓ | ✓ |
| REQ-AUTH-08-S01 | `authApi.spec.ts` | Spy on logger | ✓ | ✓ |

**Note**: Spec.md does not include explicit `it("...")` test case names for any scenario — only file paths. The AC Verification Policy requires that each scenario maps to a *named* test case (i.e., the `it` / `test` description in the test file must be citable). Tasks.md partially compensates by listing coverage bullets. **Recommendation**: add an `it("...")` string to each verification artifact reference in spec.md to make the mapping machine-verifiable.

---

## Test Strategy Assessment

| Layer | Coverage | Assessment |
|---|---|---|
| Unit (pure functions) | `jwt.utils.spec.ts`, `authSlice.spec.ts` | Complete for in-scope units |
| Integration (hook + store) | `useAuth.spec.ts` with real Redux store + MSW | Adequate |
| Component (RTL + MSW) | `LoginForm.spec.tsx`, `LoginPage.spec.tsx`, `RoleGuard.spec.tsx` | Adequate |
| API integration (RTK Query + MSW) | `authApi.spec.ts`, `baseQueryWithReauth.spec.ts` | Adequate for happy paths; gaps at F-01, F-02, F-03, F-04 |
| E2E | Not in scope for this spec (SM-FE-02 is unit/integration only) | Acceptable — E2E is SM-FE-09 concern |
| Contract | No Pact consumer contract for auth endpoints | Advisory — per ADR-010, all API consumers must have contract tests; auth is a consumer of api-gateway |

---

## Pattern-Specific Scenario Audit

### Cache Invalidation (logout evicts RTK cache)

| Check | Status |
|---|---|
| Scenario for cache reset on logout | ✓ REQ-AUTH-01-S03 |
| Spy on `baseApi.util.resetApiState` | ✓ named in T03 |
| Synchronous invalidation assertion | ✓ "within the same synchronous tick" |
| Multi-user leak prevention assertion | Not explicit — S03 checks eviction but does not assert a second user cannot read previous cache | Advisory only |

**Status**: PASS

### Reauth Mutex (concurrent 401 handling)

| Check | Status |
|---|---|
| Concurrent 401 scenario | ✓ REQ-AUTH-04-S04 |
| Exactly-one refresh call assertion | ✓ "POST /api/v1/auth/refresh is called exactly once" |
| Both original requests retry with new token | ✓ stated in S04 |
| Null refresh token pre-check | ✗ MISSING — F-01 (P1 blocker) |

**Status**: FAIL — F-01 must be resolved

---

## Required Changes Before Implementation

### P1 Blockers (must add before any task begins)

| ID | Location | Action |
|---|---|---|
| F-01 | `spec.md` REQ-AUTH-04, `tasks.md` T06 | Add REQ-AUTH-04-S05: 401 with `refreshToken === null` → logout immediately, no network call |
| F-02 | `spec.md` REQ-AUTH-06, `tasks.md` T08 | Add REQ-AUTH-06-S05: network timeout on login → generic error toast in LoginForm |
| F-03 | `spec.md` REQ-AUTH-05, `tasks.md` T07 | Add REQ-AUTH-05-S03: logout API 500 does not block auth state clear or throw to caller |

### P2 Warnings (should add before T06 / T10 are implemented)

| ID | Location | Action |
|---|---|---|
| F-04 | `spec.md` REQ-AUTH-04, `tasks.md` T06 | Add REQ-AUTH-04-S06: refresh `FETCH_ERROR` (network error, not 401) → logout dispatched |
| F-05 | `spec.md` REQ-AUTH-07, `tasks.md` T10 | Add REQ-AUTH-07-S03 (null user), REQ-AUTH-07-S04 (same-role access) |

### P3 Advisory

| ID | Location | Action |
|---|---|---|
| F-06 | `spec.md` REQ-AUTH-08 | Consider adding S02: login failure emits `info` log without `password` field |
| AC naming | `spec.md` all scenarios | Add explicit `it("...")` test case names to each verification artifact reference |
| Contract tests | `tasks.md` | Consider adding a T13 for Pact consumer contract against api-gateway auth endpoints (ADR-010) |

---

## Conclusion

The spec is well-structured with concrete GIVEN/WHEN/THEN scenarios, every AC is backed by a named test file, and all artifacts are auto-executable Vitest tests. The mutex and cache-invalidation patterns have explicit scenarios. The three P1 blockers are **critical correctness gaps**: a missing `null`-refresh-token guard is a real runtime bug vector; the missing timeout and logout-failure scenarios are documented design behaviours with no test enforcement. Resolving F-01 through F-03 and the spec proceeds to **PASS**.
