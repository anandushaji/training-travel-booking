# Reviewer Council — Shared Conventions

The four reviewer skills (`ba-reviewer`, `architect-reviewer`, `qa-reviewer`,
`dev-reviewer`) share the conventions below. Each reviewer's `SKILL.md`
references this file rather than repeating the rules.

`review-synthesizer` consumes the four reports and applies the final verdict
policy in its own `SKILL.md`.

---

## Inputs every reviewer needs

1. **OpenSpec change folder** — `proposal.md`, `design.md`,
   `specs/<domain>/spec.md` (delta spec), `tasks.md`.
2. **Feature decomposition** entry (SM-NN) that produced this change —
   for scope and dependency context.
3. **Reviewer-specific corpus** — listed per role in each skill
   (e.g., ADRs for `architect-reviewer`, requirement docs for `ba-reviewer`).

If the change folder or the reviewer-specific corpus is missing, **stop and
ask the user** before producing a report.

---

## Checklist discipline

Each reviewer's checklist lives at
`.opencode/skills/<role>-reviewer/checklists/<role>-review-checklist.md`
and is the **authoritative source** of what to check. SKILL.md describes how
to apply it; it does not re-enumerate items.

- **Read the checklist in full before examining the change folder.**
- **Evaluate every item** — record PASS, WARN, or FAIL. Do not skip items that
  seem to concern non-applied patterns; mark them PASS with note
  "Not applicable — pattern not applied".
- **Derive the verdict from the Verdict Calculation table** at the bottom of
  the checklist file. Do not override it.
- **If the checklist file is missing**, stop and tell the user before
  proceeding.

---

## Report format

Every reviewer's report starts with a **Checklist Results** section
immediately after the header, using the shared table shape:

```markdown
## Checklist Results

| ID | Severity | Item (abbreviated) | Status | Notes |
|---|---|---|---|---|
| <ID> | BLOCKER / WARNING / INFO | <item> | ✅ PASS / ⚠️ WARN / ❌ FAIL | <notes> |
| ... (every item in the checklist) | | | | |

**BLOCKER summary**: N/N PASS, N WARN, N FAIL
**WARNING summary**: N/N PASS, N WARN, N FAIL
**INFO summary**: N recorded
```

After the checklist table, the reviewer's own report sections follow (role-
specific: traceability matrix for BA, ADR conformance for Architect, etc.).

---

## Verdict vocabulary

All four reviewers use the same three verdicts:

| Verdict | Meaning |
|---|---|
| **PASS** | All BLOCKER items PASS; WARNING items mostly PASS; no unresolved critical gap. |
| **PASS WITH WARNINGS** | All BLOCKER items PASS; one or more WARNING items WARN/FAIL. Documented and proceeding. |
| **FAIL** | At least one BLOCKER item FAIL, or a critical domain-specific issue the reviewer judges blocking. |

Role-specific refinements (e.g., BA coverage percentages, QA's AC-verification
blockers) live in each reviewer's own SKILL.md and override this default.

---

## Handoff order

```
ba-reviewer → architect-reviewer → qa-reviewer → dev-reviewer → review-synthesizer
```

Each reviewer ends its report by naming the next skill to invoke. After
`dev-reviewer`, the user runs `review-synthesizer` with all four reports and
the change folder.
