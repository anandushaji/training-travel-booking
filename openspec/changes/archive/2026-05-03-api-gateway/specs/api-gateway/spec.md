# Delta Spec: API Gateway Service (SM-02)

**Change ID**: api-gateway  
**Domain**: api-gateway  
**Spec type**: ADDED (new service — all requirements are additive)  
**Date**: 2026-05-02  
**Status**: Proposed

> **Delta convention**: This file contains only ADDED requirements. Because the API Gateway is a new service with no prior spec, every requirement in this file is new.

---

## REQ-01: JWT Authentication

**Description**: The gateway MUST validate a signed HS256 JWT on every inbound request except `GET /health`, `GET /metrics`, `POST /api/v1/auth/login`, and `POST /api/v1/auth/refresh`. Tokens are validated against `JWT_SECRET` from environment; the `JwtPayload` (sub, email, role, exp) is attached to the request context for downstream guards.

**The API Gateway is the sole JWT issuer** (OQ-02). On `POST /api/v1/auth/login`, the gateway forwards credentials to the Traveler Service (`POST /travelers/auth`), receives `userId` + `role`, and signs an HS256 access token (8 h TTL) and a refresh token (7 d TTL). Downstream services share `JWT_SECRET` for validation only and never issue tokens.

**Refresh token rotation** (OQ-01): On `POST /api/v1/auth/refresh`, the gateway validates the incoming refresh token, looks up `gateway:refresh-token:<sha256(token)>` in Redis, deletes that key, signs a new access + refresh token pair, stores the new refresh token hash under a new Redis key (`gateway:refresh-token:<sha256(newToken)>`, TTL 7 d), and returns both tokens. A refresh token that is not present in Redis (already rotated, expired, or never issued) MUST result in 401.

### Scenario REQ-01-S01 — Happy path: valid token grants access

```
GIVEN a client holds a valid, unexpired JWT signed with JWT_SECRET
  AND the JWT payload contains { sub: "user-1", email: "alice@corp.com", role: "EMPLOYEE" }
WHEN the client sends GET /api/v1/bookings with Authorization: Bearer <token>
THEN the gateway forwards the request to booking-service
  AND the response status is whatever booking-service returns (not 401 or 403)
  AND the outbound request to booking-service contains the X-Correlation-ID header
```

### Scenario REQ-01-S02 — Failure path: missing token returns 401

```
GIVEN a client sends a request to any protected route
  AND the Authorization header is absent
WHEN the JwtAuthGuard processes the request
THEN the gateway returns 401 Unauthorized
  AND the response body matches the standard error schema
     { "error": "Unauthorized", "message": "...", "correlationId": "<uuid>", "timestamp": "<ISO>" }
  AND the request is NOT forwarded to any downstream service
```

### Scenario REQ-01-S03 — Failure path: expired token returns 401

```
GIVEN a client holds a JWT whose exp claim is in the past
WHEN the client sends any protected request with that token
THEN the gateway returns 401 Unauthorized
  AND the response body contains "error": "Unauthorized"
  AND no downstream call is made
```

### Scenario REQ-01-S04 — Happy path: login issues access + refresh token pair (OQ-02)

```
GIVEN a client POSTs valid credentials to POST /api/v1/auth/login
  AND the Traveler Service returns { userId: "user-1", email: "alice@corp.com", role: "EMPLOYEE" }
WHEN AuthService.login() executes
THEN the gateway returns 200 with { accessToken, refreshToken, expiresIn: 28800 }
  AND accessToken is a valid HS256 JWT signed with JWT_SECRET, exp = now + 8h
  AND refreshToken is a valid HS256 JWT signed with JWT_SECRET, exp = now + 7d
  AND Redis key gateway:refresh-token:<sha256(refreshToken)> is set with TTL 604800s and value userId
  AND the Traveler Service is the only downstream service called during login
```

### Scenario REQ-01-S05 — Happy path: refresh rotates token pair (OQ-01)

