# Design: API Gateway Service (SM-02)

**Change ID**: api-gateway  
**Domain**: api-gateway  
**Status**: Proposed  
**Date**: 2026-05-02

---

## 1. Pattern Selection Log

> This section must be read before any other. It records every microservice pattern considered and the decision made for this change.

| Pattern | Decision | Rationale |
|---|---|---|
| Database-per-service | Not applicable | API Gateway owns no domain data; it is stateless except for rate-limit counters in Redis |
| CQRS | Not applicable | No read model or command/query split; pure routing proxy |
| Saga (Choreography) | Not applicable | Gateway initiates no distributed transactions |
| Saga (Orchestration) | Not applicable | Same as above |
| Outbox | Not applicable | Gateway publishes no domain events |
| Idempotency | **Applied** | Downstream calls that are retried (e.g., auth token refresh) must not double-execute; idempotency key passed through to upstream; auth/login POSTs deduplicated within 30 s Redis window |
| Timeouts | **Applied** | All proxy HTTP calls must have explicit connect (2 s) and read (10 s) timeouts per PROJECT.md §7 |
| Retries | **Applied** | Proxy calls on retryable codes (500/502/503/504/408) retry 3× with exponential backoff (base 200 ms, max 5 s, jitter); non-retryable (4xx) fail immediately |
| Circuit Breaker | **Applied** | One opossum circuit breaker per downstream service; threshold 50%/10 req/30 s; fallback 503; 30 s half-open, 60 s full recovery (ADR-011) |
| Bulkheads | Not applicable | Per-service circuit breakers provide adequate isolation per ADR-011; no thread-pool bulkhead needed |
| Cache-aside | **Applied** | Redis stores rate-limit counters keyed by `gateway:rate-limit:<userId>`; TTL = 15 min window |
| Read-through | Not applicable | No entity caching in the gateway |
| Write-through | Not applicable | Same |
| Cache Invalidation | Not applicable | Rate-limit counters expire naturally by TTL; no explicit invalidation needed |

**Applied patterns**: Idempotency · Timeouts · Retries · Circuit Breaker · Cache-aside (rate-limit)

---

## 2. Architecture Overview

```
React SPA (port 3000)
        │
        ▼ HTTPS / REST
┌─────────────────────────────────────────────────────┐
│              API Gateway  (port 4000)               │
│                                                     │
│  ┌──────────────────────────────────────────────┐  │
│  │  Request Pipeline (NestJS middleware chain)  │  │
│  │                                              │  │
│  │  1. CorrelationIdInterceptor (generate/fwd)  │  │
│  │  2. RequestLoggingInterceptor (Winston)      │  │
│  │  3. ThrottlerGuard (Redis rate-limit)        │  │
│  │  4. JwtAuthGuard (passport-jwt)              │  │
│  │  5. RolesGuard (@Roles decorator)            │  │
│  │  6. IdempotencyMiddleware (Redis dedup)      │  │
│  └──────────────────────────────────────────────┘  │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │AuthController│    │   ProxyRoutingModule     │  │
│  │ POST /login  │    │  (6 service route tables) │  │
│  │ POST /refresh│    └────────────┬─────────────┘  │
│  └──────────────┘                 │                 │
│                      ProxyHttpClient                │
│                 (axios + retry + timeout)           │
│                   CircuitBreakerService             │
│                   (opossum, 1 per service)          │
│                                                     │
│  ┌────────────────┐   ┌──────────────────────────┐ │
│  │HealthController│   │  ObservabilityModule     │ │
│  │  GET /health   │   │  (Prometheus, OTEL)      │ │
│  │  GET /metrics  │   └──────────────────────────┘ │
│  └────────────────┘                                 │
└──────────────────────────┬──────────────────────────┘
                           │  HTTP (internal)
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
   booking-service  policy-service  traveler-service
      (3001)           (3002)           (3003)
           ▼               ▼               ▼
   payment-service inventory-service expense-service
      (3004)           (3005)           (3006)
                           │
                       Redis 7 (rate-limit counters,
                        idempotency keys,
                        refresh-token store)
```

