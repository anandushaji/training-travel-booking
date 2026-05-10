# BA Review Report: frontend-auth

**Reviewer Role**: Business Analyst  
**Verdict**: PASS WITH WARNINGS  
**Sub-Module**: [SM-FE-02] Authentication Feature  
**Change ID**: frontend-auth  
**Review Date**: 2026-05-04  
**Reviewed Against**:
- `openspec/changes/frontend-auth/proposal.md`
- `openspec/changes/frontend-auth/design.md`
- `openspec/changes/frontend-auth/specs/frontend-auth/spec.md`
- `openspec/changes/frontend-auth/tasks.md`
- `docs/decomposition/corporate-travel-portal-frontend.md` (SM-FE-02 section, lines 43–65)
- `docs/contracts/openapi/openapi-api-gateway.yaml`
- AGENTS.md §§7, 8, 10, 11, 12

---

## Checklist Results

| ID | Severity | Checklist Item | Status | Notes |
|---|---|---|---|---|
| BA-FR-01 | BLOCKER | Every in-scope FR has a SHALL statement in the delta spec | PASS | All 8 in-scope functional items are covered by REQ-AUTH-01 through REQ-AUTH-08 |
| BA-FR-02 | BLOCKER | No FR exists only in proposal/design — must be in delta spec | PASS | All FRs are formalised in spec.md |
| BA-FR-03 | BLOCKER | Each SHALL is traceable to source documents | WARN | REQ-AUTH-07 (RoleGuard) and REQ-AUTH-08 (Observability) do not reference a source doc section; traceability is implicit |
| BA-FR-04 | WARNING | SHALL statements use precise language | PASS | Language is specific throughout |
| BA-FR-05 | WARNING | Each SHALL has at least one primary success scenario | PASS | All REQs have GIVEN/WHEN/THEN scenarios |
| BA-FR-06 | WARNING | Conditional requirements broken into separate scenarios | WARN | REQ-AUTH-07: ADMIN viewing MANAGER-gated content is covered, but null-user (unauthenticated) case for RoleGuard is not a scenario |
| BA-FR-07 | INFO | Spec contains no SHALL for out-of-scope items | PASS | Out-of-scope items (password reset, SSO, etc.) are absent from spec |
| BA-NFR-01 | BLOCKER | Every in-scope NFR has a SHALL in delta spec | PASS | Token security, TTL, XSS, coverage target, and build are present in the NFR table |
| BA-NFR-02 | BLOCKER | Performance NFRs include measurable targets | WARN | No front-end performance NFR (e.g., login page TTI, form response latency) is stated. The decomposition cross-cutting section references p95 < 500ms for RTK Query but this is not represented in the auth delta spec NFR table |
| BA-NFR-03 | BLOCKER | Availability/reliability NFRs include explicit SLA | PASS (N/A) | Auth is a frontend module; availability SLA is owned by API Gateway. Acceptable absence. |
| BA-NFR-04 | WARNING | Compliance/regulatory NFRs have verification scenarios | WARN | ADR-005 token-in-memory rule is stated as an NFR but there is no GIVEN/WHEN/THEN scenario verifying that tokens are NOT written to localStorage/sessionStorage/cookies |
| BA-NFR-05 | WARNING | Accessibility NFRs present for UI features | FAIL | LoginForm and LoginPage are user-facing UI components. No WCAG or accessibility NFR is stated in the spec. The decomposition cross-cutting section explicitly calls out WCAG 2.1 AA compliance. |
| BA-NFR-06 | WARNING | Security NFRs for sensitive data handling | PASS | Token storage, XSS, no-sensitive-data-in-logs are present |
| BA-NFR-07 | INFO | Unverifiable NFRs flagged in proposal | PASS | Load-test targets not relevant here; design.md flags accepted trade-offs |
| BA-US-01 | BLOCKER | Every user story goal has a SHALL requirement | PASS | Login, token refresh, role-based access, logout all covered |
| BA-US-02 | BLOCKER | Every AC in original user story has a GIVEN/WHEN/THEN scenario | WARN | The decomposition spec implies a "session expiry" user story (user is redirected to login on token expiry). While REQ-AUTH-04-S03 covers the technical reauth failure path, there is no scenario from the end-user perspective: "GIVEN the user's session has expired, WHEN they perform any action, THEN they see a 'Session expired' message and are redirected to /login". The toast message is mentioned in design.md but has no spec scenario. |
| BA-US-03 | WARNING | Scenarios from user/system perspective, not implementation | WARN | REQ-AUTH-01-S03 scenario is written from an implementation perspective ("store.dispatch(baseApi.util.resetApiState()) is called within the same synchronous tick") rather than an observable user or system outcome |
| BA-US-04 | WARNING | All user roles appear as explicit GIVEN preconditions | PASS | EMPLOYEE and ADMIN roles are explicit in REQ-AUTH-07 scenarios |
| BA-US-05 | INFO | Multiple ACs have separate scenarios | PASS | LoginForm validation errors are separate scenarios (S01, S02) |
| BA-BR-01 | BLOCKER | Every business rule has a SHALL statement | PASS | Login validation, role hierarchy, single-reauth, mutex, cache eviction on logout all present |
| BA-BR-02 | BLOCKER | Every validation rule has an invalid-input rejection scenario | PASS | REQ-AUTH-06-S01 (bad email), REQ-AUTH-06-S02 (short password) |
| BA-BR-03 | BLOCKER | State machine transitions fully specified | WARN | Auth state machine transitions: `unauthenticated → authenticated` (login) and `authenticated → unauthenticated` (logout, forced logout) are covered. However, the transition for **simultaneous/concurrent refresh during an already-authenticated session** edge case (`authenticated → refreshing → authenticated`) is specified technically (mutex scenario REQ-AUTH-04-S04) but the business rule "a user's session must remain continuous during token rotation" is not stated as an explicit business rule |
| BA-BR-04 | WARNING | Boundary values tested in scenarios | WARN | Password minimum length is 8 characters (spec REQ-AUTH-06). The scenario tests "short" but does not test the boundary value (exactly 7 characters vs exactly 8 characters). Minor gap. |
| BA-BR-05 | WARNING | Interacting business rules covered by combined scenario | PASS | The reauth + mutex + retry chain is covered end-to-end in REQ-AUTH-04-S02 and S04 |
| BA-BR-06 | WARNING | Authorisation rules as preconditions and rejection scenarios | WARN | RoleGuard renders `null` for unauthorised roles — the business rule "what the user sees when access is denied" (null rendering) is documented but there is no scenario for an **unauthenticated user** (null `auth.user`) hitting RoleGuard. This is a distinct state from an authenticated user with insufficient role. |
| BA-BR-07 | INFO | Client-side-only rules flagged as risk | PASS | proposal.md explicitly acknowledges client-side Zod validation; server validates independently |
| BA-SC-01 | BLOCKER | Every in-scope item has a SHALL requirement | PASS | All 11 in-scope items from proposal.md are covered by REQs |
| BA-SC-02 | BLOCKER | Spec has no SHALL for out-of-scope items | PASS | Confirmed — no password reset, SSO, or session persistence requirements in spec |
| BA-SC-03 | BLOCKER | Proposal scope matches SM-FE-02 decomposition entry | PASS | Scope is consistent. The proposal adds `RoleGuard.tsx` and `baseQueryWithReauth.ts` which are described in the decomposition Implementation Notes — these are in-scope additions, not creep |
| BA-SC-04 | WARNING | Out-of-scope section names close-call items | PASS | "Logout API call" and "session persistence" are explicitly called out as close-calls |
| BA-SC-05 | WARNING | Open questions affecting scope are resolved | PASS | All three OQs are decided |
| BA-SC-06 | INFO | Intentional narrowing documented | PASS | Logout server-side invalidation is documented as minimal stub with reason |
| BA-EP-01 | BLOCKER | Existing behaviour touched or replaced has MODIFIED requirement | PASS | `baseApi.ts` update (replacing `baseQueryWithRetry` with `baseQueryWithReauth`) is called out explicitly in REQ-AUTH-04 and proposal.md. `AppRoutes.tsx` stub replacement is in scope. `rootReducer.ts` update noted. |
| BA-EP-02 | BLOCKER | Out-of-scope features that could be affected are listed in assumptions/risks | WARN | `PrivateRoute` (SM-FE-01) reads `state.auth.accessToken`. This dependency is acknowledged in REQ-AUTH-01 and proposal.md. However, the spec does not explicitly state that `PrivateRoute` continues to work **unchanged** after this change — there is no MODIFIED requirement or explicit "PrivateRoute is not altered" statement confirming parity. The assumption is implicit. |
| BA-EP-03 | WARNING | No silent re-implementation with different semantics | PASS | `baseQueryWithReauth` wraps `baseQueryWithRetry` — it does not replace its retry semantics |
| BA-EP-04 | WARNING | Shared contract modification impact on consumers noted | PASS | `baseApi.ts` change impact is documented; all RTK Query feature endpoints will now carry the Bearer header — this is the intended outcome and noted |
| BA-EP-05 | INFO | Accepted regressions documented | PASS | Session loss on page refresh is documented as accepted regression with ADR-005 reference |
| BA-LA-01 | WARNING | SHALL statements avoid implementation-specific language | WARN | REQ-AUTH-01-S03 scenario THEN clause ("store.dispatch(baseApi.util.resetApiState()) is called within the same synchronous tick") is implementation language, not observable system outcome. REQ-AUTH-04 refers to "module-level `let mutex`" implicitly via design.md — acceptable in design but borderline in spec. |
| BA-LA-02 | WARNING | Scenarios from actor perspective | WARN | Same issue as BA-LA-01 and BA-US-03: REQ-AUTH-01-S03 and parts of REQ-AUTH-04 are written from internal execution perspective. |
| BA-LA-03 | WARNING | Domain terms used consistently | PASS | `accessToken`, `refreshToken`, `JwtUserPayload`, `isAuthenticated`, `EMPLOYEE/MANAGER/ADMIN` are consistent across all artifacts |
| BA-LA-04 | INFO | Acronyms defined | PASS | JWT, RTK, MSW, HS256 are either self-evident or defined in context |
| BA-LA-05 | INFO | proposal.md Intent readable by non-technical stakeholders | WARN | The Intent section mentions "RTK Query mutations", "Redux memory", and "ADR-005" which are technical terms. A product manager without engineering context may not understand the constraints. Minor issue. |
| BA-AC-01 | BLOCKER | Every in-scope FR has a business-verifiable AC in tasks.md | PASS | Each task maps to spec REQ IDs; scenarios are named |
| BA-AC-02 | WARNING | ACs reference specific scenario from delta spec | PASS | Tasks reference REQ-AUTH-NN-SNN IDs explicitly |
| BA-AC-03 | WARNING | ACs describe observable user outcome, not internal state | WARN | T03 AC (REQ-AUTH-01-S03) and T06 AC mention spying on `baseApi.util.resetApiState` — this is an internal implementation check, not an observable user outcome |
| BA-AC-04 | INFO | ACs sufficient to drive a UAT session | WARN | REQ-AUTH-06-S03 (navigate to `from` after login) is the only true end-to-end user flow scenario. A UAT tester would need more end-to-end flow coverage (full login → protected page → session expiry → re-login cycle) |

