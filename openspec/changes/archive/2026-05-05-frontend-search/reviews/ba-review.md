# BA Review Report: frontend-search

**Reviewer Role**: Business Analyst
**Verdict**: FAIL
**Sub-Module**: [SM-FE-03] Flight Search Feature
**Reviewed Against**:
- `docs/decomposition/corporate-travel-portal-frontend.md` §SM-FE-03
- `openspec/changes/frontend-search/proposal.md`
- `openspec/changes/frontend-search/design.md`
- `openspec/changes/frontend-search/specs/frontend-search/spec.md`
- `openspec/changes/frontend-search/tasks.md`
- `AGENTS.md` §10 (testing NFRs)
- `docs/adr/` (ADR-008 performance targets referenced by decomposition)

---

## Checklist Results

| ID | Item | Status | Notes |
|---|---|---|---|
| BA-FR-01 | Every in-scope FR has a SHALL statement in the delta spec | WARN | Filter/sort apply-to-results behavior is in-scope per decomposition but has no SHALL statement (see FR-11) |
| BA-FR-02 | No in-scope FR represented only in proposal/design | WARN | `useFlightSearch` hook debounce behavior described only in design.md, not as a SHALL |
| BA-FR-03 | Each SHALL traceable to source doc section | WARN | Traceability is by component name inference, not explicit source ID references |
| BA-FR-04 | SHALL statements use precise, unambiguous language | WARN | Several scenarios reference internal symbols (`useLazySearchFlightsQuery`, `searchSlice.setSelectedOffer`) |
| BA-FR-05 | Each SHALL has at least one WHEN/THEN scenario | PASS | All 9 requirements have ≥1 scenario |
| BA-FR-06 | Conditional requirements broken into separate requirements | PASS | Role-conditional access handled as a dedicated SearchPage scenario |
| BA-FR-07 | No SHALL statements outside declared scope | PASS | |
| BA-NFR-01 | Every in-scope NFR has a SHALL statement in delta spec | FAIL | ADR-008 p95 < 500ms is explicitly listed in decomposition §SM-FE-03 as a Key Requirement — absent from spec |
| BA-NFR-02 | Performance NFRs include measurable targets | FAIL | No performance SHALL statement at all in the spec |
| BA-NFR-03 | Availability/reliability NFRs have explicit SLA | PASS | N/A for this sub-module |
| BA-NFR-04 | Compliance/regulatory NFRs have scenarios | PASS | No GDPR/PCI data handled in search |
| BA-NFR-05 | Accessibility NFRs present for UI features | FAIL | Feature has full UI; no WCAG/accessibility SHALL statement |
| BA-NFR-06 | Security NFRs present for sensitive data handling | PASS | Auth guard specified; no sensitive data stored |
| BA-NFR-07 | Unverifiable NFRs flagged in proposal | WARN | Performance target noted in design.md but not in proposal assumptions |
| BA-US-01 | Every user story goal has a SHALL requirement | PASS | Decomposition goals all covered (search, select, policy badge) |
| BA-US-02 | Every acceptance criterion has a scenario | WARN | No formal AC list in source; scenarios inferred from decomposition — debounce AC absent |
| BA-US-03 | Scenarios written from actor/observable-outcome perspective | WARN | Several THEN clauses name internal React/Redux symbols |
| BA-US-04 | User roles explicit in GIVEN preconditions | WARN | "Employee" role not stated in GIVEN clauses; implied by PrivateRoute |
| BA-US-05 | Multi-AC user stories have separate scenarios | PASS | |
| BA-BR-01 | Every business rule has a SHALL statement | FAIL | Filter/sort business rule (applying `sortBy`/`maxPrice` to displayed results) implied by slice state but not specified |
| BA-BR-02 | Every validation rule has an invalid-input scenario | WARN | Adults min/max boundary (0, >9) not tested; past departure date not tested |
| BA-BR-03 | State machine transitions fully specified | PASS | Policy badge state (loading → COMPLIANT/EXCEEDS-POLICY) specified; SearchPage mount reset specified |
| BA-BR-04 | Boundary values tested in scenarios | WARN | Adults = 1 (min) and adults = 9 (max) boundary scenarios absent; airport typeahead boundary at exactly 2 chars absent |
| BA-BR-05 | Interacting business rules covered by combined scenario | WARN | No scenario: policy badge when policy API fails → UNKNOWN state mentioned in design.md but not in spec |
| BA-BR-06 | Authorization rules have rejection scenarios | PASS | Unauthenticated redirect scenario present |
| BA-BR-07 | Client-side-only validation rules flagged as risk | WARN | Adults range and date validation are client-only; not flagged in proposal |
| BA-SC-01 | Every in-scope item in proposal has a SHALL in spec | WARN | `useFlightSearch` hook is in proposal but has no dedicated spec requirement |
| BA-SC-02 | Spec contains no out-of-scope SHALLs | PASS | |
| BA-SC-03 | proposal.md scope matches decomposition SM-FE-03 | WARN | Decomposition says "debounced auto-refresh"; proposal/design resolve to explicit form submit only — undocumented narrowing |
| BA-SC-04 | "Out of Scope" names ambiguous close-calls | PASS | Multi-city, seat-map, payment explicitly excluded |
| BA-SC-05 | Open questions resolved or escalated | WARN | "Policy badge at search vs. booking confirmation" was open in decomposition; resolved in design.md but not formally closed in proposal |
| BA-SC-06 | Intentional scope narrowing documented | WARN | "Debounced auto-refresh → explicit submit only" narrowing not documented in proposal |
| BA-EP-01 | Existing behaviors touched have MODIFIED requirement | PASS | `rootReducer.ts` change has MODIFIED requirement |
| BA-EP-02 | Out-of-scope but affected features listed in proposal | PASS | `AppRoutes.tsx` noted in Impact |
| BA-EP-03 | No silent re-implementation with changed semantics | PASS | |
| BA-EP-04 | Shared contract modifications noted | PASS | |
| BA-EP-05 | Known regressions documented | PASS | No regressions expected |
| BA-LA-01 | SHALLs avoid implementation-specific language | WARN | Spec uses RTK Query symbols, Redux action names in SHALL text |
| BA-LA-02 | Scenarios from actor/observable perspective | WARN | THEN clauses mix observable outcomes with internal dispatch calls |
| BA-LA-03 | Domain terms consistent | PASS | COMPLIANT/EXCEEDS-POLICY/FlightOffer used consistently |
| BA-LA-04 | Acronyms self-evident or in GLOSSARY | PASS | IATA, RTK explained contextually |
| BA-LA-05 | proposal.md Intent readable by non-engineer | PASS | Why section is clear |
| BA-AC-01 | Every in-scope FR has a business-verifiable AC | WARN | tasks.md tasks are implementation-coding tasks; no user-observable AC phrasing |
| BA-AC-02 | ACs reference scenario names | WARN | Test descriptions match spec scenario names loosely but not explicitly linked |
| BA-AC-03 | ACs describe observable user outcomes | WARN | Most task descriptions describe file creation, not user-observable outcomes |
| BA-AC-04 | ACs sufficient for UAT session | WARN | UAT could not be driven from tasks.md alone without the spec |

