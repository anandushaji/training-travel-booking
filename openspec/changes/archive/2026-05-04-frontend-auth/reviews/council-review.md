# Council Review Report: frontend-auth

**Sub-Module**: [SM-FE-02] Authentication Feature  
**Review Date**: 2026-05-04

---

## Individual Verdicts

| Reviewer | Verdict | Critical Issues |
|---|---|---|
| BA | PASS WITH WARNINGS | Missing accessibility NFR; missing 400 scenario; session-expiry UX scenario absent; null-user RoleGuard scenario missing; PrivateRoute parity implicit |
| Architect | PASS WITH WARNINGS | `ROLE_RANK` hardcoded; consumed contracts not registered for Pact; cache-eviction metric missing; `correlationId` absent from log entries |
| QA | PASS WITH WARNINGS | No scenario for `refreshToken === null` on 401; no timeout scenario during login; no fire-and-forget logout test |
| Dev | PASS WITH WARNINGS | `@hookform/resolvers` missing from `package.json`; MSW `server.ts` not updated in T11; concurrent refresh test lacks deterministic strategy |

---

## Council Verdict: PASS WITH WARNINGS

**Rationale**: All four reviewers returned PASS WITH WARNINGS (no FAIL verdict); council verdict is PASS WITH WARNINGS per the first-matching-rule. However, six P1 blockers across three reviewers must be resolved before `/opsx:apply`.

---

## Conflict Resolutions

**None.** No cross-reviewer conflicts found. All four reviewers are in agreement on the nature and priority of issues.

---

## Consolidated Action List

### P1 — Blockers (must fix before /opsx:apply)

| # | Fix | Raised By | Artifact | Source Reference |
|---|---|---|---|---|
| P1-01 | Add install task for `@hookform/resolvers` (Wave 0 or prepend to T01) — `npm install @hookform/resolvers --legacy-peer-deps`. Without it, T08 fails to compile. | Dev | `tasks.md` — new task T00b or update T01 | `package.json` analysis |
| P1-02 | Update T11 to also patch `src/mocks/server.ts`: change `import handlers from './handlers'` to `import { handlers } from './handlers/index'` (or equivalent) so all MSW auth tests actually intercept HTTP. | Dev | `tasks.md` — T11 | Existing `src/mocks/server.ts` |
| P1-03 | Add a spec scenario for `refreshToken === null` when a 401 fires: `baseQueryWithReauth` must dispatch `logout()` immediately without calling `POST /auth/refresh`. | QA | `specs/frontend-auth/spec.md` — REQ-AUTH-04 | design.md reauth logic |
| P1-04 | Add a spec scenario for login network timeout: `baseQueryWithTimeout` fires → `LoginForm` surfaces generic "Network error" toast; observable via `state.notifications`. | QA | `specs/frontend-auth/spec.md` — REQ-AUTH-06 | design.md Error Handling table |
| P1-05 | Add a spec scenario and test for the fire-and-forget logout API: `useAuth.logout()` must not block/throw when `POST /auth/logout` returns 401/500. | QA | `specs/frontend-auth/spec.md` — REQ-AUTH-05; `tasks.md` — T07 | proposal.md OQ-01 |
| P1-06 | Add `T00` task to install `@hookform/resolvers` (and verify `react-hook-form`, `zod` are present), and update T06 mutex description to remove "or equivalent" — provide a single canonical mutex implementation (module-level `let mutexPromise: Promise<boolean> \| null = null` pattern). | Dev | `tasks.md` — T06 | dev-review findings |

---

### P2 — Should Fix (before /opsx:archive)

| # | Fix | Raised By | Artifact | Notes |
|---|---|---|---|---|
| P2-01 | Add `correlationId` field to all structured log events in `design.md` Observability table — PROJECT.md mandates it in every log entry. | Architect | `design.md` — Observability section | Non-blocking but ADR-007 gap |
| P2-02 | Add `frontend_auth_cache_invalidation_total` counter (incremented on logout) to the Metrics table in `design.md`. | Architect | `design.md` — Observability section | Cache Invalidation is an Applied pattern — needs an observable signal |
| P2-03 | Add a `ROLE_RANK` note in `auth.types.ts` (T01) explaining the hierarchy is derived from the `UserRole` enum; add a comment warning that adding a role requires updating `ROLE_RANK`. | Architect | `src/features/auth/auth.types.ts` — T01 | Drift-risk mitigation |
| P2-04 | Add scenario: `RoleGuard` renders `null` when `auth.user === null` (unauthenticated user somehow reaches a guarded component). | BA / QA | `specs/frontend-auth/spec.md` — REQ-AUTH-07 | Edge case; same-role (MANAGER sees MANAGER) also missing |
| P2-05 | Add a `FETCH_ERROR` / network-failure scenario for `baseQueryWithReauth` refresh attempt — not just 401 but full network down should also dispatch `logout()`. | QA | `specs/frontend-auth/spec.md` — REQ-AUTH-04 | Low probability but safe fallback path |
| P2-06 | Register consumed contracts (`/auth/login`, `/auth/refresh`, `/auth/logout`) in `CONTRACTS.md` (or equivalent consumer-driven contract registry) for Pact test wiring in Wave 5. | Architect | `design.md` — API contracts | Pact consumer test enabler |

---

### P3 — Nice to Have (can defer)

| # | Suggestion | Raised By | Notes |
|---|---|---|---|
| P3-01 | Add WCAG 2.1 AA accessibility scenario for `LoginForm` (keyboard navigation, label association, colour contrast). The decomposition lists accessibility as a cross-cutting concern. | BA | Low priority for internal tool; defer to SM-FE-06 polish |
| P3-02 | Add an observability scenario asserting that a failed login emits a `frontend_auth_login_total{outcome="failure"}` counter increment. | QA | Nice signal; not a blocker |
| P3-03 | Move `useAuth.spec.ts` to flat convention `src/common/hooks/useAuth.spec.ts` (not `__tests__/`) to match existing `useDebounce.spec.ts` pattern. | Dev | Cosmetic consistency |

---

## Recommendation

🔧 **Resolve P1 blockers, then proceed to `/opsx:apply`.**

Six P1 items need fixing before implementation begins:

- **P1-01 + P1-06**: Add a new `T00` install task for `@hookform/resolvers`; canonicalise the mutex pattern in T06.
- **P1-02**: Extend T11 to also patch `src/mocks/server.ts`.
- **P1-03, P1-04, P1-05**: Add three missing scenarios to `spec.md` (null refresh token on 401; login timeout; fire-and-forget logout).

These are all contained fixes. After applying them, only **QA** and **Dev** reviewers need to re-run (scenario additions + tasks update — no architectural or BA change required).

---

## Re-Review Scope

| Fix Area | Re-run Reviewer |
|---|---|
| New scenarios added to spec.md (P1-03, P1-04, P1-05, P2-04, P2-05) | `qa-reviewer` |
| New T00 task + T06/T11 task updates | `dev-reviewer` |

BA and Architect re-review is **not required** — no functional requirements or architectural patterns were changed.

---

## Archive Readiness Checklist

- [ ] All P1 fixes applied to `spec.md` and `tasks.md`
- [ ] `tasks.md` T00 installs `@hookform/resolvers`; T06 has canonical mutex; T11 patches `server.ts`
- [ ] Implementation complete and all tests green (`npm test` in `pgt/frontend/`)
- [ ] Every AC has a named verification artifact running green
- [ ] P2 items recorded as open items in `proposal.md` or deferred to follow-up change
- [ ] Ready to run `/opsx:archive`