**Key architectural decisions**:
- The gateway owns **no database**. Redis is used only for transient state (rate-limit windows, idempotency dedup keys).
- Auth endpoints (`/login`, `/refresh`) are handled by the gateway itself. **The gateway is the sole JWT issuer** (OQ-02: Gateway-issued). On login, credentials are forwarded to Traveler Service; on success the gateway signs and returns the access + refresh token pair. Downstream services receive JWTs for validation only — they never issue tokens.
- Each downstream service gets **one dedicated circuit breaker instance** to prevent cascade failures.
- `X-Correlation-ID` is the single correlation handle flowing through every log line, trace span, and downstream header.

---

## 3. Folder Structure

```
api-gateway/
├── src/
│   ├── app.module.ts                          # Root module
│   ├── main.ts                                # Bootstrap, global pipes/filters
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts                 # POST /api/v1/auth/login|refresh
│   │   ├── auth.service.ts                    # Token validation / refresh logic
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts              # JwtAuthGuard
│   │   │   └── roles.guard.ts                 # RolesGuard
│   │   ├── strategies/
│   │   │   └── jwt.strategy.ts                # JwtStrategy (passport-jwt)
│   │   ├── decorators/
│   │   │   └── roles.decorator.ts             # @Roles(Role.MANAGER, ...)
│   │   ├── dto/
│   │   │   ├── login.request.dto.ts
│   │   │   ├── login.response.dto.ts
│   │   │   └── refresh.request.dto.ts
│   │   └── interfaces/
│   │       └── jwt-payload.interface.ts       # JwtPayload { sub, email, role, exp }
│   │
│   ├── rate-limit/
│   │   ├── rate-limit.module.ts
│   │   └── redis-throttler.store.ts           # ioredis-backed ThrottlerStorageService
│   │
│   ├── circuit-breaker/
│   │   ├── circuit-breaker.module.ts
│   │   └── circuit-breaker.service.ts         # CircuitBreakerService (opossum registry)
│   │
│   ├── routing/
│   │   ├── routing.module.ts
│   │   ├── proxy-http.client.ts               # ProxyHttpClient (axios + retry + timeout)
│   │   ├── proxy-routing.controller.ts        # Catch-all proxy routes
│   │   └── route-table.config.ts              # Route prefix → downstream URL map
│   │
│   ├── common/
│   │   ├── interceptors/
│   │   │   ├── correlation-id.interceptor.ts  # X-Correlation-ID generate / forward
│   │   │   └── request-logging.interceptor.ts # Winston structured logging
│   │   ├── middleware/
│   │   │   └── idempotency.middleware.ts       # Idempotency-Key extraction / dedup
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts        # Normalise error responses
│   │   └── enums/
│   │       └── role.enum.ts                   # Role { EMPLOYEE, MANAGER, ADMIN }
│   │
│   ├── health/
│   │   └── health.controller.ts               # GET /health, GET /metrics
│   │
│   └── observability/
│       ├── observability.module.ts
│       ├── metrics.service.ts                 # Prometheus registry + counters/gauges
│       └── tracing.service.ts                 # OpenTelemetry tracer provider
│
├── test/
│   └── app.e2e-spec.ts                        # Smoke test (T14)
├── .env.example
├── Dockerfile
└── package.json
```

---

## 4. API / Interface Contracts

### 4.1 Gateway-owned Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/v1/auth/login` | None | Validate credentials; return access + refresh JWT |
| `POST` | `/api/v1/auth/refresh` | None | Exchange refresh token for new access token |
| `GET` | `/health` | None | Liveness / readiness probe |
| `GET` | `/metrics` | None | Prometheus scrape endpoint |

**POST /api/v1/auth/login — Request**
```json
{
  "email": "alice@corp.com",
  "password": "s3cret!"
}
```

**LoginRequestDto — Validation Constraints**
| Field | Decorator | Rule |
|---|---|---|
| `email` | `@IsEmail()` | Must be a valid email address |
| `password` | `@IsString()` `@MinLength(8)` `@MaxLength(128)` | 8–128 characters |