---

## Requirements Traceability Matrix

| ID | Requirement (source: decomposition §SM-FE-03) | Coverage | Notes |
|---|---|---|---|
| FR-01 | SearchForm: origin, destination, departure/return dates, passenger count | ✅ Fully | Requirement: SearchForm collects flight search parameters |
| FR-02 | FlightResults: list of flight offers | ✅ Fully | Requirement: FlightResults renders offer list |
| FR-03 | FlightCard: price, duration, stops, "Select" CTA | ✅ Fully | Requirement: FlightCard displays offer details and policy badge |
| FR-04 | SearchPage orchestrating form + results | ✅ Fully | Requirement: SearchPage orchestrates search flow at /search |
| FR-05 | searchSlice: filter/sort state (sortBy, maxPrice) | ⚠️ Partial | Slice state defined; **no requirement/scenario for applying sortBy or maxPrice to displayed results** |
| FR-06 | flightApi: RTK Query lazy query for `GET /inventory/flights/search` | ✅ Fully | Requirement: flightApi exposes lazy search and airport typeahead endpoints |
| FR-07 | Policy compliance badge on FlightCard | ✅ Fully | Requirement: FlightCard displays offer details and policy badge |
| FR-08 | useFlightSearch hook with 400 ms debounce | ⚠️ Partial | Debounce mentioned in SearchForm requirement; hook has no dedicated spec requirement |
| FR-09 | selectedOffer selector consumed by SM-FE-04 | ✅ Fully | Requirement: searchSlice manages filter/sort state and selected offer |
| FR-10 | keepUnusedDataFor: 300 (5 min cache) | ✅ Fully | Requirement: flightApi exposes lazy search and airport typeahead endpoints |
| FR-11 | **Sort/filter applied to displayed results UI** | ❌ Missing | State exists; no SHALL for "results SHALL be sorted by `sortBy`" or "results SHALL exclude offers above `maxPrice`" |
| NFR-01 | ADR-008: p95 < 500ms (decomposition §SM-FE-03 Key Requirements) | ❌ Missing | Not in spec as a measurable SHALL |
| NFR-02 | Authenticated-only route (PrivateRoute) | ✅ Fully | Requirement: SearchPage — unauthenticated redirect scenario |
| NFR-03 | 80% test coverage target (AGENTS.md §10) | ⚠️ Partial | In design.md goal; not as SHALL in spec |
| NFR-04 | WCAG accessibility for search UI | ❌ Missing | No accessibility requirement for form fields, results list, or cards |

