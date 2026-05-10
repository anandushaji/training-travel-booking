# OpenSpec Artifacts

## Artifact locations

| Artifact | Location |
|---|---|
| Source-of-truth specs | `openspec/specs/<domain>/spec.md` |
| Active change folders | `openspec/changes/<change-slug>/` |
| Archived changes | `openspec/changes/archive/` |
| Project context | `openspec/project.md` |
| Agent instructions (OpenSpec-generated) | `openspec/AGENTS.md` (do not edit manually) |

## Change folder structure

Every change folder must have all four artifacts before `/opsx:apply`:

```
openspec/changes/<change-slug>/
├── proposal.md     — intent, scope, assumptions, open questions
├── design.md       — Pattern Selection Log + technical design
├── specs/
│   └── <domain>/
│       └── spec.md — delta spec (ADDED / MODIFIED / REMOVED only)
└── tasks.md        — implementation checklist with acceptance criteria
```

## Delta spec rules

- Use only `ADDED`, `MODIFIED`, and `REMOVED` sections — never rewrite
  the entire source-of-truth spec in a delta.
- Every requirement uses `SHALL` (mandatory), `SHOULD` (recommended),
  or `MAY` (optional).
- Every requirement has at least one `GIVEN / WHEN / THEN` scenario.
- Every Acceptance Criterion in those scenarios must be paired with at
  least one executable verification artifact — see
  `acceptance-criteria.md` for the full policy and enforcement rules.
- Do not duplicate requirements that belong to another domain's spec.

## Archive discipline

- Run `openspec validate <change-slug>` before every `/opsx:archive`.
- Do not archive a change that has not passed the full reviewer council
  (`review-synthesizer` verdict: **PASS** or **PASS WITH WARNINGS with no
  P1 blockers**).
- Do not archive a change that still contains unsatisfied ACs — see
  `acceptance-criteria.md`, "Enforcement".
- Do not modify `openspec/specs/` directly — all changes go through the
  delta spec workflow and are merged only via `/opsx:archive`.