```
GIVEN a client holds a valid refreshToken previously issued by the gateway
  AND Redis key gateway:refresh-token:<sha256(refreshToken)> exists with value "user-1"
WHEN the client POSTs { refreshToken } to POST /api/v1/auth/refresh
THEN the gateway returns 200 with { accessToken, refreshToken, expiresIn: 28800 }
  AND the OLD Redis key gateway:refresh-token:<sha256(oldRefreshToken)> is deleted
  AND a NEW Redis key gateway:refresh-token:<sha256(newRefreshToken)> is set with TTL 604800s
  AND the old refreshToken is no longer accepted on a subsequent POST /api/v1/auth/refresh (returns 401)
```

### Scenario REQ-01-S06 — Failure path: reuse of rotated refresh token returns 401 (OQ-01)

```
GIVEN a refresh token was already consumed once and its Redis key deleted
WHEN a client attempts POST /api/v1/auth/refresh with the old refresh token
THEN the gateway returns 401 Unauthorized
  AND the response body contains "error": "Unauthorized"
```

### Scenario REQ-01-S07 — Validation: login with missing email field returns 400

```
GIVEN a client sends POST /api/v1/auth/login with a body that is missing the email field
  AND the password field is present
WHEN the ValidationPipe processes the request body
THEN the gateway returns 400 Bad Request without forwarding to Traveler Service
  AND the response body matches the standard error schema
     { "error": "BadRequest", "message": [...validation errors...], "correlationId": "<uuid>", "timestamp": "<ISO>" }
```

### Scenario REQ-01-S08 — Validation: login with missing password field returns 400

```
GIVEN a client sends POST /api/v1/auth/login with a body that is missing the password field
  AND the email field is present
WHEN the ValidationPipe processes the request body
THEN the gateway returns 400 Bad Request without forwarding to Traveler Service
  AND the response body matches the standard error schema
```

### Scenario REQ-01-S09 — Validation: refresh with missing refreshToken field returns 400

```
GIVEN a client sends POST /api/v1/auth/refresh with an empty or missing refreshToken field
WHEN the ValidationPipe processes the request body
THEN the gateway returns 400 Bad Request
  AND the response body matches the standard error schema
  AND no Redis lookup is performed
```

### Scenario REQ-01-S10 — Redis unavailability during refresh returns 503

```
GIVEN the Redis instance is unreachable when POST /api/v1/auth/refresh is called
  AND the refresh token is structurally valid (passes jwt.verify())
WHEN AuthService.lookupRefreshToken() throws a connection error
THEN the gateway returns 503 Service Unavailable with Retry-After: 5
  AND a log line at warn level is emitted: "Refresh token store unavailable"
  AND no new tokens are issued
```

### Scenario REQ-01-S11 — Traveler Service transient failure during login returns 502

```
GIVEN a client POSTs valid credentials to POST /api/v1/auth/login
  AND the Traveler Service returns 503 on all 4 attempts (initial + 3 retries)
WHEN AuthService.login() calls ProxyHttpClient → POST /travelers/auth
THEN the gateway returns 502 Bad Gateway to the client
  AND the response body matches the standard error schema
     { "error": "BadGateway", "message": "...", "correlationId": "<uuid>", "timestamp": "<ISO>" }
  AND retry_count{service=traveler, outcome=exhausted} is incremented by 3
  AND no tokens are issued
```

### Scenario REQ-01-S12 — Concurrent refresh requests with same token — only one succeeds (atomicity)

```
GIVEN two concurrent POST /api/v1/auth/refresh requests arrive simultaneously
  AND both carry the same refreshToken that is valid and present in Redis
WHEN both requests attempt to look up and delete the Redis key gateway:refresh-token:<hash>
THEN exactly one request succeeds and receives new { accessToken, refreshToken }
  AND the other request receives 401 Unauthorized (its lookup finds the key already deleted)
  AND the refresh token store uses an atomic operation (GETDEL or Lua script) to prevent both from succeeding
```

---

## REQ-02: RBAC Authorization

**Description**: After JWT validation, the gateway MUST enforce role-based access control using the `@Roles()` decorator and `RolesGuard`. Routes decorated with `@Roles(Role.MANAGER)` or `@Roles(Role.ADMIN)` MUST reject tokens with insufficient role with 403 Forbidden.

### Scenario REQ-02-S01 — Happy path: correct role grants access

```
GIVEN a client holds a valid JWT with role: "MANAGER"
  AND the requested route requires Role.MANAGER
WHEN the client sends the request
THEN RolesGuard allows the request through
  AND the response status is NOT 403
```