---

## Requirements Traceability Matrix

| ID | Requirement (source) | Coverage | Notes |
|---|---|---|---|
| FR-01 | Login with email/password (SM-FE-02 scope, AGENTS.md §12) | ✅ Fully | REQ-AUTH-06, REQ-AUTH-03 |
| FR-02 | JWT token storage in Redux memory only — no localStorage (ADR-005, SM-FE-02) | ✅ Fully | REQ-AUTH-01 + NFR table |
| FR-03 | Automatic token refresh on 401 (SM-FE-02 Implementation Notes) | ✅ Fully | REQ-AUTH-04 with 4 scenarios |
| FR-04 | `authSlice` with `setCredentials` + `logout` actions (SM-FE-02 scope) | ✅ Fully | REQ-AUTH-01 |
| FR-05 | `jwt.utils.ts` — decode, check expiry (SM-FE-02 scope) | ✅ Fully | REQ-AUTH-02 |
| FR-06 | RTK Query mutations for login + refresh (SM-FE-02 scope) | ✅ Fully | REQ-AUTH-03 |
| FR-07 | `useAuth` hook exposing `{ user, isAuthenticated, login, logout }` (SM-FE-02 Contracts) | ✅ Fully | REQ-AUTH-05 |
| FR-08 | `LoginForm.tsx` with Zod validation (SM-FE-02 scope) | ✅ Fully | REQ-AUTH-06 |
| FR-09 | `LoginPage.tsx` full-page layout (SM-FE-02 scope) | ✅ Fully | REQ-AUTH-06-S03, T09 |
| FR-10 | `RoleGuard` component for role-based UI elements (SM-FE-02 Implementation Notes) | ✅ Fully | REQ-AUTH-07 |
| FR-11 | Logout clears Redux state + RTK Query cache (SM-FE-02 scope) | ✅ Fully | REQ-AUTH-01-S02, REQ-AUTH-01-S03 |
| FR-12 | Redirect to originally requested URL after login (SM-FE-02 Implementation Notes) | ✅ Fully | REQ-AUTH-06-S03 |
| FR-13 | Fire-and-forget logout API call (OQ-01 decided) | ✅ Fully | REQ-AUTH-03, REQ-AUTH-05 |
| FR-14 | Observability: structured logs for auth lifecycle (AGENTS.md §11) | ✅ Fully | REQ-AUTH-08 |
| NFR-01 | Token security — Redux memory only, no DOM exposure (ADR-005) | ✅ Fully | NFR table |
| NFR-02 | Token TTL — access ≤ 8h, refresh ≤ 7d (AGENTS.md §12) | ✅ Fully | NFR table |
| NFR-03 | No secrets in logs (AGENTS.md §12, AGENTS.md §9) | ✅ Fully | REQ-AUTH-08 |
| NFR-04 | 80% test coverage (ADR-010, AGENTS.md §10) | ✅ Fully | NFR table |
| NFR-05 | WCAG 2.1 AA accessibility for UI (decomposition cross-cutting) | ❌ Missing | No accessibility NFR in spec |
| NFR-06 | Login form performance / time-to-interactive | ⚠️ Partial | Not addressed; decomposition mentions p95 < 500ms for RTK Query |
| NFR-07 | Metrics counters for auth events (AGENTS.md §11) | ✅ Fully | design.md Observability + REQ-AUTH-08 reference to metrics.ts |

