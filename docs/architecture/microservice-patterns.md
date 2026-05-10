# Microservice Architecture Patterns

This project is a microservice system. The principles below are
non-negotiable unless an ADR explicitly overrides them. `PROJECT.md`
specifies which services exist and what infrastructure is available.

## Service autonomy

- Each service owns its data. No service reads another service's
  database directly.
- Cross-service reads go through an API endpoint or a read model
  (event-driven projection).
- Cross-service writes go through events or a Saga — not synchronous
  chains.

## Pattern defaults

When writing or reviewing specs, apply the following defaults unless
`PROJECT.md` or an ADR states otherwise:

- **Timeouts**: every synchronous outbound call (HTTP, gRPC, DB) must
  have explicit connect and read timeout values.
- **Retries**: apply only to idempotent operations; use exponential
  backoff with jitter; bound by a deadline, not just a count.
- **Idempotency**: any endpoint or consumer that may receive duplicate
  requests (retries, at-least-once delivery, user double-submit) must
  implement an idempotency guard.
- **Outbox**: any service that writes to its DB and publishes an event
  must use the Outbox pattern unless a transactional messaging
  alternative is documented in `PROJECT.md`.
- **Circuit Breaker**: required for synchronous calls to external
  services that could fail slowly. Not required for local DB calls
  (use connection pooling instead).
- **Observability**: every pattern implementation must emit the
  pattern-specific signals listed in the `spec-generator` skill
  (retry count, cache hit/miss, circuit state, outbox lag, saga step
  status).

## Patterns that require an ADR before use

The following patterns must have an existing ADR before
`spec-generator` may apply them. If no ADR exists, stop and ask the
user to create one first:

- **CQRS** (introduces a separate read model and projection mechanism)
- **Saga Orchestration** (introduces a saga orchestrator service or library)
- **Bulkheads** (introduces new thread pool or connection pool configuration)
- **Any new caching infrastructure** not already in `PROJECT.md`

Saga Choreography, Outbox, Circuit Breaker, Retries, Timeouts,
Idempotency, and Cache-aside **do not require a new ADR** if the
infrastructure they depend on is already documented in `PROJECT.md`.

See `architecture/adr-discipline.md` for how to write and govern ADRs.