### Scenario REQ-02-S02 — Failure path: insufficient role returns 403

```
GIVEN a client holds a valid JWT with role: "EMPLOYEE"
  AND the requested route requires Role.MANAGER
WHEN the client sends the request
THEN RolesGuard rejects the request
  AND the gateway returns 403 Forbidden
  AND the response body is { "error": "Forbidden", "message": "...", "correlationId": "...", "timestamp": "..." }
  AND no downstream call is made
```

---

## REQ-03: Rate Limiting

**Description**: The gateway MUST enforce a sliding-window rate limit of 100 requests per 15-minute window per authenticated user (identified by JWT `sub`). Search routes (`/api/v1/inventory/**`) MUST additionally enforce 30 requests per minute per user. Rate-limit state MUST be stored in Redis (key: `gateway:rate-limit:<userId>`, TTL: 15 min). Requests exceeding the limit MUST receive 429 Too Many Requests with a `Retry-After` header.

### Scenario REQ-03-S01 — Happy path: requests within limit are allowed

```
GIVEN user "user-1" has made 50 requests in the current 15-min window
WHEN user "user-1" sends request #51
THEN the gateway forwards the request to the appropriate downstream service
  AND cache_miss_total{type=rate_limit} is incremented
  AND the response is not 429
```

### Scenario REQ-03-S02 — Failure path: requests exceeding limit return 429

```
GIVEN user "user-1" has already made 100 requests in the current 15-min window
WHEN user "user-1" sends request #101
THEN the gateway returns 429 Too Many Requests
  AND the response includes a Retry-After header with seconds until window reset
  AND cache_hit_total{type=rate_limit} is incremented
  AND no downstream call is made
```

### Scenario REQ-03-S03 — Search route limit enforced separately

```
GIVEN user "user-1" has made 30 requests to /api/v1/inventory in the current minute
WHEN user "user-1" sends request #31 to /api/v1/inventory/search
THEN the gateway returns 429 Too Many Requests
  AND the global 15-min counter is unaffected
```

### Scenario REQ-03-S04 — Redis unavailability: rate-limit fails open

```
GIVEN the Redis instance is unreachable (connection refused)
WHEN a client sends a request to any rate-limited route
THEN the gateway allows the request through (fail-open)
  AND a log line at warn level is emitted: "Rate-limit Redis unavailable — allowing request"
  AND the response is NOT 429 or 500
```

### Scenario REQ-03-S05 — Exactly the 100th request in the window is allowed (boundary)

```
GIVEN user "user-1" has made exactly 99 requests in the current 15-minute window
WHEN user "user-1" sends request #100
THEN the gateway allows the request through (limit is 100 inclusive)
  AND the response is NOT 429
  AND the rate-limit counter for user-1 reads exactly 100
```

---

## REQ-04: Request Routing (Reverse Proxy)

**Description**: The gateway MUST route all requests matching the route table (design.md §4.2) to the corresponding downstream service, preserving the full path, query parameters, request body, and all request headers (except `Host`). The response body, status code, and headers from the downstream service MUST be returned to the client unchanged (except for the addition of `X-Correlation-ID`).

### Scenario REQ-04-S01 — Happy path: proxied request reaches downstream and response is returned

```
GIVEN a valid authenticated request arrives at GET /api/v1/bookings/bkg-001
WHEN ProxyHttpClient forwards to booking-service
THEN booking-service receives GET /api/v1/bookings/bkg-001 with all original headers plus X-Correlation-ID
  AND the gateway returns booking-service's response status and body unchanged to the client
```

### Scenario REQ-04-S02 — Failure path: unknown route returns 404

```
GIVEN a client sends a request to /api/v1/unknown/resource
  AND no route table entry matches
WHEN the routing module processes the request
THEN the gateway returns 404 Not Found
  AND the response body matches the standard error schema
```

---

## REQ-05: X-Correlation-ID Propagation

**Description**: The gateway MUST attach an `X-Correlation-ID` header to every inbound request that does not already have one (auto-generate UUID v4). The correlation ID MUST be forwarded in all outbound proxy calls to downstream services. It MUST be returned to the client in the response headers. It MUST appear in every log line emitted during the request lifecycle.

### Scenario REQ-05-S01 — Happy path: client provides correlation ID, gateway forwards it

