---
name: feature-decomposer
description: >
  Analyzes one or more feature requirement documents and decomposes them into
  independently implementable sub-modules, each with a clear scope and
  dependency map. Use whenever you have a PRD, feature doc, or requirements
  doc and need to plan parallel or sequential spec-driven implementation via
  OpenSpec. Trigger phrases: "decompose this feature", "break down
  requirements", "split into modules", "plan sub-modules".
version: "1.0"
license: MIT
---

# Feature Decomposer

Reads one or more requirement documents and produces a structured sub-module
breakdown that feeds directly into the `spec-generator` skill. Each sub-module
is scoped so that an OpenSpec change can be created and executed independently,
with minimal cross-module coupling during implementation.

---

## Inputs

- One or more requirement documents (PRDs, feature specs, architecture notes,
  user stories).
- Optional: existing `openspec/specs/` source-of-truth files for brownfield
  context.

---

## Workflow

1. **Ingest & understand.** Read all documents. Note:
    - Primary goal of the feature in one sentence.
    - Distinct functional areas (UI, API, data, auth, notifications,
      background jobs, etc.).
    - Explicit or implied dependencies between areas.
    - NFRs (performance, security, accessibility) that cut across areas.

2. **Identify sub-module candidates.** A good sub-module has:
    - A single well-defined **domain boundary** (maps to one OpenSpec
      spec domain, e.g., `user-auth`, `payment-flow`).
    - An independently testable **surface** (API endpoint, UI component,
      background worker).
    - Interfaces with other modules via **explicit contracts** (types, API
      schemas, events) — not shared mutable state.
    - Realistic scope: one OpenSpec change cycle, with any cross-module
      dependency made explicit and sequenced.

    Aim for **3–8 sub-modules** per feature. "and" in a scope description
    is a signal to split further.

3. **Map dependencies.** For each sub-module list prerequisites and shared
   contracts (types, API schemas, events, DB tables). Represent as an
   ordered list or a text DAG; dependencies must be acyclic.

4. **Produce the decomposition output** (below). Use the exact structure
   so `spec-generator` can consume it without ambiguity.

5. **Persist to `docs/decomposition/`.**
    - Derive a kebab-case filename from the feature name
      (e.g., `user-authentication.md`).
    - Create `docs/decomposition/` if it does not already exist.
    - Write the full decomposition output (see *Output format* below) to
      `docs/decomposition/<feature-name>.md`.
    - If a file with that name already exists, append a numeric suffix
      (`-2`, `-3`, …) rather than overwriting it.
    - Confirm the path to the user once the file is written.

---

## Output format

```markdown
# Feature Decomposition: <Feature Name>

## Summary
<One paragraph on the feature and what this decomposition covers.>

## Source Documents
<List of documents analyzed.>

## Sub-Modules

### [SM-01] <Sub-Module Name>
**OpenSpec Domain**: `<suggested-domain-slug>`
**Scope**: <1–3 sentences describing exactly what this module covers.>
**Key Requirements Addressed**:
- <Requirement or user story excerpt from source doc>
**Contracts / Interfaces**: <Types, endpoints, events, or DB tables this
module defines or depends on.>
**Prerequisites**: None | [SM-NN], [SM-NN]
**Implementation Notes**: <Caveats, tech choices, risks.>

### [SM-02] ...

## Dependency Order (Suggested Implementation Sequence)

Wave 1 (no prerequisites): SM-01, SM-02
Wave 2 (depends on Wave 1): SM-03, SM-04
Wave 3 (depends on Wave 2): SM-05

## Cross-Cutting Concerns
<NFRs, shared utilities, or topics that appear in multiple sub-modules and
should be referenced in each spec (auth middleware, error-handling
conventions, logging standards).>

## Recommended Next Step
Run the `spec-generator` skill, passing this decomposition and the original
requirement documents. Start with Wave 1 sub-modules.
```

---

## Quality checks before outputting

- Every requirement in the source docs maps to at least one sub-module.
- No sub-module duplicates another.
- Dependencies are acyclic.
- Each sub-module can be described in a single paragraph.
- `docs/decomposition/<feature-name>.md` has been created and contains
  the complete output (summary, sub-modules, dependency waves,
  cross-cutting concerns).

---

## Handoff

> "Use the `spec-generator` skill with this decomposition and the original
> requirement documents to create an OpenSpec change per sub-module. Start
> with the Wave 1 modules to unblock downstream work."
