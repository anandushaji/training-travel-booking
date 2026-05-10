# Council Review Report: frontend-booking

**Sub-Module**: [SM-FE-04] Booking Feature
**Review Date**: 2026-05-05

---

## Individual Verdicts

| Reviewer | Verdict | Critical Issues Raised |
|---|---|---|
| BA Reviewer | PASS WITH WARNINGS | 10 warnings (receipt link, FAILED UX, payment validation scenario, auth SHALL statement); 0 blockers |
| Architect Reviewer | PASS WITH WARNINGS | 5 warnings (idempotency key risk, polling jitter, PII documentation, CONTRACTS.md, jitter); 0 blockers after design.md fixed |
| QA Reviewer | PASS WITH WARNINGS | Remaining warnings: cache-hit scenario for getBookings 300s TTL, no E2E task, no cancelBooking 4xx scenario; 0 blockers after spec.md/tasks.md fixed |
| Dev Reviewer | PASS WITH WARNINGS | 3 warnings addressed in tasks.md (observability task 1.3, routes.config.ts in task 7.1, CONTRACTS.md task 9.2); 0 blockers |

---

## Council Verdict: PASS WITH WARNINGS

**Rationale**: All four reviewers issued PASS WITH WARNINGS; no FAIL verdict remains; no P1 blockers survive after the in-session fixes to design.md, spec.md, and tasks.md.

---

## Conflict Resolutions