```
GIVEN a client sends a request with X-Correlation-ID: "abc-123"
WHEN the CorrelationIdInterceptor processes the request
THEN the outbound proxy call to the downstream service contains X-Correlation-ID: "abc-123"
  AND the response to the client contains X-Correlation-ID: "abc-123"
  AND all log lines for this request contain correlationId: "abc-123"
```

### Scenario REQ-05-S02 — Auto-generation: missing header receives a generated UUID

```
GIVEN a client sends a request without X-Correlation-ID
WHEN the CorrelationIdInterceptor processes the request
THEN the interceptor generates a UUID v4
  AND attaches it to the inbound request context
  AND forwards it to the downstream service
  AND returns it to the client in the response X-Correlation-ID header
  AND all log lines for this request contain the generated correlationId
```

---

## REQ-06: Circuit Breaker

**Description**: The gateway MUST maintain one opossum circuit breaker instance per downstream service. The breaker opens when error rate exceeds 50% over 10 requests in a 30-second rolling window. While OPEN, all calls to that service MUST fail immediately with 503 Service Unavailable. After 30 seconds (half-open), the breaker allows one probe request. On probe success the breaker closes; on probe failure it remains open. Full recovery requires 60 seconds of healthy probes. Circuit state changes MUST update `circuit_state` gauge and `circuit_breaker_errors_total` counter.

### Scenario REQ-06-S01 — Happy path: CLOSED breaker allows requests through

```
GIVEN the circuit breaker for booking-service is CLOSED
  AND booking-service returns 200 for the proxied request
WHEN a client sends GET /api/v1/bookings/bkg-001
THEN the request is forwarded to booking-service
  AND circuit_state{service=booking} gauge reads 0 (CLOSED)
```

### Scenario REQ-06-S02 — Failure path: OPEN breaker returns 503 immediately

```
GIVEN the circuit breaker for booking-service has received >50% errors over 10 requests in 30s
  AND the breaker has transitioned to OPEN state
WHEN a subsequent request arrives for /api/v1/bookings/**
THEN the gateway returns 503 Service Unavailable without forwarding to booking-service
  AND the response body is { "error": "ServiceUnavailable", "message": "booking-service circuit open", "correlationId": "...", "timestamp": "..." }
  AND circuit_state{service=booking} gauge reads 1 (OPEN)
  AND circuit_breaker_errors_total{service=booking} is incremented
```

### Scenario REQ-06-S03 — Recovery: half-open probe success closes breaker

```
GIVEN the circuit breaker for booking-service is OPEN
  AND 30 seconds have elapsed (half-open period)
WHEN one probe request to booking-service succeeds (2xx)
THEN the circuit breaker transitions to CLOSED
  AND circuit_state{service=booking} gauge reads 0
```

### Scenario REQ-06-S04 — Recovery: half-open probe failure keeps breaker OPEN

```
GIVEN the circuit breaker for booking-service is in HALF_OPEN state
  AND a probe request is sent to booking-service
WHEN the probe request fails (5xx or timeout)
THEN the circuit breaker transitions back to OPEN (not CLOSED)
  AND circuit_state{service=booking} gauge reads 1
  AND the next client request for /api/v1/bookings/** receives 503 immediately
  AND the half-open timer resets for another 30-second wait
```

### Scenario REQ-06-S05 — Circuit transitions from CLOSED to OPEN after error threshold (transition scenario)

```
GIVEN the circuit breaker for booking-service is in CLOSED state
  AND booking-service has returned 503 for 6 of the last 10 requests (60% error rate > 50% threshold)
  AND the volume threshold of 10 requests has been reached within a 30-second rolling window
WHEN the next request arrives for GET /api/v1/bookings/bkg-001
THEN the opossum circuit transitions to OPEN state
  AND the gateway returns 503 Service Unavailable without forwarding to booking-service
  AND circuit_state{service=booking} gauge is set to 1
  AND circuit_breaker_errors_total{service=booking} is incremented
  AND all subsequent requests for /api/v1/bookings/** return 503 immediately until the half-open period
```

---

## REQ-07: Retries with Exponential Backoff