**Coverage**: 9/14 fully covered, 3 partial, 3 missing.

---

## Existing Feature Parity

| Existing Behaviour | Status | Notes |
|---|---|---|
| `rootReducer.ts` — auth + api + notifications slices | ✅ Preserved | MODIFIED requirement confirms additive-only change |
| `AppRoutes.tsx` — existing /login and * routes | ✅ Preserved | New /search route only; no modification to existing routes noted |
| `PrivateRoute` guard behaviour | ✅ Preserved | SearchPage uses existing PrivateRoute unchanged |
| `baseApi` injection pattern | ✅ Preserved | flightApi and policyApi inject into existing baseApi |

---

## Scope Alignment

- **Scope Creep** (in spec, outside decomposition scope): None
- **Scope Gaps** (in decomposition scope, missing from spec):
  - Filter/sort applied to displayed results (sortBy, maxPrice) — state defined, behavior unspecified
  - "Debounced auto-refresh" described in decomposition not addressed (design deliberately narrows to explicit-submit; not documented in proposal as a narrowing decision)

---

## Business Rules & Edge Cases

| Rule / Edge Case | In Spec? | Notes |
|---|---|---|
| Adults passenger count 1–9 (min/max) | ⚠️ Partial | Range stated in requirement text; no boundary scenario (adults = 0, adults = 10) |
| Cabin class must be one of 4 enum values | ⚠️ Partial | Enum listed; no invalid-value rejection scenario |
| Return date optional (one-way) | ✅ Yes | Scenario present |
| Airport typeahead requires ≥2 chars | ✅ Yes | Scenarios for 1-char skip and 2-char trigger present |
| selectedOffer cleared on SearchPage mount | ✅ Yes | Scenario present |
| Sort results by price or duration | ❌ Missing | Slice action defined; no scenario for observable sort behavior |
| Filter results by maxPrice | ❌ Missing | Slice action defined; no scenario for observable filter behavior |
| Policy API failure → UNKNOWN badge | ❌ Missing | Mentioned in design.md Decisions §3 but absent from spec |
| Departure date in the past | ❌ Missing | No validation rule or scenario |