**RefreshRequestDto — Validation Constraints**
| Field | Decorator | Rule |
|---|---|---|
| `refreshToken` | `@IsJWT()` | Must be a well-formed JWT string |

**POST /api/v1/auth/login — Response 200**
```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<JWT>",
  "expiresIn": 28800
}
```

**POST /api/v1/auth/refresh — Request**
```json
{
  "refreshToken": "<JWT>"
}
```

**POST /api/v1/auth/refresh — Response 200**
```json
{
  "accessToken": "<JWT>",
  "refreshToken": "<JWT>",
  "expiresIn": 28800
}
```

> **OQ-01 (ROTATE)**: Each refresh call issues a brand-new refresh token and invalidates (deletes) the old one from Redis. The client MUST store and use the new refresh token returned in this response.

### 4.2 Proxy Route Table

| Route Prefix | Downstream Service | Port | Strip Prefix |
|---|---|---|---|
| `/api/v1/bookings/**` | booking-service | 3001 | No |
| `/api/v1/policies/**` | policy-service | 3002 | No |
| `/api/v1/travelers/**` | traveler-service | 3003 | No |
| `/api/v1/payments/**` | payment-service | 3004 | No |
| `/api/v1/inventory/**` | inventory-service | 3005 | No |
| `/api/v1/expenses/**` | expense-service | 3006 | No |

All proxied routes require a valid `Authorization: Bearer <JWT>` header. Query parameters, request body, and all headers (except `Host`) are forwarded verbatim. `X-Correlation-ID` and `Idempotency-Key` are injected / forwarded by middleware.

### 4.3 Environment Variables

| Variable | Example | Description |
|---|---|---|
| `JWT_SECRET` | `supersecret` | HS256 signing secret (min 32 chars in prod) |
| `JWT_EXPIRY` | `28800` | Access token TTL in seconds (8 h default) |
| `BOOKING_SERVICE_URL` | `http://booking-service:3001` | |
| `POLICY_SERVICE_URL` | `http://policy-service:3002` | |
| `TRAVELER_SERVICE_URL` | `http://traveler-service:3003` | |
| `PAYMENT_SERVICE_URL` | `http://payment-service:3004` | |
| `INVENTORY_SERVICE_URL` | `http://inventory-service:3005` | |
| `EXPENSE_SERVICE_URL` | `http://expense-service:3006` | |
| `REDIS_URL` | `redis://localhost:6379` | Rate-limit, idempotency, and refresh-token store |
| `REFRESH_TOKEN_EXPIRY` | `604800` | Refresh token TTL in seconds (7 days default) |
| `PORT` | `4000` | Gateway listen port |
| `NODE_ENV` | `development` | |

---

## 5. Resilience Design

### 5.1 Timeouts

**Applies to**: All outbound HTTP calls via `ProxyHttpClient`.

| Parameter | Value | Source |
|---|---|---|
| Connect timeout | 2 s | PROJECT.md §7 |
| Read (response) timeout | 10 s | PROJECT.md §7 |
| On breach | Return `504 Gateway Timeout` to client | ADR-011 |

**Implementation**: axios `timeout` option per request in `ProxyHttpClient`. The 504 is mapped in `HttpExceptionFilter`.

### 5.2 Retries

**Applies to**: All outbound HTTP calls via `ProxyHttpClient`.

| Parameter | Value | Source |
|---|---|---|
| Max retries | 3 (4 total attempts) | PROJECT.md §7 |
| Backoff base | 200 ms | PROJECT.md §7 |
| Backoff max | 5 s | PROJECT.md §7 |
| Jitter | ±50 % of computed delay | PROJECT.md §7 |
| Retryable status codes | 500, 502, 503, 504, 408 | PROJECT.md §7 |
| Non-retryable status codes | 400, 401, 403, 404, 422 | PROJECT.md §7 |

**Implementation**: Custom retry loop in `ProxyHttpClient.executeWithRetry()`. Retry count increments `retry_count` Prometheus counter (labels: `service`, `outcome`).

