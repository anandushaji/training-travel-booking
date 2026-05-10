# Context Hygiene

## Session discipline

- Start each OpenSpec skill invocation with a focused context: only the
  files relevant to that skill's inputs. Do not carry over unrelated
  earlier conversation context.
- When running the reviewer council, run reviewers **sequentially in the
  same session**. Clear unneeded tool outputs between reviewers to keep
  the context window focused.

## File-reading discipline

- Read files on a need-to-know basis. Do not preload all specs, all
  ADRs, or the entire codebase at session start.
- When a spec scenario references a domain, read
  `openspec/specs/<domain>/spec.md`.
- When a design references an ADR, read that ADR. Read other ADRs only
  if they are explicitly relevant.
- Always re-read `PROJECT.md` at the start of each new session — do not
  rely on memory of `PROJECT.md` content from a previous session.

## What to do when context is unclear

- If `PROJECT.md` does not answer a question about the project's
  architecture or conventions, ask the user before assuming.
- If two instructions conflict, apply the precedence rule from
  `AGENTS.md` (ADR > `PROJECT.md` > `AGENTS.md` > `docs/`).
- If you are uncertain whether a task requires a spec, ask.
