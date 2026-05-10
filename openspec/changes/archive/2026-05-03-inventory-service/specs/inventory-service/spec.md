# Delta Spec: inventory-service — Inventory / Flight Search Service (SM-04)

> **Delta type**: ADDED (new service — no prior spec exists for `inventory-service`)

---

## ADDED Requirements

---

### Requirement: FlightReservation Aggregate

The system SHALL maintain a `FlightReservation` aggregate that enforces the following state machine: `PENDING → CONFIRMED`, `PENDING → CANCELLED`, `CONFIRMED → CANCELLED`, `PENDING → EXPIRED`. No other transitions are permitted.

#### Scenario: Happy path — create reservation transitions to PENDING
- GIVEN a valid `offerId`, `passengerId`, and `cabinClass`
- WHEN `FlightReservation.create(props)` is called
- THEN a new `FlightReservation` is created with `status = PENDING`
- AND `expiresAt` equals `createdAt + RESERVATION_HOLD_MINUTES` (15 min)
- AND a `FlightReserved` domain event is added to the aggregate's uncommitted events

#### Scenario: Invalid state transition — cancel an EXPIRED reservation
- GIVEN a `FlightReservation` with `status = EXPIRED`
- WHEN `cancel()` is called on the aggregate
- THEN a `DomainException` is thrown with code `INVALID_STATUS_TRANSITION`
- AND the aggregate's status remains `EXPIRED`
- AND no domain event is raised

#### Scenario: Expiry transition — PENDING reservation older than 15 min
- GIVEN a `FlightReservation` with `status = PENDING` and `expiresAt < now()`
- WHEN `expire()` is called on the aggregate
- THEN `status` transitions to `EXPIRED`
- AND a `FlightReservationExpired` domain event is added to uncommitted events

#### Scenario: PENDING → CONFIRMED transition (saga callback)
- GIVEN a `FlightReservation` with `status = PENDING` and `reservationId = R`
- WHEN `confirm()` is called on the aggregate (by the booking-service saga callback)
- THEN `status` transitions to `CONFIRMED`
- AND a `FlightReservationConfirmed` marker event is available (no Kafka event required — status queryable via GET)
- AND no `DomainException` is thrown

#### Scenario: CONFIRMED → CANCELLED transition
- GIVEN a `FlightReservation` with `status = CONFIRMED` and `reservationId = R`
- WHEN `DELETE /api/v1/flights/reservations/R` is called
- THEN Amadeus `DELETE /v1/booking/flight-orders/{amadeusOrderId}` is called
- AND `flight_reservations` row is updated to `status = CANCELLED`
- AND `FlightReservationCancelled` is published to topic `inventory-events`
- AND HTTP 204 is returned

---

### Requirement: Flight Search via Amadeus GDS

The system SHALL return available flight offers by calling the Amadeus REST API `GET /v2/shopping/flight-offers` with the provided search parameters.

#### Scenario: Happy path — successful flight search with cache miss
- GIVEN valid search parameters (`origin=LHR`, `destination=JFK`, `departureDate=2026-07-01`, `passengers=1`)
- AND no entry exists in Redis for `inventory:flight-search:<hash>`
- WHEN `GET /api/v1/flights/search` is called with those parameters
- THEN Amadeus `GET /v2/shopping/flight-offers` is called exactly once
- AND the response contains a list of `FlightOffer` objects with `source: "LIVE"`
- AND the result is stored in Redis under `inventory:flight-search:<hash>` with TTL 300 s
- AND HTTP 200 is returned

#### Scenario: Invalid search parameters — missing required field
- GIVEN the request omits `destination`
- WHEN `GET /api/v1/flights/search` is called
- THEN HTTP 400 is returned with `error: "ValidationError"` and `details` listing the missing field
- AND no Amadeus API call is made

---

### Requirement: Flight Search Cache (Cache-aside)   [Cache-aside]

The system SHALL serve flight search results from Redis when a valid cached entry exists, and SHALL fall back to calling Amadeus and populating the cache when the entry is absent or expired.

#### Scenario: Cache hit — return cached results
- GIVEN a Redis entry exists for `inventory:flight-search:<hash(LHR+JFK+2026-07-01+1+ECONOMY)>`
- WHEN `GET /api/v1/flights/search` is called with those parameters
- THEN no Amadeus API call is made
- AND the response contains `source: "CACHE"` and `meta.cachedAt` with a non-null ISO 8601 timestamp
- AND `cache_hit_total{cache="flight-search"}` is incremented by 1

#### Scenario: Cache miss — call Amadeus and populate cache
- GIVEN no Redis entry exists for the search hash
- WHEN `GET /api/v1/flights/search` is called
- THEN Amadeus is called once and the result is written to Redis with TTL 300 s
- AND `cache_miss_total{cache="flight-search"}` is incremented by 1
- AND subsequent identical requests within 300 s are served from cache

