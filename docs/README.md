# docs/ — Agent Reference Library

This folder holds the detailed rules that back `AGENTS.md`. `AGENTS.md` is
intentionally kept minimal; the full policy lives here, split into small
topical files so the agent can load only what the current task needs.

## Index

| Area | File | Load when… |
|---|---|---|
| SDD pipeline | `workflow/sdd-pipeline.md` | Starting any new feature / fix / refactor; deciding whether a spec is required. |
| Skills catalog | `workflow/skills-catalog.md` | Choosing which skill to invoke for the current step. |
| OpenSpec artifacts | `workflow/openspec-artifacts.md` | Creating/validating a change folder, writing a delta spec, archiving a change. |
| AC verification policy | `workflow/acceptance-criteria.md` | Writing or reviewing ACs; pairing tasks with tests; deciding if an AC is satisfied. |
| Reviewer council conventions | `agents/reviewer-council.md` | Running `ba-reviewer`, `architect-reviewer`, `qa-reviewer`, or `dev-reviewer` — shared inputs, checklist discipline, report format, verdict vocabulary. |
| Microservice patterns | `architecture/microservice-patterns.md` | Writing or reviewing any spec that touches service boundaries, cross-service calls, resilience, or data ownership. |
| ADR discipline | `architecture/adr-discipline.md` | Proposing a new architectural decision, or checking conformance to an existing one. |
| Coding standards | `standards/coding-standards.md` | Implementing tasks, writing tests, or preparing commits. |
| Context hygiene | `agents/context-hygiene.md` | Running multi-step skill chains (e.g. reviewer council) or when session context is getting noisy. |
| Guardrails | `agents/guardrails.md` | Before taking any irreversible action, or when uncertain whether to proceed vs. escalate. |
| ADRs | `adr/` | Project-specific architectural decisions live here. |

## Conventions

- Files are kept small and single-topic so they fit cleanly into context.
- `PROJECT.md` (at the repo root) overrides anything here for project-specific
  details. ADRs override both. See `AGENTS.md` for the full precedence rule.