**Coverage**: 14/16 FRs fully covered, 0 partial, 1 missing (NFR-05 accessibility), 1 partial (NFR-06 performance).

---

## Existing Feature Parity

| Existing Behaviour | Status | Notes |
|---|---|---|
| `PrivateRoute` (SM-FE-01) reads `state.auth.accessToken` | ⚠️ Unclear | REQ-AUTH-01 states the slice must register under key `auth`. However, no spec statement explicitly confirms PrivateRoute is NOT modified — the parity is implied, not stated. Low risk but worth a clarifying note. |
| `baseApi.ts` uses `baseQueryWithRetry` (SM-FE-01) | ✅ Preserved (replaced) | REQ-AUTH-04 explicitly states `baseApi.ts` MUST be updated. The replacement is in scope and noted. Retry semantics for SAFE_METHODS are preserved by wrapping, not replacing, `baseQueryWithRetry`. |
| `AppRoutes.tsx` placeholder `LoginPage` stub | ✅ Preserved (replaced) | In-scope replacement, T09 and T12 cover it. |
| `rootReducer.ts` shape | ✅ Preserved (extended) | T04 adds `auth` key; no existing keys are removed. |
| `notificationSlice` used for error toasts | ✅ Preserved | REQ-AUTH-06-S04 uses existing `addNotification` action — no modification to the existing slice. |

