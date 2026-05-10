# Skills Catalog

The following OpenCode skills are installed in this project and must be
used for their designated tasks. Do not improvise these workflows — use
the skills.

| Skill | When to use |
|---|---|
| `feature-decomposer` | Received requirement docs; need to plan sub-modules. |
| `spec-generator` | Have a sub-module entry; need to produce OpenSpec artifacts. |
| `ba-reviewer` | Spec generated; reviewing requirements coverage. |
| `architect-reviewer` | After `ba-reviewer`; reviewing architectural alignment. |
| `qa-reviewer` | After `architect-reviewer`; reviewing testability. |
| `dev-reviewer` | After `qa-reviewer`; reviewing implementation feasibility. |
| `review-synthesizer` | All four reviewers done; producing final verdict. |

Invoke skills by name when the task matches. Do not attempt to replicate
skill logic inline.

The reviewer council (`ba-reviewer` → `architect-reviewer` → `qa-reviewer`
→ `dev-reviewer` → `review-synthesizer`) must run **sequentially in the
same session**, with context cleared between reviewers. See
`agents/context-hygiene.md`.