Retry delay formula:
```
delay = min(base * 2^attempt, max) * (1 ± jitter)
```

### 5.3 Circuit Breaker

**Applies to**: Each downstream service has its own `opossum` instance registered in `CircuitBreakerService`.

| Parameter | Value | Source |
|---|---|---|
| Error threshold | 50 % | PROJECT.md §7 |
| Volume threshold | 10 requests | PROJECT.md §7 |
| Time window | 30 s | PROJECT.md §7 |
| Half-open period | 30 s | PROJECT.md §7 |
| Full recovery | 60 s | PROJECT.md §7 |
| Fallback | `503 Service Unavailable` with JSON error body | PROJECT.md §7 |

**State machine**:
```
CLOSED ──(>50% errors over 10req/30s)──► OPEN
OPEN   ──(after 30s half-open)──────────► HALF_OPEN
HALF_OPEN ──(probe success)─────────────► CLOSED
HALF_OPEN ──(probe failure)─────────────► OPEN
```

**Named instances** (one per service):
- `breaker:booking`, `breaker:policy`, `breaker:traveler`, `breaker:payment`, `breaker:inventory`, `breaker:expense`

**Metrics emitted by each breaker**:
- `circuit_state` gauge (0 = CLOSED, 0.5 = HALF_OPEN, 1 = OPEN), labels: `service`
- `circuit_breaker_errors_total` counter, labels: `service`

---

## 6. Caching Design (Rate-Limit — Cache-aside)

**Pattern**: Cache-aside using Redis as the sliding-window counter store.

| Attribute | Value |
|---|---|
| Redis key | `gateway:rate-limit:<userId>` |
| Window duration (TTL) | 15 min (900 s) |
| Global limit | 100 requests per window |
| Search route limit | 30 requests per minute (`gateway:rate-limit:search:<userId>`) |
| Storage | Redis INCR + EXPIRE (atomic via Lua script in `RedisThrottlerStore`) |
| Eviction | LRU (Redis global policy, PROJECT.md §6) |
| On exceeded | `429 Too Many Requests` with `Retry-After` header |

**Cache-aside flow**:
1. `ThrottlerGuard` calls `RedisThrottlerStore.increment(key, ttl)`.
2. If key does not exist, Redis creates it with `SET key 1 PX <ttl>`.
3. If key exists, `INCR key` and compare against limit.
4. If count > limit → `cache_hit_total` (counter was found, limit enforced) → 429.
5. If count ≤ limit → `cache_miss_total` (limit not yet reached) → continue.

> Note: "hit/miss" in rate-limit context means "limit hit" vs "limit not hit". Metrics labels: `type=rate_limit`.

### 6.1 Redis Unavailability Strategy

The gateway uses Redis for three namespaces: rate-limit counters, refresh-token store, and login idempotency keys. If Redis becomes unreachable, the following strategies apply:

| Namespace | Strategy | Rationale |
|---|---|---|
| Rate-limit counters (`gateway:rate-limit:*`) | **Fail-open** — if Redis connection throws, log a warning at `warn` level and allow the request through | Rate limiting is a protection mechanism, not a correctness requirement; brief Redis outage should not deny legitimate users |
| Refresh-token store (`gateway:refresh-token:*`) | **Fail-closed** — if Redis connection throws during `lookupRefreshToken()`, return 503 `ServiceUnavailable` with `Retry-After: 5` header | Accepting a refresh token without verifying it is in the store would break the rotation security invariant |
| Login idempotency (`gateway:idempotency:login:*`) | **Fail-open** — if Redis is unavailable, skip the dedup check and execute login normally | Login dedup is advisory (30s window); a duplicate login on Redis failure is acceptable |

**Implementation**: Wrap all Redis calls in try/catch. On `ioredis` connection error, log and apply the strategy above. Do not let Redis errors propagate as 500 to clients.

---

## 7. Idempotency Design

**Scope**: Applied to all outbound proxied calls (pass-through) and to `POST /api/v1/auth/login` (gateway-level dedup).