**Description**: `ProxyHttpClient` MUST retry failed downstream calls on retryable status codes (500, 502, 503, 504, 408) up to 3 times (4 total attempts). Each retry MUST apply exponential backoff (base 200 ms, max 5 s, ±50% jitter). Non-retryable responses (400, 401, 403, 404, 422) MUST NOT be retried and MUST be returned to the client immediately. `retry_count` Prometheus counter MUST be incremented on each retry attempt.

### Scenario REQ-07-S01 — Happy path: transient 503 succeeds on retry

```
GIVEN booking-service returns 503 on attempt 1 and 200 on attempt 2
WHEN ProxyHttpClient calls booking-service
THEN the client receives the 200 response
  AND retry_count{service=booking, outcome=success} is incremented by 1
  AND the total elapsed time includes at least one backoff delay
```

### Scenario REQ-07-S02 — Failure path: all 4 attempts fail — return 502

```
GIVEN booking-service returns 503 on all 4 attempts
WHEN ProxyHttpClient exhausts retries
THEN the gateway returns 502 Bad Gateway to the client
  AND retry_count{service=booking, outcome=exhausted} is incremented by 3
  AND the response body matches the standard error schema
```

### Scenario REQ-07-S03 — Non-retryable 404 is not retried

```
GIVEN booking-service returns 404 on attempt 1
WHEN ProxyHttpClient receives the 404
THEN ProxyHttpClient does NOT retry
  AND the 404 response is forwarded to the client immediately
  AND retry_count counter is NOT incremented
```

---

## REQ-08: Timeout Enforcement

**Description**: All outbound HTTP calls via `ProxyHttpClient` MUST enforce a 2-second connect timeout and a 10-second read timeout. If either timeout is breached, the gateway MUST return 504 Gateway Timeout to the client. Timeout errors qualify as retryable (code 408 equivalent) and are subject to the retry policy in REQ-07.

### Scenario REQ-08-S01 — Happy path: downstream responds within timeout

```
GIVEN booking-service responds within 1 second
WHEN ProxyHttpClient sends the request with timeout: { connect: 2000, read: 10000 }
THEN the response is returned normally
  AND no timeout error is recorded
```

### Scenario REQ-08-S02 — Failure path: read timeout returns 504 after retries exhausted

```
GIVEN booking-service hangs and does not respond within 10 seconds on all 4 attempts
WHEN ProxyHttpClient times out on all retries
THEN the gateway returns 504 Gateway Timeout
  AND the response body is { "error": "GatewayTimeout", "message": "...", "correlationId": "...", "timestamp": "..." }
  AND retry_count{service=booking, outcome=exhausted} reflects the retried attempts
```

---

## REQ-09: Idempotency

**Description**: The gateway MUST forward an `Idempotency-Key` header on every outbound proxy call. If the client does not provide one, the gateway MUST generate a UUID v4. For `POST /api/v1/auth/login`, the gateway MUST deduplicate requests with the same idempotency key within a 30-second window using Redis (key: `gateway:idempotency:login:<idempotency-key>`, TTL 30 s) and return the cached result without re-executing.

### Scenario REQ-09-S01 — Happy path: first login with idempotency key executes and caches

```
GIVEN a client sends POST /api/v1/auth/login with Idempotency-Key: "key-abc" for the first time
WHEN AuthController processes the request
THEN the login logic executes
  AND the result is stored in Redis under gateway:idempotency:login:key-abc with TTL 30s
  AND the response is returned to the client
```

### Scenario REQ-09-S02 — Duplicate login within window returns cached response

```
GIVEN POST /api/v1/auth/login with Idempotency-Key: "key-abc" was executed < 30s ago
  AND the result is cached in Redis
WHEN the client sends an identical POST with the same Idempotency-Key: "key-abc"
THEN the gateway returns the cached response (200) without re-executing login logic
  AND a log line at info level records "Duplicate idempotent request detected" with idempotencyKey: "key-abc"
```

### Scenario REQ-09-S03 — Idempotency key forwarded to downstream on proxy calls

```
GIVEN a client sends POST /api/v1/bookings with Idempotency-Key: "key-xyz"
WHEN ProxyHttpClient forwards the request to booking-service
THEN the outbound request contains Idempotency-Key: "key-xyz"
```

### Scenario REQ-09-S04 — Idempotency key after TTL expiry is treated as a new request