#### Scenario: Redis unavailable — degrade gracefully
- GIVEN Redis is unreachable
- WHEN `GET /api/v1/flights/search` is called
- THEN Amadeus is called directly (cache bypassed)
- AND the response is returned normally (HTTP 200) without caching
- AND a `warn` log line `redis_unavailable` is emitted
- AND no unhandled exception is propagated to the caller

---

### Requirement: Amadeus HTTP Client Resilience   [Timeouts, Retries, Circuit Breaker]

The system SHALL protect all Amadeus REST API calls with explicit timeouts, retry logic, and a circuit breaker.

#### Scenario: Amadeus transient failure — retry succeeds on second attempt
- GIVEN Amadeus returns HTTP 503 on the first attempt
- AND HTTP 200 on the second attempt
- WHEN a flight search is performed
- THEN the use case returns the successful result to the caller
- AND `retry_count{operation="amadeus_search", outcome="success"}` is incremented by 1
- AND `amadeus_api_calls_total` reflects 2 attempts

#### Scenario: Amadeus non-retryable error — immediate failure
- GIVEN Amadeus returns HTTP 404
- WHEN a reservation creation is attempted with an invalid `offerId`
- THEN no retry is performed
- AND HTTP 404 is returned to the caller immediately
- AND `amadeus_api_errors_total{error_type="client_error"}` is incremented

#### Scenario: All Amadeus retries exhausted — error returned to caller
- GIVEN Amadeus returns HTTP 503 on all 3 retry attempts (4 total calls) within a single request
- WHEN a flight search is performed
- THEN no successful Amadeus response is returned
- AND HTTP 503 is returned to the caller with `error: "AmadeusUnavailable"`
- AND `retry_count{operation="amadeus_search", outcome="exhausted"}` is incremented by 3
- AND `amadeus_api_errors_total{error_type="retry_exhausted"}` is incremented by 1

#### Scenario: Circuit breaker opens after threshold failures
- GIVEN 10 consecutive Amadeus calls have failed with 503 within 30 s (≥ 50% error rate)
- WHEN the 11th Amadeus call is attempted
- THEN the circuit breaker is OPEN and `AmadeusUnavailableException` is thrown immediately (no HTTP call made)
- AND HTTP 503 is returned to the caller with message `"Flight search temporarily unavailable"`
- AND `circuit_state{service="amadeus"}` gauge reads 1 (open)

#### Scenario: Circuit breaker half-open — probe succeeds and closes circuit
- GIVEN the circuit is OPEN and 30 s have elapsed
- WHEN a single Amadeus call succeeds in the half-open state
- THEN the circuit transitions to CLOSED
- AND `circuit_state{service="amadeus"}` gauge reads 0 (closed)
- AND subsequent requests are sent to Amadeus normally

#### Scenario: Amadeus call exceeds read timeout
- GIVEN the Amadeus API does not respond within 15 s
- WHEN a flight search is performed
- THEN the connection is aborted after 15 s
- AND the timeout counts as a retryable failure (retry logic applies)
- AND `amadeus_api_errors_total{error_type="timeout"}` is incremented

---

### Requirement: Amadeus OAuth2 Token Management

The system SHALL obtain and cache Amadeus OAuth2 access tokens using the `client_credentials` grant, and SHALL automatically refresh the token before it expires.

#### Scenario: Happy path — token cached and reused
- GIVEN a valid token exists in memory with `expiresAt > now() + 60 s`
- WHEN `AmadeusTokenService.getToken()` is called
- THEN the cached token is returned immediately
- AND no HTTP call to the Amadeus token endpoint is made

#### Scenario: Token expiry — refresh before use
- GIVEN the cached token's `expiresAt` is within 60 s of now
- WHEN `AmadeusTokenService.getToken()` is called
- THEN a `POST /v1/security/oauth2/token` request is made to Amadeus
- AND the new token replaces the cached token
- AND the new token is returned to the caller

---

### Requirement: Reservation Creation with Seat Hold

The system SHALL create a flight reservation by calling the Amadeus orders API, persisting the `FlightReservation` aggregate, publishing a `FlightReserved` Kafka event, and returning a `ReservationResponse` with status `PENDING` and a 15-minute `expiresAt`.

#### Scenario: Happy path — reservation created successfully
- GIVEN a valid `offerId`, `passengerId`, `cabinClass`, and unique `Idempotency-Key`
- WHEN `POST /api/v1/flights/reservations` is called
- THEN Amadeus `POST /v1/booking/flight-orders` is called once
- AND a `flight_reservations` row is inserted with `status = PENDING`
- AND a `FlightReserved` event is published to topic `inventory-events`
- AND HTTP 201 is returned with `status: "PENDING"` and `expiresAt = now() + 15 min`

