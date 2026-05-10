# Coding Standards

These are baseline standards. `PROJECT.md` specifies the exact tech
stack, naming conventions, and project-specific overrides, which take
precedence over this file.

## General

- Write the minimum code needed to satisfy the spec's acceptance
  criteria. Do not add functionality not covered by a spec scenario.
- Prefer explicit over implicit. If behaviour is unclear, surface it as
  a question rather than guessing.
- Every task in `tasks.md` should be implemented and tested before
  moving to the next task. Do not implement all tasks in one pass and
  test at the end.

## Error handling

- Classify errors as **transient** (retriable) or **permanent** (not
  retriable) at the point they are caught.
- Surface meaningful error messages to callers. Do not swallow
  exceptions silently.
- Log errors with enough structured context to diagnose them from logs
  alone (request ID, operation name, input summary, error message,
  stack trace).

## Testing

- Every functional task in `tasks.md` must have a corresponding test
  task — see `../workflow/acceptance-criteria.md` for the full AC
  verification policy (every AC needs an executable artifact that
  fails when the `THEN` clause is violated).
- Test at the appropriate layer: **unit** for logic, **integration**
  for DB/cache/broker interactions, **contract** for API/event schemas,
  **property-based** for universal invariants. Pick the narrowest layer
  that can still observe the AC's `THEN` clause.
- Tests must exercise the acceptance criteria in `tasks.md` exactly —
  not broader, not narrower.
- Do not mock what you own (your own service's DB, cache). Mock only
  external dependencies and third-party services.

## Commits

- One logical change per commit. Do not bundle multiple tasks into one
  commit.
- Commit message format: `<type>(<scope>): <description>`
  where `<type>` is one of: `feat`, `fix`, `refactor`, `test`, `docs`,
  `chore`.
- Reference the change slug in commits that implement OpenSpec tasks:

  ```
  feat(payment-flow): implement outbox relay [add-payment-flow]
  ```