---

## Stakeholder Language

1. **BA-LA-01 / BA-LA-02**: Several THEN clauses mix observable outcomes with internal implementation symbols. Examples:
   - "THEN `useLazySearchFlightsQuery` SHALL be triggered" → should read "THEN the system SHALL submit a flight search request to the Inventory Service"
   - "THEN `searchSlice.setSelectedOffer` SHALL be dispatched" → should read "THEN the selected flight offer SHALL be stored for the booking flow"
   - "THEN `useSearchAirportsQuery` SHALL be called" → should read "THEN matching airports SHALL be fetched and displayed"
2. **BA-US-04**: GIVEN preconditions do not identify the actor role (Employee). Scenarios assume authentication is implicit from the PrivateRoute — acceptable for technical review but a gap for UAT walkthroughs.

---

## Summary

The spec covers the core flight search happy path well: form submission, results display, flight card details, policy badge, offer selection, and Redux state lifecycle. 9 of 14 requirements are fully covered. However, the spec has three BLOCKER gaps that prevent a PASS verdict:

1. **Filter/sort results behavior is completely unspecified.** The `searchSlice` defines `sortBy` and `maxPrice` state and actions, but no requirement or scenario describes how those values affect the displayed results list. An implementer could reasonably ship a sort toggle that does nothing observable — and pass all currently-specified tests.
2. **The p95 < 500ms performance NFR** is explicitly cited in the decomposition as a Key Requirement (ADR-008) but is absent from the spec. This is not an aspirational goal — it is a contractual target the search feature must meet.
3. **No WCAG/accessibility requirement** is present for what is a form-heavy, interactive UI feature. The project's AGENTS.md §12 and ADR-005 imply compliance obligations for all user-facing UI.

Additionally, three business rules (policy API failure → UNKNOWN state, past departure date validation, filter/sort observable behavior) are missing from the spec but will need to be handled at implementation time. The spec should capture these explicitly.

---

## Required Fixes

1. **[FR-11 / BA-FR-01]** Add a "Results sorted and filtered by user preferences" requirement to spec with scenarios: (a) WHEN `sortBy = 'price'` THEN results SHALL appear sorted by price ascending; (b) WHEN `sortBy = 'duration'` THEN results SHALL appear sorted by total duration ascending; (c) WHEN `maxPrice` is set THEN results exceeding that price SHALL be excluded from the displayed list.
2. **[NFR-01 / BA-NFR-01]** Add a performance requirement: "The system SHALL display initial search results within p95 500ms of form submission under normal load conditions (RTK Query cache TTL: 300s)."
3. **[NFR-04 / BA-NFR-05]** Add an accessibility requirement: "All interactive form elements SHALL have accessible labels (aria-label or associated `<label>`) conforming to WCAG 2.1 AA."
4. **[BA-BR-05]** Add a scenario to FlightCard: WHEN policy API returns an error THEN the badge SHALL display an UNKNOWN/UNAVAILABLE state (not a blank).
5. **[BA-BR-02 / BA-BR-04]** Add boundary scenarios to SearchForm: (a) adults = 0 → validation error; (b) departure date in the past → validation error.
6. **[BA-SC-06 / BA-SC-05]** Document in `proposal.md` the explicit decision to use form-submit (not debounced auto-refresh) as the trigger model, with the rationale from design.md Decision §1.

## Suggestions (non-blocking)

- Rewrite THEN clauses to describe observable outcomes rather than internal symbols — improves UAT readability and spec longevity.
- Add a GIVEN precondition ("GIVEN an authenticated Employee") to all SearchPage and FlightCard scenarios so role context is explicit for UAT testers.
- Add a scenario: WHEN user navigates back to `/search` after selecting an offer THEN `FlightResults` SHALL show the previous results (not a blank page), so that the `clearSelectedOffer` on mount behaviour does not inadvertently clear the results list too.

---

*Hand this report to `architect-reviewer` along with the original requirement documents, ADRs, and the change folder.*