#### Scenario: Amadeus order fails — no DB insert and no Kafka event
- GIVEN Amadeus `POST /v1/booking/flight-orders` returns HTTP 422 (e.g., offer expired)
- WHEN `POST /api/v1/flights/reservations` is called
- THEN no row is inserted into `flight_reservations`
- AND no Kafka event is published
- AND HTTP 422 is returned to the caller with the Amadeus error detail

---

### Requirement: Idempotent Reservation Creation   [Idempotency]

The system SHALL process a duplicate `POST /flights/reservations` request carrying the same `Idempotency-Key` without re-executing the Amadeus call, DB insert, or Kafka publish, and SHALL return the original response.

#### Scenario: Duplicate within TTL — return cached response
- GIVEN `POST /api/v1/flights/reservations` succeeded with `Idempotency-Key: K`
- AND the key `inventory:idempotency:K` exists in Redis (TTL 24 h)
- WHEN the same request is sent again with `Idempotency-Key: K`
- THEN HTTP 200 is returned with the original `ReservationResponse`
- AND no Amadeus API call is made
- AND no additional row is inserted in `flight_reservations`
- AND no additional Kafka event is published

#### Scenario: Idempotency key expired — treated as new request
- GIVEN the Redis key `inventory:idempotency:K` has elapsed (TTL expired)
- WHEN `POST /api/v1/flights/reservations` is sent with the same key K
- THEN the full business logic executes (Amadeus call → DB insert → Kafka publish)
- AND HTTP 201 is returned

#### Scenario: Missing Idempotency-Key header — rejected
- GIVEN the `Idempotency-Key` header is absent from the request
- WHEN `POST /api/v1/flights/reservations` is called
- THEN HTTP 400 is returned with `error: "ValidationError"` and message `"Idempotency-Key header is required"`

#### Scenario: Concurrent duplicate reservation requests — idempotency race
- GIVEN no idempotency key `K` exists in Redis
- AND two simultaneous `POST /api/v1/flights/reservations` requests arrive with `Idempotency-Key: K` before either has stored the Redis response
- WHEN both execute concurrently
- THEN exactly one Amadeus `POST /v1/booking/flight-orders` call is made
- AND exactly one `flight_reservations` row is inserted for key `K`
- AND the first-to-acquire caller receives HTTP 201
- AND the second caller receives HTTP 409 with `Retry-After: 1`

---

### Requirement: Reservation Query

The system SHALL return the current state of a `FlightReservation` by `reservationId`.

#### Scenario: Happy path — reservation found
- GIVEN a `FlightReservation` with `reservationId = R` exists in `flight_reservations`
- WHEN `GET /api/v1/flights/reservations/R` is called
- THEN HTTP 200 is returned with a `ReservationResponse` matching the stored record

#### Scenario: Reservation not found
- GIVEN no row exists in `flight_reservations` for `reservationId = R`
- WHEN `GET /api/v1/flights/reservations/R` is called
- THEN HTTP 404 is returned with `error: "NotFound"` and `message: "Reservation not found"`

---

### Requirement: Reservation Cancellation

The system SHALL cancel a PENDING or CONFIRMED reservation by calling the Amadeus cancel API, updating the aggregate status to `CANCELLED`, persisting the change, and publishing a `FlightReservationCancelled` Kafka event.

#### Scenario: Happy path — cancel PENDING reservation
- GIVEN a reservation with `status = PENDING` and `reservationId = R`
- WHEN `DELETE /api/v1/flights/reservations/R` is called
- THEN Amadeus `DELETE /v1/booking/flight-orders/{amadeusOrderId}` is called
- AND `flight_reservations` row is updated to `status = CANCELLED`
- AND `FlightReservationCancelled` is published to topic `inventory-events`
- AND HTTP 204 is returned

#### Scenario: Cancel EXPIRED reservation — rejected
- GIVEN a reservation with `status = EXPIRED`
- WHEN `DELETE /api/v1/flights/reservations/R` is called
- THEN HTTP 422 is returned with `error: "InvalidOperation"` and `message: "Cannot cancel an expired reservation"`
- AND no Amadeus API call is made
- AND no Kafka event is published

---

### Requirement: Passport Number Encryption at Rest   [Security — ADR-005]

The system SHALL encrypt the `passportNumber` field using application-level AES-256-CBC encryption before persisting to `flight_reservations.passport_number`, and SHALL decrypt the value when loading the aggregate from the database, using the encryption key stored in the Kubernetes Secret `inventory-service-secrets` under key `PASSPORT_ENCRYPTION_KEY`.

