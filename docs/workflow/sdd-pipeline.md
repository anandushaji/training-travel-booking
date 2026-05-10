# SDD Pipeline

This project uses **Spec-Driven Development (SDD)** via OpenSpec.

## The invariant

**No code is written before a spec exists and has been reviewed.**

Every feature, fix, or refactor of non-trivial scope goes through this
pipeline:

```
feature-decomposer → spec-generator → reviewer council → /opsx:apply → /opsx:archive
```

Do not skip or shortcut this pipeline. If you are asked to implement
something directly without a spec, ask the user to run the appropriate
skill first.

## Exceptions (spec not required)

- Typo fixes and trivial one-liner corrections
- Dependency version bumps with no logic change
- Documentation-only changes

If in doubt, treat it as spec-required.

## Full flow

```
New feature arrived
  → feature-decomposer
  → (if new ADR needed) write ADR first
  → spec-generator (per sub-module, Wave 1 first)
  → ba-reviewer → architect-reviewer → qa-reviewer → dev-reviewer
  → review-synthesizer
  → (fix P1 blockers if any)
  → openspec validate <slug>
  → /opsx:apply
  → /opsx:archive
  → next wave
```

See also:

- `workflow/skills-catalog.md` — which skill to invoke at each step.
- `workflow/openspec-artifacts.md` — the artifacts each step produces.
- `architecture/adr-discipline.md` — when a new ADR is required first.
