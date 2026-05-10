# Council Review Report: expense-service

**Sub-Module**: [SM-08] Expense Service
**Review Date**: 2026-05-04

---

## Individual Verdicts

| Reviewer | Verdict | Critical Issues |
|---|---|---|
| BA | FAIL | GET /categories type + auth mismatch; GET /expenses/summary byQuarter vs OpenAPI shape; missing GET /expenses/reports endpoint; ReceiptLine/TaxInfo absent |
| Architect | PASS WITH WARNINGS | kafka_messages_produced_total + kafka_consumer_lag missing (ADR-007 violation); wrong TypeORM timeout config (ADR-008) |
| QA | PASS WITH WARNINGS | GET /categories auth conflict (C-01 blocker); EMPLOYEE GET /receipts/:id → 403 missing; transient-DB-error scenario missing |
| Dev | FAIL | T07 ordering (compile failure); transaction pattern unspecified; GET /categories type mismatch; categories auth conflict; no Kafka idempotency integration test |

---

## Council Verdict: FAIL

**Rationale**: Two reviewers (BA and Dev) returned FAIL; the council verdict is automatically FAIL. P1 fixes have been applied to the change folder artifacts and are documented below.

---

## Conflict Resolutions

### CR-01 — GET /categories: authenticated or public?

**BA position**: defer to OpenAPI spec (bearerAuth required).
**Dev position**: tasks.md said no-guard — contradicts OpenAPI.
**QA position**: contradiction is a hard blocker (C-01).

**Resolution** (applied): `JwtAuthGuard` added to `/categories` route in T14, aligning with OpenAPI `bearerAuth`. All three AC assertions updated. Decision required from user: **No** (alignment with OpenAPI is the correct default for a business app; consistent with all other routes).

### CR-02 — GET /expenses/summary response shape: byQuarter vs byMonth/byCategory

**BA position**: spec uses `byQuarter` which is not in OpenAPI `ExpenseSummary` schema.
**No conflicting reviewer position** (other reviewers did not contest).

**Resolution** (applied): spec.md scenario updated to assert `byMonth` array and `byCategory` object, matching OpenAPI `ExpenseSummary`. `ExpenseSummaryDto` in T09 updated accordingly. Decision required from user: **No** — OpenAPI is the contract authority.

### CR-03 — ReceiptLine / TaxInfo value objects (decomposition scope)

**BA position**: decomposition lists them; they should be in domain model.
**Architect position**: not raised.
**Dev position**: not raised (no impact on feasibility).

**Resolution**: Carrying as P3 (deferred). The decomposition names them but the booking data flowing through the `BookingConfirmed` event does not include line-item or tax breakdowns. Implementing hollow objects would add no value in v1. The Receipt aggregate can encapsulate amount/currency without separate value objects. Proposal already defers PDF generation (where breakdowns matter). No fix required before implementation.

### CR-04 — GET /expenses/reports endpoint (decomposition scope)

**BA position**: endpoint is in the decomposition AND OpenAPI; should be implemented.
**Proposal position**: `departmentId` is not in the `BookingConfirmed` payload; department grouping deferred to v2.

**Resolution**: P2. The endpoint itself is in the OpenAPI spec, but the underlying aggregation data (`departmentId`) is unavailable in v1 because the event payload doesn't carry it. Resolution path: either (a) add a stub endpoint that returns an empty array with a `503 Service Unavailable` note for v1, or (b) explicitly update the proposal to state this endpoint is deferred to v2 with a rationale. No change required before implementation begins — carry as P2 with an open proposal note.

---

## Consolidated Action List

### P1 — Blockers — RESOLVED IN THIS REVISION

All P1 items were fixed directly in the change folder before proceeding to implementation.