---

## Scope Alignment

**Scope Creep** (in spec, outside decomposition scope):
- None detected. `RoleGuard`, `baseQueryWithReauth`, `jwt.utils.ts`, and observability are all named or implied in the SM-FE-02 Implementation Notes and Contracts sections.

**Scope Gaps** (in decomposition scope, missing from spec):
- **Minor gap**: The decomposition lists `POST /auth/refresh` response as `{ accessToken }` only (line 57) — the spec correctly uses the full `TokenPairResponse` (including `refreshToken` and `user`) which matches the OpenAPI contract. The decomposition entry is imprecise, but the spec is correct. This is a documentation gap in the decomposition, not the spec.

---

## Business Rules & Edge Cases

| Rule / Edge Case | In Spec? | Notes |
|---|---|---|
| Single-reauth: refresh attempted at most once per original 401 | ✅ | REQ-AUTH-04-S02 |
| Concurrent 401 handlers must not issue multiple refresh calls | ✅ | REQ-AUTH-04-S04 (mutex) |
| Post-refresh, failed second request returns 401 to caller | ✅ | REQ-AUTH-04-S03 |
| Login failure (wrong password) shows inline error | ✅ | REQ-AUTH-06-S04 + design.md error table |
| Logout evicts RTK Query cache | ✅ | REQ-AUTH-01-S03 |
| Role hierarchy: ADMIN ≥ MANAGER ≥ EMPLOYEE | ✅ | REQ-AUTH-07-S01, S02 |
| Unauthenticated user (null `auth.user`) hitting RoleGuard | ❌ Missing | No scenario for null user — spec only tests insufficient role, not null user. This is a business rule gap: "if user is not logged in, RoleGuard must return null" |
| Password minimum 8 characters boundary (exactly 7 vs 8) | ⚠️ Partial | Scenario tests "short" but not exact boundary values |
| Session expiry user experience (toast + redirect to /login) | ⚠️ Partial | Design.md error table specifies "Session expired" toast; no user-facing scenario in spec confirms this observable outcome |
| 400 validation error from API on login (malformed fields) | ❌ Missing | The OpenAPI spec defines a 400 response for `/auth/login`. No spec scenario covers the case where the API rejects with 400 (vs 401 for wrong credentials). |
| 503 from API Gateway during login | ⚠️ Partial | Design.md error table mentions "Service unavailable" toast, but no spec scenario covers the 503 response from `POST /auth/login` |

