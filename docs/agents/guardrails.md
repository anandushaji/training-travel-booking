# Guardrails — What NOT to Do, and When to Escalate

## What NOT to do

- **Do not write code before a spec exists** for the change (outside the
  exceptions in `workflow/sdd-pipeline.md`).
- **Do not archive a change** that has not passed the reviewer council.
- **Do not share data stores between services** without an ADR
  explicitly permitting it.
- **Do not invent architectural decisions** not present in `PROJECT.md`
  or an ADR — surface them as open questions.
- **Do not implement tasks out of order** — task ordering in `tasks.md`
  encodes dependency constraints.
- **Do not modify `openspec/specs/` directly** — all changes go through
  the delta spec workflow and are merged only via `/opsx:archive`.
- **Do not use synchronous chains for cross-service writes** — use
  events or Saga.
- **Do not retry non-idempotent operations** without first adding an
  idempotency guard.

## When to escalate

Stop and ask the user before continuing if you encounter any of the
following:

- `PROJECT.md` is missing or incomplete.
- A required ADR does not exist (see
  `architecture/microservice-patterns.md`, "Patterns that require an
  ADR before use").
- A task's acceptance criteria conflict with the spec scenario it
  references.
- A design decision is not covered by any ADR and is significant enough
  to warrant one.
- The reviewer council produces a FAIL verdict and the required fixes
  are ambiguous.
- Two instructions in `AGENTS.md`, `PROJECT.md`, or an ADR directly
  contradict each other.