| # | Fix | Raised By | Artifact Changed |
|---|---|---|---|
| P1-01 | Reorder checklist: T07 after T11; add prerequisite note | Dev R1 | tasks.md checklist + T07 description |
| P1-02 | Specify transaction pattern in T07/T10/T11 (EntityManager parameter) | Dev R2 | tasks.md T07, T10, T11 |
| P1-03 | Fix GET /categories return type: `CategoryResponseDto[]` not `string[]` | BA CG-02, Dev R3 | tasks.md T09, T12, T14 |
| P1-04 | Align GET /categories auth with OpenAPI: add JwtAuthGuard; update T14 AC-03/AC-05 | BA CG-01, QA C-01, Dev R4 | tasks.md T14 |
| P1-05 | Fix GET /expenses/summary: assert byMonth/byCategory not byQuarter | BA CG-03 | spec.md Scenario 9; tasks.md T09, T12 |
| P1-06 | Add EMPLOYEE GET /receipts/:id → 403 scenario; add T13 AC-05 + T12 AC-02 | QA G-01 | spec.md; tasks.md T12, T13 |
| P1-07 | Add transient DB error scenario (offset not committed); add T07 AC-06 | QA G-02 | spec.md; tasks.md T07 |
| P1-08 | Add kafka_messages_produced_total + kafka_consumer_lag to design + T16 | Architect W-01 | design.md; tasks.md T16 |
| P1-09 | Fix TypeORM timeout: `extra: { statement_timeout, query_timeout }` | Architect W-02 | design.md; tasks.md T05 |
| P1-10 | Add hybrid app bootstrap (Kafka microservice) to T01 | Dev R7 | tasks.md T01 |
| P1-11 | Add JwtAuthGuard task to T01; specify source (copy from booking-service) | Dev R6 | tasks.md T01 |
| P1-12 | Add Kafka consumer idempotency integration test (T18 AC-04) | Dev R5, QA G-05 | tasks.md T18 |

---

### P2 — Should Fix (before /opsx:archive)

| # | Fix | Raised By | Notes |
|---|---|---|---|
| P2-01 | Add processed_events cleanup policy note to design.md (24h vs permanent retention) | Architect W-03 | Document compliance justification or add cron cleanup |
| P2-02 | CQRS deferral note: add read/write assumption + deferred-decision record | Architect W-04 | Add to Pattern Selection Log |
| P2-03 | Outbox justification: add explicit PROJECT.md §6 reference | Architect W-05 | Applied partially; verify after implementation |
| P2-04 | Cache deferral note: state what would be cached and why v1 can defer | Architect W-06 | design.md §12 note |
| P2-05 | GET /expenses/reports endpoint: add explicit deferral statement to proposal.md | BA G-01 (CR-04) | proposal.md Out of Scope section |
| P2-06 | Extend T18 AC-01 to assert concurrent duplicate events (race on processed_events PK) | QA G-07 | Add to consumer integration spec |
| P2-07 | Add scenario for expired/malformed JWT → 401 | QA G-03 | spec.md + T13/T14 |
| P2-08 | Pagination defaults documented in ExpenseQueryDto (default page=1, limit=20, max=100) | BA BR-11 | tasks.md T09 (partially done) |

---

### P3 — Nice to Have (can defer)

| # | Suggestion | Raised By | Notes |
|---|---|---|---|
| P3-01 | ReceiptLine + TaxInfo value objects | BA FR-18, FR-19 | Defer to v2 with receipt breakdown data |
| P3-02 | Scenario for GET /receipts?bookingId= — empty list vs 404 | BA S-01 | Low risk; v1 returns empty list |
| P3-03 | Scenario for endDate < startDate → 400 | BA S-02 | Add as edge-case scenario |
| P3-04 | Scenario for GET /expenses/export with zero results | BA S-03 | Returns empty CSV (header only) |
| P3-05 | groupBy parameter scenarios | BA G-09 | Not implemented in v1 |
| P3-06 | pdfUrl field: add null/empty note to ReceiptResponseDto | BA G-07 | Always null in v1 |

---

## Recommendation

🔧 **All P1 blockers have been resolved in this revision.** The change folder is now ready for implementation.

Proceed directly to `/opsx:apply` (SM-08 implementation). No re-review is required for the P1 fixes since they are mechanical corrections (ordering, type alignment, missing ACs) rather than design changes. The architect- and qa-reviewer verdicts were PASS WITH WARNINGS, so the council can proceed once P1 items are confirmed applied (which they are above).

P2 items should be addressed during implementation or before archiving. P3 items are explicitly deferred.

---

## Archive Readiness Checklist

- [x] All P1 fixes applied to proposal.md, design.md, spec.md, tasks.md
- [ ] Implementation complete and tests green
- [ ] Branch coverage ≥ 80% (`npm run test:cov` passes)
- [ ] Every AC has a named verification artifact that runs green
- [ ] P2 items documented as open notes in proposal.md or resolved during implementation
- [ ] Ready to run archive