#### Scenario: Passport number encrypted before DB insert
- GIVEN a `CreateReservationUseCase` command includes `passportNumber = "AB1234567"`
- WHEN the `FlightReservation` is persisted to PostgreSQL
- THEN the `passport_number` column contains an AES-256-CBC ciphertext (not the plaintext `"AB1234567"`)
- AND querying `flight_reservations` directly returns a non-plaintext `passport_number` value

#### Scenario: Passport number decrypted on aggregate load
- GIVEN a `FlightReservation` row exists with an encrypted `passport_number`
- WHEN `FlightReservationTypeOrmRepository.findById(id)` is called
- THEN the loaded aggregate's `passenger.passportNumber` equals the original plaintext `"AB1234567"`

---

### Requirement: Reservation Expiry Background Job

The system SHALL automatically mark PENDING reservations as EXPIRED and publish `FlightReservationExpired` Kafka events for all reservations whose `expiresAt < now()`, polling every 60 seconds.

#### Scenario: Happy path — expired reservation marked and event published
- GIVEN a `FlightReservation` with `status = PENDING` and `expiresAt = now() - 1 min`
- WHEN the `ReservationExpiryJob` cron fires
- THEN the row is updated to `status = EXPIRED`
- AND `FlightReservationExpired` is published to topic `inventory-events`
- AND `reservations_expired_total` counter is incremented by 1

#### Scenario: No expired reservations — job is a no-op
- GIVEN all PENDING reservations have `expiresAt > now()`
- WHEN the cron fires
- THEN no DB updates are made
- AND no Kafka events are published
- AND `reservations_expired_total` is not incremented

#### Scenario: Job failure on single item — continues to next
- GIVEN two PENDING expired reservations R1 and R2
- AND publishing the Kafka event for R1 throws an error
- WHEN the cron fires
- THEN R2 is still processed and its event is published
- AND an `error` log line is emitted for R1 with `reservationId` in context

---

### Requirement: Kafka Event Publishing

The system SHALL publish domain events to the correct Kafka topics using the ADR-003 event schema with `eventId`, `eventType`, `aggregateId`, `occurredOn`, `correlationId`, and `causationId` fields.

#### Scenario: Happy path — FlightReserved event published with correct schema
- GIVEN a reservation is created successfully
- WHEN `InventoryEventPublisher.publish(FlightReserved)` is called
- THEN a Kafka message is produced to topic `inventory-events`
- AND the message includes all required ADR-003 fields: `eventId` (UUID v4), `eventType: "FlightReserved"`, `aggregateId` (reservationId), `occurredOn` (ISO 8601), `correlationId`, `causationId`
- AND `kafka_events_published_total{topic="inventory-events", eventType="FlightReserved", status="success"}` is incremented

#### Scenario: Kafka broker unavailable — error logged, no silent swallow
- GIVEN the Kafka broker is unreachable
- WHEN `InventoryEventPublisher.publish()` is called
- THEN an `error` log line is emitted with `kafka_publish_failed` message and topic name
- AND `kafka_events_published_total{topic="inventory-events", status="failure"}` is incremented
- AND the exception is propagated to the use case caller (reservation creation returns 500)

---

### Requirement: Observability Instrumentation

The system SHALL emit all required Prometheus metrics, OpenTelemetry spans, and structured Winston log lines as defined in PROJECT.md §8 and the design.md Observability section.

#### Scenario: Flight search emits HTTP and cache metrics
- GIVEN a `GET /api/v1/flights/search` request completes (cache hit)
- WHEN the response is returned
- THEN `http_requests_total{method="GET", route="/api/v1/flights/search", status_code="200"}` is incremented
- AND `http_request_duration_seconds{method="GET", route="/api/v1/flights/search"}` histogram is updated
- AND `cache_hit_total{cache="flight-search"}` is incremented
- AND an OTel span `GET /api/v1/flights/search` is recorded with `correlationId` attribute

#### Scenario: Amadeus circuit breaker state exposed as gauge
- GIVEN the Amadeus circuit breaker transitions to OPEN
- THEN `circuit_state{service="amadeus"}` reads 1
- GIVEN it transitions to half-open
- THEN `circuit_state{service="amadeus"}` reads 0.5
- GIVEN it transitions to CLOSED
- THEN `circuit_state{service="amadeus"}` reads 0

---

### Requirement: Performance and Availability SLA

The system SHALL conform to the NFR targets defined in PROJECT.md §7–8 and ADR-008.

- The service SHALL respond to `GET /api/v1/flights/search` requests with P95 latency ≤ 500 ms at 1,000 concurrent users under normal operating conditions, leveraging the Redis cache-aside strategy to achieve this target.
- The service SHALL achieve 99.5% uptime measured monthly.
- The service SHALL respond to `POST /api/v1/flights/reservations` with P95 latency ≤ 500 ms at 500 RPS (idempotency cache hit path); Amadeus-bound first requests are exempt from this target.
