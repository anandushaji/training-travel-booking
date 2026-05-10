# Acceptance Criteria — Executable Verification Policy

## The rule

**Every Acceptance Criterion (AC) defined in any `spec.md` MUST have at
least one executable verification artifact.**

This rule applies to ACs in both source-of-truth specs
(`openspec/specs/<domain>/spec.md`) and delta specs
(`openspec/changes/<change-slug>/specs/<domain>/spec.md`).

## Allowed verification artifacts

An AC's verification artifact MAY be any of:

- **Unit tests** — for ACs whose `THEN` clause is observable in pure
  logic or a single in-process component.
- **Integration tests** — for ACs whose `THEN` clause spans the service
  boundary to a DB, cache, broker, or another in-process module.
- **Contract tests** — for ACs whose `THEN` clause is the shape or
  semantics of an API response or a published event.
- **Property-based tests** — for ACs whose `THEN` clause is a universal
  invariant over a range of inputs.

Pick the narrowest layer that can still observe the `THEN` clause. See
`../standards/coding-standards.md` ("Testing") for layer-selection
guidance.

## What counts as "satisfied"

An AC is **satisfied** only if its verification artifact meets **both**:

1. **Is automatically executable** — it runs as part of the project's
   standard test command (`PROJECT.md` section 10: "Run all tests") with
   no manual steps beyond the documented environment setup.
2. **Fails when the AC's `THEN` clause is violated** — if you break the
   implementation so the `THEN` no longer holds, the artifact must
   fail. A test that still passes after the `THEN` is broken does not
   satisfy the AC, no matter how many assertions it contains.

An AC without a failing-on-violation artifact is **not satisfied**,
however many passing tests exist nearby.

## Enforcement

- **`spec-generator`** must, for every AC it emits, either name the
  verification artifact in the companion `tasks.md` or flag the AC as
  "needs verification task" (never leave an AC without a paired
  verification task).
- **`qa-reviewer`** must FAIL any spec where an AC lacks a mapped
  verification artifact, or where the artifact is not
  automatically executable.
- **`dev-reviewer`** must FAIL any `tasks.md` whose implementation
  tasks are not matched by verification tasks that would fail on
  violation.
- **`/opsx:apply`** must not mark a task complete while its AC's
  verification artifact is missing or passes on a broken
  implementation.
- **`/opsx:archive`** must refuse to archive a change that contains
  unsatisfied ACs.

## Authoring guidance

- Name the test case after the AC's `GIVEN / WHEN / THEN` — e.g.
  `given_insufficient_balance_when_withdraw_then_rejected`.
- The verification artifact exercises the AC **exactly** — no broader
  (do not smuggle in extra invariants), no narrower (do not skip the
  `THEN`).
- In `tasks.md`, pair every functional task with a verification task
  that references (a) the AC ID or scenario title and (b) the test
  file path.
- Do not mock what you own when the AC requires real behaviour from
  your own DB, cache, or broker — those cases call for integration or
  contract tests, not unit tests with mocks.