---

## Stakeholder Language

1. **REQ-AUTH-01-S03 THEN clause** — "store.dispatch(baseApi.util.resetApiState()) is called within the same synchronous tick" — this is implementation code, not a business outcome. Should read: "all previously cached API data is cleared immediately so the next user cannot see the previous user's data."

2. **REQ-AUTH-04 title and scenarios** — Use of "mutex", "concurrent 401 handlers", and "module-level Promise flag" in THEN clauses. These are invisible to a business stakeholder. The business intent (session remains continuous during token rotation; users are not logged out spuriously) should be stated as a SHALL.

3. **proposal.md Intent section** — references "RTK Query mutations", "Redux memory", "ADR-005", and "dispatch `logout`". A product manager would benefit from a single-sentence plain-language statement of the user value (e.g., "Employees can log in once per browser session and remain authenticated for up to 8 hours without re-entering credentials").

4. **Consistent term**: The spec uses `TokenPairResponse` as a type name — this is a technical type name, not a domain term. Low severity; no glossary exists to conflict with.

---

## Summary

The `frontend-auth` change folder is well-structured and covers the core authentication feature comprehensively. Thirteen of the sixteen identified requirements are fully covered, and all three open questions have been decided. The existing `PrivateRoute`/`baseApi`/`rootReducer` parity concerns are handled, albeit with one implicit assumption rather than an explicit MODIFIED statement. The primary weaknesses are: (1) **no accessibility NFR** for the login UI despite WCAG 2.1 AA being a project-wide cross-cutting requirement; (2) **three missing or partial edge-case scenarios** — null-user RoleGuard, API 400 on login, and the user-visible "Session expired" toast flow; and (3) **implementation language leaking into THEN clauses** in REQ-AUTH-01-S03, which reduces the spec's usability for UAT and business review. None of these rises to a critical blocker, but the accessibility gap (BA-NFR-05 FAIL) and missing 400 scenario (business rule gap) prevent a clean PASS.

