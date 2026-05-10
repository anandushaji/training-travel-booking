# ADR Discipline

## Location and format

- ADRs live in `docs/adr/` or the location specified in `PROJECT.md`.
- ADR filename format: `ADR-NNN-<kebab-case-title>.md`.

## When an ADR is required

An ADR is required **before** introducing any of:

- A new service
- A new data store type
- A new messaging infrastructure
- A new cross-cutting pattern (see `architecture/microservice-patterns.md`,
  "Patterns that require an ADR before use")
- Any deviation from an existing ADR

## Immutability

- ADRs are immutable once accepted.
- To change a decision, create a **new ADR that supersedes** the old one
  and update the old ADR's status to `Superseded by ADR-NNN`.

## Enforcement

When `architect-reviewer` flags an ADR violation, **do not proceed to
`/opsx:apply`** until either:

1. The spec is corrected to match the existing ADR, or
2. A new ADR is written that supersedes the violated one.