```
GIVEN POST /api/v1/auth/login with Idempotency-Key: "key-abc" was successfully executed
  AND more than 30 seconds have elapsed since the first call (TTL has expired)
  AND the Redis key gateway:idempotency:login:key-abc no longer exists
WHEN the client sends POST /api/v1/auth/login again with the same Idempotency-Key: "key-abc"
THEN the login logic executes as a fresh request (not a duplicate)
  AND a new accessToken and refreshToken are issued
  AND the new result is stored in Redis under gateway:idempotency:login:key-abc with TTL 30s
```

### Scenario REQ-09-S05 — Two simultaneous login requests with same idempotency key — only one executes

```
GIVEN two concurrent POST /api/v1/auth/login requests arrive simultaneously
  AND both carry Idempotency-Key: "key-race"
  AND neither has stored a dedup result in Redis yet
WHEN both requests are processed concurrently by the gateway
THEN exactly one request executes the login logic and stores the result in Redis
  AND the other request returns the same response from the cached result
  AND only one set of tokens is issued (no double-token issuance)
  AND the Lua INCR-based dedup or SETNX guard prevents both from executing simultaneously
```

---

## REQ-10: Observability

**Description**: The gateway MUST emit all observability signals defined in PROJECT.md §8 and design.md §10. Every log line MUST contain `correlationId`. The Bearer token MUST never appear in any log. Prometheus `/metrics` endpoint MUST expose all required metrics. OpenTelemetry traces MUST include one span per inbound request and one child span per downstream proxy call.

### Scenario REQ-10-S01 — Happy path: request emits all observability signals

```
GIVEN a successful proxied GET /api/v1/bookings/bkg-001
WHEN the request completes
THEN http_requests_total{method=GET, route=/api/v1/bookings/:id, status_code=200} is incremented
  AND http_request_duration_seconds{method=GET, route=/api/v1/bookings/:id} records the latency
  AND a Winston log line at info level is emitted with all required fields including correlationId
  AND a Jaeger trace span is recorded with attribute correlation_id
  AND the Authorization header value does NOT appear in any log line
```

### Scenario REQ-10-S02 — Circuit open emits circuit_state metric

```
GIVEN the booking-service circuit breaker transitions from CLOSED to OPEN
WHEN the state change event fires in opossum
THEN circuit_state{service=booking} gauge is updated to 1
  AND circuit_breaker_errors_total{service=booking} is incremented
  AND a log line at warn level is emitted: "Circuit breaker opened for booking-service"
```

### Scenario REQ-10-S03 — Rate limit hit emits cache metrics

```
GIVEN user "user-1" exceeds the 100 req/15 min limit
WHEN ThrottlerGuard enforces the limit
THEN cache_hit_total{type=rate_limit} is incremented
  AND a log line at warn level is emitted with userId and remaining window time
```

---

## REQ-11: Availability and Resilience SLA

**Description**: The gateway SHALL return a valid response (including circuit-breaker and rate-limit fallbacks) for ≥ 99.9% of all inbound requests measured over any rolling 30-day period. A valid response includes 4xx and 5xx error codes returned by the gateway itself (e.g., 401, 403, 429, 503, 504) — these count as valid gateway responses. Only cases where the gateway process itself crashes or becomes unreachable count against the SLA. The circuit-breaker fallback (503) and timeout fallback (504) are the primary availability mechanisms that uphold this SLA when downstream services are degraded.

### Scenario REQ-11-S01 — Happy path: downstream degradation does not bring down the gateway

```
GIVEN booking-service is returning 503 on all calls
  AND the circuit breaker for booking-service has opened
WHEN a client sends GET /api/v1/bookings/bkg-001
THEN the gateway returns 503 Service Unavailable within 100ms (no network wait)
  AND the gateway process continues to serve requests for all other service routes normally
  AND http_requests_total{status_code=503} is incremented
```

### Scenario REQ-11-S02 — Failure path: gateway continues serving other routes when one service is down

```
GIVEN inventory-service is unreachable (circuit breaker OPEN for inventory)
  AND all other downstream services are healthy
WHEN a client sends GET /api/v1/bookings/bkg-001 (a different service)
THEN the gateway forwards the request to booking-service successfully
  AND the inventory circuit state does NOT affect bookings routing
  AND the gateway returns the booking-service response to the client
```