---

## Required Fixes

1. **[BA-NFR-05 — BLOCKER for PASS]** Add an accessibility NFR to `spec.md` NFR table: "The `LoginForm` and `LoginPage` MUST meet WCAG 2.1 Level AA requirements including keyboard navigability, ARIA labels on all form controls, and sufficient colour contrast." Add a corresponding scenario (e.g., "GIVEN LoginForm is rendered, WHEN a screen reader user navigates the form, THEN all fields and the submit button have accessible labels"). Source: `docs/decomposition/corporate-travel-portal-frontend.md` cross-cutting Accessibility section.

2. **[BA-BR — Missing 400 scenario]** Add a scenario to REQ-AUTH-06 (or REQ-AUTH-03): "GIVEN the user submits a login request and the API Gateway returns 400 (validation error), WHEN the form receives the response, THEN an inline or toast error is displayed and no credentials are stored." Source: `openapi-api-gateway.yaml` `/auth/login` 400 response.

3. **[BA-US-02 / BA-BR — Session expiry UX]** Add a user-facing scenario to REQ-AUTH-04 for the end-user observable outcome: "GIVEN a user is authenticated and their refresh token has expired, WHEN they perform any API call, THEN they are redirected to `/login` and a 'Session expired' notification is displayed." Source: `design.md` Error Handling table; decomposition Implementation Notes.

4. **[BA-BR-06 — Null user in RoleGuard]** Add a scenario to REQ-AUTH-07: "GIVEN `auth.user` is null (unauthenticated), WHEN `<RoleGuard requiredRole="EMPLOYEE">` is rendered, THEN it renders null without throwing." Source: RoleGuard implementation spec in `tasks.md` T10 — the guard checks `!user` already; this must be a named spec scenario.

5. **[BA-EP-02 — PrivateRoute parity]** Add an explicit statement to `proposal.md` Assumptions or to REQ-AUTH-01: "PrivateRoute (SM-FE-01) is NOT modified by this change. After T04, `state.auth.accessToken` will be populated on login, making PrivateRoute functional without any code change to SM-FE-01's PrivateRoute.tsx."

---

## Suggestions (non-blocking)

- Rewrite the THEN clause of REQ-AUTH-01-S03 in observable business language: "all RTK Query cached data (bookings, flights, profile, expenses) is no longer accessible, preventing the next user on the same terminal from seeing the previous user's data."
- Add a plain-language user-value sentence to `proposal.md` Intent for PM readability.
- Document the 503 login error scenario in spec (currently only in design.md error table) — even a brief scenario referencing the toast would close the gap.
- Consider adding an end-to-end GIVEN/WHEN/THEN scenario covering the full "redirect to /login → login → redirect back to original route" happy path as a single flow scenario. This would directly enable UAT.