No cross-reviewer conflicts found. All findings were complementary across reviewers (BA → QA → Architect → Dev each caught separate gaps; no two reviewers contradicted each other's guidance).

---

## Consolidated Action List

### P1 — Blockers (must fix before /opsx:apply)

All P1 items were resolved during the review cycle. No P1 items remain.

| # | Fix | Status | Raised By | Notes |
|---|---|---|---|---|
| 1 | design.md missing Pattern Selection Log (AR-PSL-01) | ✅ Fixed | Architect | PSL added as first section of design.md |
| 2 | design.md missing Observability section (AR-OBS-01/02) | ✅ Fixed | Architect | Observability section added to design.md |
| 3 | All 27 spec.md scenarios missing GIVEN clauses (QA-SC-01) | ✅ Fixed | QA | GIVEN clauses added to all 32 scenarios in spec.md |
| 4 | No failure scenario for createBooking transient failure (QA-FP-01) | ✅ Fixed | QA | Scenario added to spec.md; AC + artifact added to task 4.1 |
| 5 | No failure scenario for poll exhaustion — 10 attempts (QA-FP-02) | ✅ Fixed | QA | Scenario added to spec.md; AC + artifact added to task 4.1 |
| 6 | No validation scenario for missing payment method (QA-FP-03) | ✅ Fixed | QA | Scenario added to spec.md; AC added to task 5.1 |
| 7 | No FAILED booking UX scenario or spec (QA-FP-04 / BA) | ✅ Fixed | QA + BA | Scenario added to spec.md; BookingPage FAILED requirement updated; AC added to task 6.1 |
| 8 | Task 3.2 missing AC and verification artifact (QA-AC-01 / QA-AV-01) | ✅ Fixed | QA | AC + artifact added to task 3.2 |
| 9 | No task for extending baseQueryWithReauth.ts logging to /bookings (DR-TC-11) | ✅ Fixed | Dev | Task 1.3 added to tasks.md |
| 10 | Task 7.1 missing routes.config.ts update (DR-AF-06 / DR-CB) | ✅ Fixed | Dev | Task 7.1 updated to include routes.config.ts constants |

---

### P2 — Should Fix (before /opsx:archive)

| # | Fix | Raised By | Artifact to Update | Notes |
|---|---|---|---|---|
| 1 | Add jitter to polling first-attempt delay (±200ms random) to prevent synchronized polling bursts from concurrent bookings | Architect (AR-RES-06) | `useBooking.ts` implementation | Low risk (single user per browser), but good practice |
| 2 | Add idempotency key (`X-Idempotency-Key`) to `POST /bookings` to prevent duplicate booking on rare network retry | Architect (AR-TXN-04) | `bookingApi.ts`, `useBooking.ts` | Low risk because `baseQueryWithRetry` excludes POST; still a correctness improvement |
| 3 | Add PII handling note to design.md confirming no card data captured and traveler PII is read-only from existing auth state | Architect (AR-SEC-04) | `design.md` | Compliance documentation |
| 4 | BA: Receipt link in BookingConfirmationPage (download/print receipt) | BA | `spec.md`, task 6.2 | Non-critical for MVP; can be deferred to SM-FE-04.1 |
| 5 | BA: JWT auth SHALL statement — spec does not explicitly state bookings endpoints require Bearer auth | BA | `spec.md` | Covered by existing `baseQueryWithReauth` infrastructure; documentation gap only |
| 6 | QA: No scenario for unknown BookingStatus value (e.g., `'PROCESSING'`) | QA | `spec.md` | Edge case; graceful fallback rendering |
| 7 | QA: No scenario for `cancelBooking` returning 4xx — error visible in BookingDetails | QA | `spec.md`, task 5.3 | Non-blocking; cancel error state is a good test |
| 8 | Dev: Task 3.2 should explicitly state the import line to add (`import { bookingHandlers } from './booking.handlers'`) | Dev | `tasks.md` | Low-ambiguity risk for agent |
| 9 | Dev: Clarify task 2.2 artifact as "create or update `rootReducer.spec.ts`" | Dev | `tasks.md` | File may not exist yet; minor agent ambiguity |

---

### P3 — Nice to Have (can defer)

| # | Suggestion | Raised By | Notes |
|---|---|---|---|
| 1 | Add E2E task (10.1) for critical booking flow: search → select → confirm booking → confirmation page | QA (QA-TS-04) | Per ADR-010; can be scheduled in a follow-up task |
| 2 | Add cache-hit scenario for getBookings 300s TTL | QA (QA-PT-CA-01) | RTK Query library behavior; low value |
| 3 | Name useBooking.spec.ts test cases using GIVEN/WHEN/THEN pattern | QA (QA-AV-06) | Self-evident AC traceability improvement |
| 4 | Update CONTRACTS.md after task 9.2 (already in tasks.md) | Architect (AR-CTR-04) | Already task 9.2 |
| 5 | Register `Booking` and `BookingRequest` types in CONTRACTS.md as shared types | Architect (AR-DOM-09) | Document shared type ownership |
| 6 | Double-click protection scenario for "Confirm Booking" button | QA | Loading spinner already prevents this; test would verify |

---

## Recommendation

✅ **Proceed to `/opsx:apply`** — all P1 blockers resolved; change folder is ready for implementation.

The `frontend-booking` change folder passed all four reviewer council reviews with PASS WITH WARNINGS verdicts. All blocking issues identified during the review cycle — missing Pattern Selection Log, missing Observability section in design.md, incomplete scenario GIVEN clauses (27 of 27 fixed), missing failure-path scenarios (4 added), missing task ACs/artifacts (3 fixed), and missing implementation tasks (tasks 1.3, 7.1 routes.config.ts, 9.2) — were resolved in-session before the final verdict. The spec now covers 32 fully-structured scenarios across 14 requirements with complete happy-path and failure-path coverage, named verification artifacts for all 31 tasks, and a clear 10-task-group implementation sequence consistent with the SM-FE-01/02/03 patterns already in the codebase.

P2 items (idempotency key, polling jitter, PII doc, receipt link, auth SHALL statement) are quality improvements that do not block implementation and can be addressed during or after implementation. P3 items are deferred suggestions.

---

## Archive Readiness Checklist

- [ ] All P1 fixes applied ✅ (done in this session)
- [ ] `openspec validate frontend-booking` passes
- [ ] Implementation complete (tasks 1.1–9.2 executed)
- [ ] All tests green (`npm test` in `pgt/frontend/`)
- [ ] **Every AC has a named verification artifact that runs green** — AC Verification Policy satisfied
- [ ] P2 items documented as open questions in `proposal.md` or deferred to follow-up
- [ ] Ready to run `/opsx:archive`

---

## Re-Review Scope

Not required. No re-review needed before `/opsx:apply`.

All four reviewers issued PASS WITH WARNINGS after in-session fixes. The fixes were:
- design.md additions (Architect domain) — no re-review needed; fixes are additive documentation
- spec.md additions (QA/BA domain) — no re-review needed; all fixes add missing coverage without contradicting existing requirements
- tasks.md additions (Dev domain) — no re-review needed; fixes add missing tasks without changing ordering or feasibility
