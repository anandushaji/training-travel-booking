---
name: resolve-proposals
description: Resolve open questions in openspec change proposals. Reads the proposal.md from an active change, presents each open question to the user, collects their decisions, then updates the proposal (marking questions decided), design.md (incorporating design implications), and tasks.md (adding/modifying/removing tasks based on decisions). Trigger with "/resolve-proposals" or "/resolve-proposals <change-name>".
argument-hint: "<change-folder-name under openspec/changes/ (optional)>"
---

# /resolve-proposals

Resolve open questions in an openspec change proposal and propagate decisions into design and tasks.

## Step 1: Locate the target change

1. List all non-archived change folders under `openspec/changes/` (exclude `openspec/changes/archive/`).
2. If `@$1` is provided, use that as the change folder name. Otherwise:
   - If only one active change exists, use it automatically.
   - If multiple active changes exist, list them and ask the user which one to resolve.
3. Read the `proposal.md` from the selected change folder.

## Step 2: Extract open questions

Parse the `## Open Questions` section from `proposal.md`. Each open question follows this pattern:

```
N. **Question title**: Question text → **Recommendation: ...**
```

or:

```
- Question text
  - **Decision**: Decision text (if already decided)
```

Identify questions that:
- Are NOT already under a `### Resolved` subsection, AND
- Have NO `**Decision**:` line yet, OR have a `**Recommendation:**` but no confirmed `**Decision:**`

Skip any question already prefixed with `✅` or already under `### Resolved`.

If all questions are already resolved, inform the user and exit.

## Step 3: Present questions and collect decisions

For EACH unresolved open question, present it to the user in this format:

```
### Question N: [title/topic]

[Full question text]

Recommendation: [recommendation if one exists]

What is your decision?
```

Wait for the user's response before moving to the next question. Collect all decisions.

## Step 4: Update proposal.md

Restructure the `## Open Questions` section to split resolved and unresolved questions into two subsections:

```markdown
## Open Questions

### Resolved
- ✅ [original question text]
  - **Recommendation**: [original recommendation if any]
  - **Decision**: [user's answer]

### Pending
- [remaining unanswered question text]
  - **Recommendation**: [recommendation if any]
```

Rules for this update:
- Move each answered question under `### Resolved` and prefix it with `✅`
- Leave unanswered questions under `### Pending`
- If ALL questions are now resolved, remove the `### Pending` subsection entirely
- If NO questions existed before, keep the section as-is
- Keep the original question text and recommendation intact on every question
- Add the `**Decision**:` line with the user's confirmed answer beneath the recommendation

Write the updated `proposal.md` back to disk.

## Step 5: Update design.md

Read the `design.md` from the same change folder. Analyze the decisions and determine if any affect:
- Architecture choices (e.g., pattern selection, data flow)
- Interface contracts (e.g., API shapes, hook signatures)
- Caching strategy (e.g., optimistic updates vs. invalidation)
- Error handling approach
- Security considerations

If a decision changes the design, update the relevant section in `design.md`. Add a `## Decision Log` section at the bottom (if not already present) documenting which decisions drove which design changes:

```markdown
## Decision Log

| Question | Decision | Design Impact |
|----------|----------|---------------|
| [question summary] | [decision] | [what changed in design, or "No design impact"] |
```

## Step 6: Update tasks.md

Read the `tasks.md` from the same change folder. Analyze the decisions and determine if any affect:
- Tasks that should be added (new work required by the decision)
- Tasks that should be removed (no longer needed given the decision)
- Tasks whose description or acceptance criteria need updating
- Dependencies between tasks

Apply the necessary changes to `tasks.md`.

## Step 7: Summary

After all updates are complete, print a summary:

```
## Resolved Questions Summary

Change: [change-folder-name]

| # | Question | Decision |
|---|----------|----------|
| 1 | [summary] | [decision] |
| ... | ... | ... |

### Files Updated
- proposal.md - [N] questions resolved
- design.md - [describe changes or "No changes needed"]
- tasks.md - [describe changes or "No changes needed"]
```

## Important Rules

- NEVER change the intent, scope, approach, or assumptions sections of proposal.md
- ONLY modify the Open Questions section in proposal.md
- When updating design.md, preserve all existing content and only add/modify sections affected by the decisions
- When updating tasks.md, preserve task numbering conventions and verification artifact format
- If a decision contradicts an existing assumption, flag it to the user before proceeding
- Read design.md and tasks.md before modifying them to understand existing context
- Use the same formatting style already present in each file