### 7.1 Pass-through idempotency

- Client supplies `Idempotency-Key: <UUID>` header on any POST/PUT/PATCH.
- `IdempotencyMiddleware` extracts the key; if absent, generates a new UUID v4.
- Key is forwarded as-is to the downstream service in the proxied request.
- Downstream service is responsible for its own dedup logic using the key.
- Gateway does **not** cache responses for arbitrary proxied calls (that is the downstream's responsibility).

### 7.2 Gateway-level dedup (auth/login)

- `POST /api/v1/auth/login` with an `Idempotency-Key` will not be re-processed within a 30 s window.
- Redis key: `gateway:idempotency:login:<idempotency-key>`, TTL: 30 s.
- On first call: execute auth, store result in Redis, return result.
- On duplicate within 30 s: return cached result (200) without re-executing.
- After 30 s: key expires; subsequent call is treated as a new request.

### 7.3 Key lifecycle

| Scenario | Behaviour |
|---|---|
| Client provides key | Use as-is |
| Client omits key | Generate UUID v4; attach to request; forward downstream |
| Duplicate within window (login only) | Return cached response; no re-execution |
| Key TTL expired | Treat as new request |

---

## 8. Error Handling

All errors pass through `HttpExceptionFilter`, which normalises responses to the project's standard schema:

```json
{
  "error": "ErrorCode",
  "message": "Human-readable message",
  "details": [],
  "correlationId": "<uuid>",
  "timestamp": "<ISO 8601>"
}
```

| Condition | HTTP Status | Error Code |
|---|---|---|
| Missing / invalid JWT | 401 | `Unauthorized` |
| Valid JWT, insufficient role | 403 | `Forbidden` |
| Rate limit exceeded | 429 | `TooManyRequests` |
| Connect timeout to downstream | 504 | `GatewayTimeout` |
| Read timeout to downstream | 504 | `GatewayTimeout` |
| Circuit breaker OPEN | 503 | `ServiceUnavailable` |
| Downstream 4xx (non-retryable) | Forwarded as-is | Forwarded |
| Downstream 5xx after all retries | 502 | `BadGateway` |
| Idempotency key conflict (login) | 200 (cached) | — |

---

## 9. Security

| Concern | Implementation |
|---|---|
| Algorithm | HS256 (symmetric, `JWT_SECRET` from env — never hardcoded) |
| Token issuer | **API Gateway only** (OQ-02). Downstream services share `JWT_SECRET` for validation; they never call `jwt.sign()` |
| Access token expiry | 8 h (`JWT_EXPIRY=28800`) |
| Refresh token expiry | 7 days (`REFRESH_TOKEN_EXPIRY=604800`) |
| Refresh token rotation | **ROTATE** (OQ-01): each `POST /api/v1/auth/refresh` deletes the old Redis key and writes a new one; old refresh token is immediately invalid |
| Refresh token store | Redis key: `gateway:refresh-token:<sha256(refreshToken)>` → `userId`; TTL: 7 days (604 800 s). On rotation: `DEL gateway:refresh-token:<oldHash>` then `SET gateway:refresh-token:<newHash> <userId> EX 604800`. Note: same Redis instance as rate-limit / idempotency stores; separate key namespace `gateway:refresh-token:*` |

> **Atomicity requirement (concurrent refresh)**: The lookup-and-delete of `gateway:refresh-token:<hash>` MUST be atomic to prevent two concurrent refresh requests with the same token from both succeeding. Use Redis `GETDEL` (available in Redis 6.2+, which is within PROJECT.md §6's Redis 7 requirement) for the lookup+delete in a single round-trip. This prevents the TOCTOU (time-of-check-time-of-use) race described in REQ-01-S12.
| Token payload | `{ sub: userId, email, role: Role, iat, exp }` |
| RBAC roles | `Role.EMPLOYEE`, `Role.MANAGER`, `Role.ADMIN` |
| Token never logged | `RequestLoggingInterceptor` strips `Authorization` header before logging; `refreshToken` field is redacted in logs |
| Transport | TLS 1.3 (enforced by reverse proxy / ingress in prod; HTTP in local dev) |
| Secret management | `JWT_SECRET` injected via Kubernetes Secret in staging/production; `.env` in local dev |
| PCI-DSS note | Payment routes proxied without reading body; gateway never inspects card data |

#### Login flow (OQ-02: Gateway-issued)

```
Client  ──POST /api/v1/auth/login──►  AuthController
                                            │
                    AuthService.login()     │
                                            ▼
                              ProxyHttpClient  ──POST /travelers/auth──►  traveler-service
                              (forwards { email, password })             (validates credentials)
                                            │
                              ◄── { userId, email, role } ──────────────
                                            │
                    sign accessToken  (HS256, 8 h, payload: { sub, email, role })
                    sign refreshToken (HS256, 7 d, payload: { sub })
                    SHA-256 hash refreshToken
                    SET gateway:refresh-token:<hash>  userId  EX 604800
                                            │
                    ◄── { accessToken, refreshToken, expiresIn: 28800 } ──
```

#### Refresh flow (OQ-01: Rotate)

```
Client  ──POST /api/v1/auth/refresh──►  AuthController
                                             │
                     AuthService.refresh()   │
                                             ▼
                    jwt.verify(refreshToken) — must be valid HS256, not expired
                    hash = SHA-256(refreshToken)
                    GET gateway:refresh-token:<hash>  → userId (must exist; else 401)
                    DEL gateway:refresh-token:<hash>
                    sign new accessToken  (8 h)
                    sign new refreshToken (7 d)
                    newHash = SHA-256(newRefreshToken)
                    SET gateway:refresh-token:<newHash>  userId  EX 604800
                                             │
                    ◄── { accessToken, refreshToken, expiresIn: 28800 } ──
```

---

## 10. Observability

### 10.1 Metrics (Prometheus)

| Metric | Type | Labels | Description |
|---|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` | All inbound requests |
| `http_request_duration_seconds` | Histogram | `method`, `route` | p50/p95/p99 latency |
| `retry_count` | Counter | `service`, `outcome` (success\|exhausted) | Retry attempts per downstream |
| `circuit_state` | Gauge | `service` | 0=CLOSED, 0.5=HALF_OPEN, 1=OPEN |
| `circuit_breaker_errors_total` | Counter | `service` | Errors counted by breaker |
| `cache_hit_total` | Counter | `type` (rate_limit) | Rate-limit window counter found and limit enforced |
| `cache_miss_total` | Counter | `type` (rate_limit) | Rate-limit window counter below limit |

### 10.2 Tracing (OpenTelemetry + Jaeger)

- One span per inbound HTTP request; span name: `HTTP <METHOD> <route>`.
- Child span per outbound proxy call; span name: `PROXY <service> <METHOD> <path>`.
- `X-Correlation-ID` is set as a span attribute (`correlation_id`).
- Span status set to `ERROR` for 5xx responses.

### 10.3 Structured Logging (Winston)

Required fields on every log line:
```json
{
  "timestamp": "ISO 8601",
  "level": "info|warn|error|debug",
  "service": "api-gateway",
  "correlationId": "<uuid>",
  "message": "...",
  "context": { "method": "POST", "path": "/api/v1/auth/login", "statusCode": 200, "durationMs": 42 }
}
```

`Authorization` header is **never** included in log context. Sensitive fields (`password`, `refreshToken`) are redacted before logging.

### 10.4 Per-Pattern Signals

| Pattern | Signal |
|---|---|
| Retry | `retry_count{service, outcome}` incremented on each retry attempt |
| Circuit Breaker | `circuit_state{service}` gauge updated on every state transition; `circuit_breaker_errors_total{service}` on each error counted by breaker |
| Rate Limit (Cache-aside) | `cache_hit_total{type=rate_limit}` when limit hit; `cache_miss_total{type=rate_limit}` when under limit |
| Idempotency | Log at `info` level when duplicate request detected; include `idempotencyKey` in context |
