# Tasks: API Gateway Service (SM-02)

**Change ID**: api-gateway  
**Domain**: api-gateway  
**Date**: 2026-05-02  
**Total tasks**: 15

## Implementation Checklist

- [x] T01: Bootstrap NestJS App, Module Structure, Environment Config
- [x] T02: JWT Authentication Guard
- [x] T03: RBAC Roles Guard
- [x] T04: X-Correlation-ID Interceptor
- [x] T05: Request Logging Interceptor
- [x] T06: Circuit Breaker Service
- [x] T07: HTTP Proxy Client
- [x] T08: Rate Limiting (Redis-backed Throttler)
- [x] T09: Auth Controller
- [x] T10: Proxy Routing Module
- [x] T11: Health Controller
- [x] T12: Idempotency Key Forwarding Middleware
- [x] T13: Observability Instrumentation
- [x] T14: End-to-End Wiring and Integration Smoke Test
- [x] T15: Contract Tests for Auth API Endpoints

---

> Tasks are ordered with no forward dependencies. Each task depends only on tasks with a lower number.

---

## T01 — Bootstrap NestJS App, Module Structure, Environment Config

**Status**: TODO

### Files Affected
- `api-gateway/package.json`
- `api-gateway/tsconfig.json`
- `api-gateway/src/main.ts`
- `api-gateway/src/app.module.ts`
- `api-gateway/src/common/enums/role.enum.ts`
- `api-gateway/.env.example`

### Description
Initialise the NestJS application for the API Gateway. Configure `ConfigModule.forRoot({ isGlobal: true })` to load all environment variables below. Set up global validation pipe (`ValidationPipe({ whitelist: true, transform: true })`), global exception filter (`HttpExceptionFilter`), and global prefix `/api/v1` (excluding health/metrics). Define the `Role` enum (`EMPLOYEE`, `MANAGER`, `ADMIN`). Install all required npm packages: `@nestjs/config`, `@nestjs/passport`, `@nestjs/jwt`, `passport`, `passport-jwt`, `@nestjs/throttler`, `ioredis`, `axios`, `opossum`, `winston`, `@opentelemetry/sdk-node`, `@opentelemetry/auto-instrumentations-node`, `prom-client`.

> **UUID generation**: Use Node.js built-in `crypto.randomUUID()` for all UUID v4 generation (available in Node.js ≥ 14.17). Do **not** install a `uuid` npm package.

**Required environment variables** (populate in `.env.example`):

| Variable | Example value | Description |
|---|---|---|
| `PORT` | `4000` | HTTP listen port |
| `NODE_ENV` | `production` | Runtime environment |
| `JWT_SECRET` | `<32-byte hex>` | HMAC-SHA256 signing key |
| `JWT_EXPIRY` | `28800` | Access token TTL in seconds (8 h) |
| `REFRESH_TOKEN_EXPIRY` | `604800` | Refresh token TTL in seconds (7 d) |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL (shared: rate-limit, idempotency, refresh-token) |
| `BOOKING_SERVICE_URL` | `http://booking-service:3001` | Downstream booking service base URL |
| `POLICY_SERVICE_URL` | `http://policy-service:3002` | Downstream policy service base URL |
| `TRAVELER_SERVICE_URL` | `http://traveler-service:3003` | Downstream traveler service base URL |
| `PAYMENT_SERVICE_URL` | `http://payment-service:3004` | Downstream payment service base URL |
| `INVENTORY_SERVICE_URL` | `http://inventory-service:3005` | Downstream inventory service base URL |
| `EXPENSE_SERVICE_URL` | `http://expense-service:3006` | Downstream expense service base URL |
| `JAEGER_ENDPOINT` | `http://localhost:14268/api/traces` | Jaeger trace exporter endpoint |

### Acceptance Criteria

**AC-01**: Application bootstraps successfully on `PORT=4000` with `NODE_ENV=test` and all required env vars present.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/app.module.spec.ts` |
| Test case | `should bootstrap the NestJS application without errors` |
| Must fail if | `AppModule` fails to compile or `main.ts` throws on startup with valid env vars |

**AC-02**: `ConfigModule` exposes all required env vars via `ConfigService`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/app.module.spec.ts` |
| Test case | `should expose all required env vars via ConfigService` |
| Must fail if | Any of `JWT_SECRET`, `BOOKING_SERVICE_URL`, `REDIS_URL` returns `undefined` from `ConfigService.get()` |

**AC-03**: `Role` enum contains exactly `EMPLOYEE`, `MANAGER`, `ADMIN`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/enums/role.enum.spec.ts` |
| Test case | `should define EMPLOYEE, MANAGER, ADMIN roles` |
| Must fail if | Any role value is missing or misspelled |

---

## T02 — JWT Authentication Guard

**Status**: TODO

### Files Affected
- `api-gateway/src/auth/strategies/jwt.strategy.ts`
- `api-gateway/src/auth/guards/jwt-auth.guard.ts`
- `api-gateway/src/auth/interfaces/jwt-payload.interface.ts`
- `api-gateway/src/auth/auth.module.ts`
- `api-gateway/src/auth/guards/jwt-auth.guard.spec.ts`
- `api-gateway/src/auth/strategies/jwt.strategy.spec.ts`

### Description
Implement `JwtStrategy` using `passport-jwt` with `ExtractJwt.fromAuthHeaderAsBearerToken()`. Verify tokens with `JWT_SECRET` (from `ConfigService`) and algorithm HS256. On successful validation, attach the `JwtPayload` (`{ sub, email, role, exp }`) to `request.user`. Implement `JwtAuthGuard` extending `AuthGuard('jwt')`. Register in `AuthModule` with `PassportModule.register({ defaultStrategy: 'jwt' })` and `JwtModule.registerAsync(...)`. Routes `GET /health`, `GET /metrics`, `POST /api/v1/auth/login`, and `POST /api/v1/auth/refresh` MUST be decorated with `@Public()` to bypass the guard.

**OQ-02 (Gateway issues tokens)**: Implement `AuthService` token-issuance methods in this task:
- `issueAccessToken(payload: JwtPayload): string` — signs an HS256 JWT with `JWT_SECRET`, expiry `JWT_EXPIRY` (8 h).
- `issueRefreshToken(userId: string): string` — signs an HS256 JWT with `JWT_SECRET`, expiry `REFRESH_TOKEN_EXPIRY` (7 d).
- `storeRefreshToken(refreshToken: string, userId: string): Promise<void>` — computes `SHA-256(refreshToken)`, stores `SET gateway:refresh-token:<hash> <userId> EX 604800` in Redis.
- `revokeRefreshToken(refreshToken: string): Promise<void>` — computes hash and calls `DEL gateway:refresh-token:<hash>`.
- `lookupRefreshToken(refreshToken: string): Promise<string | null>` — returns `userId` from Redis or `null` if key not found.

These methods are called by T09 (`AuthController`). The ioredis client used here is the **same Redis instance** (`REDIS_URL`) used by T08 for rate-limit counters and idempotency keys; the refresh-token namespace `gateway:refresh-token:*` is kept separate from both.

### Acceptance Criteria

**AC-01**: Valid unexpired JWT is accepted; `request.user` contains correct `JwtPayload`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/strategies/jwt.strategy.spec.ts` |
| Test case | `should validate a valid JWT and return JwtPayload` |
| Must fail if | `JwtStrategy.validate()` returns null or throws for a valid token |

**AC-02**: Expired JWT returns 401.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/guards/jwt-auth.guard.spec.ts` |
| Test case | `should return 401 when JWT is expired` |
| Must fail if | Guard allows an expired token through |

**AC-03**: Missing Authorization header returns 401.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/guards/jwt-auth.guard.spec.ts` |
| Test case | `should return 401 when Authorization header is absent` |
| Must fail if | Guard allows a request with no Authorization header |

**AC-04**: Token signed with wrong secret returns 401.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/guards/jwt-auth.guard.spec.ts` |
| Test case | `should return 401 when token is signed with incorrect secret` |
| Must fail if | Guard accepts a token signed with a different secret |

---

## T03 — RBAC Roles Guard

**Status**: TODO

### Files Affected
- `api-gateway/src/auth/guards/roles.guard.ts`
- `api-gateway/src/auth/decorators/roles.decorator.ts`
- `api-gateway/src/auth/guards/roles.guard.spec.ts`

### Description
Implement `@Roles(...roles: Role[])` decorator using `SetMetadata('roles', roles)`. Implement `RolesGuard` implementing `CanActivate`. Guard reads `JwtPayload.role` from `request.user` (set by T02) and compares against `@Roles()` metadata using a hierarchy: ADMIN > MANAGER > EMPLOYEE. If a route has no `@Roles()` metadata, the guard passes (any authenticated user is allowed). If the user's role is insufficient, the guard returns 403.

### Acceptance Criteria

**AC-01**: Route with `@Roles(Role.MANAGER)` allows `MANAGER` and `ADMIN` tokens.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/guards/roles.guard.spec.ts` |
| Test case | `should allow MANAGER role on a MANAGER-required route` |
| Must fail if | `RolesGuard.canActivate()` returns false for a MANAGER token on a MANAGER route |

**AC-02**: Route with `@Roles(Role.MANAGER)` rejects `EMPLOYEE` token with 403.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/guards/roles.guard.spec.ts` |
| Test case | `should deny EMPLOYEE role on a MANAGER-required route and return 403` |
| Must fail if | Guard returns true (allows) for an EMPLOYEE on a MANAGER route |

**AC-03**: Route with no `@Roles()` decorator allows any authenticated user.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/guards/roles.guard.spec.ts` |
| Test case | `should allow any authenticated user when no roles metadata is set` |
| Must fail if | Guard returns false for a valid authenticated user with no `@Roles()` on the route |

---

## T04 — X-Correlation-ID Interceptor

**Status**: TODO

### Files Affected
- `api-gateway/src/common/interceptors/correlation-id.interceptor.ts`
- `api-gateway/src/common/interceptors/correlation-id.interceptor.spec.ts`

### Description
Implement `CorrelationIdInterceptor` implementing `NestInterceptor`. On each request: (1) Read `X-Correlation-ID` header from the inbound request. (2) If absent, generate a UUID v4. (3) Attach the correlation ID to `request['correlationId']` for use by downstream interceptors and services. (4) Set the `X-Correlation-ID` header on the outgoing response. Interceptor MUST be registered globally in `AppModule` before `RequestLoggingInterceptor`.

### Acceptance Criteria

**AC-01**: Provided `X-Correlation-ID` is preserved and returned in response.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/interceptors/correlation-id.interceptor.spec.ts` |
| Test case | `should preserve provided X-Correlation-ID and attach to response` |
| Must fail if | Interceptor overwrites a client-provided correlation ID |

**AC-02**: Missing `X-Correlation-ID` generates a UUID v4 and returns it in response.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/interceptors/correlation-id.interceptor.spec.ts` |
| Test case | `should generate UUID v4 when X-Correlation-ID header is absent` |
| Must fail if | `request['correlationId']` is null/undefined when header is absent |

**AC-03**: Generated correlation ID matches UUID v4 format.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/interceptors/correlation-id.interceptor.spec.ts` |
| Test case | `should generate a value matching UUID v4 regex pattern` |
| Must fail if | Generated value does not match `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i` |

---

## T05 — Request Logging Interceptor

**Status**: TODO

### Files Affected
- `api-gateway/src/common/interceptors/request-logging.interceptor.ts`
- `api-gateway/src/common/interceptors/request-logging.interceptor.spec.ts`

### Description
Implement `RequestLoggingInterceptor` implementing `NestInterceptor`. On request entry: log at `info` level with `{ method, path, correlationId, userId? }`. On response (via `tap`): log at `info` level with `{ method, path, statusCode, durationMs, correlationId }`. On error (via `catchError`): log at `error` level with `{ method, path, statusCode, durationMs, correlationId, error }`. Winston logger MUST use JSON transport. The `Authorization` header value MUST NEVER appear in any log line. The `password` field in request body MUST be redacted (`[REDACTED]`). `correlationId` is read from `request['correlationId']` (set by T04). Register globally after `CorrelationIdInterceptor`.

### Acceptance Criteria

**AC-01**: Log line on success contains all required fields and no Bearer token.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/interceptors/request-logging.interceptor.spec.ts` |
| Test case | `should log request and response with all required fields including correlationId` |
| Must fail if | Log output is missing `timestamp`, `level`, `service`, `correlationId`, `message`, or `context` fields |

**AC-02**: Authorization header value does not appear in log output.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/interceptors/request-logging.interceptor.spec.ts` |
| Test case | `should not log the Authorization header Bearer token value` |
| Must fail if | The string `Bearer` followed by any JWT value appears in logged output |

**AC-03**: `password` field in body is redacted.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/interceptors/request-logging.interceptor.spec.ts` |
| Test case | `should redact password field from logged request context` |
| Must fail if | Any logged output contains a literal password value from the request body |

---

## T06 — Circuit Breaker Service

**Status**: TODO

### Files Affected
- `api-gateway/src/circuit-breaker/circuit-breaker.module.ts`
- `api-gateway/src/circuit-breaker/circuit-breaker.service.ts`
- `api-gateway/src/circuit-breaker/circuit-breaker.service.spec.ts`

### Description
Implement `CircuitBreakerService` as a NestJS `@Injectable()` singleton. It MUST create and cache one `opossum` `CircuitBreaker` instance per downstream service name (`booking`, `policy`, `traveler`, `payment`, `inventory`, `expense`). Configuration per instance: `errorThresholdPercentage: 50`, `volumeThreshold: 10`, `rollingCountTimeout: 30000`, `resetTimeout: 30000` (half-open probe after 30 s). The service exposes `getBreaker(serviceName: string): CircuitBreaker` and `execute<T>(serviceName: string, fn: () => Promise<T>): Promise<T>`. On `open` event, set `circuit_state{service}` gauge to 1. On `halfOpen` event, set gauge to 0.5. On `close` event, set gauge to 0. On each error event, increment `circuit_breaker_errors_total{service}`. Fallback for all breakers: throw `ServiceUnavailableException` with message `<service>-service circuit open`. Note: `MetricsService` (T13) must be passed in as a dependency; use `forwardRef` if needed or rely on module import order (T13 will be wired in T14).

### Acceptance Criteria

**AC-01**: `getBreaker` returns the same instance for the same service name (singleton per service).

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/circuit-breaker/circuit-breaker.service.spec.ts` |
| Test case | `should return the same CircuitBreaker instance for the same service name` |
| Must fail if | Two calls to `getBreaker('booking')` return different object references |

**AC-02**: Circuit transitions to OPEN after threshold errors.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/circuit-breaker/circuit-breaker.service.spec.ts` |
| Test case | `should open the circuit after 50% error threshold is exceeded over 10 requests` |
| Must fail if | Circuit remains CLOSED after injecting >50% errors over the volume threshold |

**AC-03**: OPEN circuit returns `ServiceUnavailableException` without calling the wrapped function.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/circuit-breaker/circuit-breaker.service.spec.ts` |
| Test case | `should throw ServiceUnavailableException and not invoke the action when circuit is open` |
| Must fail if | The wrapped function is invoked while the circuit is OPEN |

---

## T07 — HTTP Proxy Client

**Status**: TODO

### Files Affected
- `api-gateway/src/routing/proxy-http.client.ts`
- `api-gateway/src/routing/proxy-http.client.spec.ts`

### Description
Implement `ProxyHttpClient` as a NestJS `@Injectable()`. It wraps `axios` with the following behaviour:

1. **Timeout**: `timeout: 10000` (read), `socketTimeout: 2000` (connect) on every request.
2. **Retry loop** (`executeWithRetry`): up to 3 retries (4 total). Retryable codes: 500, 502, 503, 504, 408. Non-retryable codes: 400, 401, 403, 404, 422. Backoff: `min(200 * 2^attempt, 5000) * (0.5 + Math.random())`. On each retry, increment `retry_count{service, outcome=retry}`. On exhaustion, increment `retry_count{service, outcome=exhausted}`.
3. **Circuit breaker**: each call is wrapped via `CircuitBreakerService.execute(serviceName, fn)`.
4. **Headers forwarding**: `X-Correlation-ID` and `Idempotency-Key` MUST be forwarded on every call.
5. **Error mapping**: timeout → throw `GatewayTimeoutException`; circuit open → rethrow `ServiceUnavailableException`; all retries exhausted on 5xx → throw `BadGatewayException`.

### Acceptance Criteria

**AC-01**: Successful downstream response is returned to the caller.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-http.client.spec.ts` |
| Test case | `should return downstream response on success` |
| Must fail if | Client throws or returns undefined for a mocked 200 response |

**AC-02**: Retryable 503 is retried up to 3 times with backoff.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-http.client.spec.ts` |
| Test case | `should retry up to 3 times on 503 response and increment retry_count` |
| Must fail if | Client does not retry on 503 or retries more than 3 times |

**AC-03**: Non-retryable 404 is not retried.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-http.client.spec.ts` |
| Test case | `should not retry on 404 and return error immediately` |
| Must fail if | `retry_count` is incremented for a 404 response |

**AC-04**: Read timeout throws `GatewayTimeoutException`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-http.client.spec.ts` |
| Test case | `should throw GatewayTimeoutException when downstream read timeout is exceeded` |
| Must fail if | Timeout does not result in `GatewayTimeoutException` |

**AC-05**: `X-Correlation-ID` and `Idempotency-Key` headers are forwarded on every call.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-http.client.spec.ts` |
| Test case | `should forward X-Correlation-ID and Idempotency-Key headers to downstream` |
| Must fail if | Outbound axios request is missing either header |

---

## T08 — Rate Limiting (Redis-backed Throttler)

**Status**: TODO

### Files Affected
- `api-gateway/src/rate-limit/rate-limit.module.ts`
- `api-gateway/src/rate-limit/redis-throttler.store.ts`
- `api-gateway/src/rate-limit/rate-limit.module.spec.ts`
- `api-gateway/src/rate-limit/redis-throttler.store.spec.ts`

### Description
Implement `RedisThrottlerStore` implementing `ThrottlerStorage` using `ioredis`. Key format: `gateway:rate-limit:<userId>` (global) and `gateway:rate-limit:search:<userId>` (search routes). Use Lua script for atomic INCR + EXPIRE to avoid race conditions. Increment `cache_hit_total{type=rate_limit}` when the limit is reached; `cache_miss_total{type=rate_limit}` on every request under the limit. Configure `ThrottlerModule.forRootAsync(...)` with two throttle configs: (1) `name: 'global', ttl: 900, limit: 100`; (2) `name: 'search', ttl: 60, limit: 30`. Apply `@Throttle({ global: { limit: 100, ttl: 900 } })` globally and `@Throttle({ search: { limit: 30, ttl: 60 } })` on search/inventory routes. Return `429 Too Many Requests` with `Retry-After` header on breach. Routes `GET /health` and `GET /metrics` MUST be decorated with `@SkipThrottle()`.

> **Redis fail-open**: All Redis calls in `RedisThrottlerStore.increment()` MUST be wrapped in a `try/catch`. On any Redis connection error or command failure, log a `warn`-level message and **return a count of 0** (fail-open — allow the request through). This prevents a Redis outage from blocking all traffic. The warn log MUST include the error message and `correlationId`.

> **Redis namespace note**: This task uses the same Redis instance (`REDIS_URL`) as the idempotency middleware (T12) and the refresh-token store (T02/T09). Key namespaces are kept strictly separate: `gateway:rate-limit:*` (this task), `gateway:idempotency:*` (T12), `gateway:refresh-token:*` (T02/T09). The ioredis client SHOULD be provided as a shared provider (`REDIS_CLIENT` injection token) from `RateLimitModule` or a dedicated `RedisModule` so that all consumers share one connection pool.

### Acceptance Criteria

**AC-01**: Requests under the limit are allowed through.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/rate-limit/redis-throttler.store.spec.ts` |
| Test case | `should allow requests under the rate limit` |
| Must fail if | `increment()` returns a count that causes throttling before the limit is reached |

**AC-02**: Requests exceeding the limit return 429 with `Retry-After`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/rate-limit/redis-throttler.store.spec.ts` |
| Test case | `should reject request #101 with 429 and Retry-After header` |
| Must fail if | The 101st request does not trigger a 429 response |

**AC-03**: Rate-limit key uses correct namespace `gateway:rate-limit:<userId>`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/rate-limit/redis-throttler.store.spec.ts` |
| Test case | `should use the correct Redis key namespace for rate limiting` |
| Must fail if | Redis key written does not match `gateway:rate-limit:<userId>` pattern |

---

## T09 — Auth Controller

**Status**: TODO

### Files Affected
- `api-gateway/src/auth/auth.controller.ts`
- `api-gateway/src/auth/auth.service.ts`
- `api-gateway/src/auth/dto/login.request.dto.ts`
- `api-gateway/src/auth/dto/login.response.dto.ts`
- `api-gateway/src/auth/dto/refresh.request.dto.ts`
- `api-gateway/src/auth/dto/refresh.response.dto.ts`
- `api-gateway/src/auth/auth.controller.spec.ts`
- `api-gateway/src/auth/auth.service.spec.ts`

### Description
Implement `AuthController` with two endpoints (both `@Public()`):

1. **`POST /api/v1/auth/login`** (OQ-02 — Gateway issues tokens): Accept `LoginRequestDto { email: string, password: string }`. Delegate to `AuthService.login()`, which:
   - Calls `ProxyHttpClient` → `POST {TRAVELER_SERVICE_URL}/travelers/auth` with `{ email, password }`.
   - Traveler Service returns `{ userId, email, role }` on success, or 401 on invalid credentials.
   - On success: call `AuthService.issueAccessToken()`, `AuthService.issueRefreshToken()`, `AuthService.storeRefreshToken()` (Redis key `gateway:refresh-token:<sha256(token)>`, TTL 7 d).
   - Return `LoginResponseDto { accessToken, refreshToken, expiresIn: 28800 }`.
   - On invalid credentials (Traveler Service returns 401): return 401.
   - Apply gateway-level idempotency dedup (Redis key `gateway:idempotency:login:<Idempotency-Key>`, TTL 30 s).

2. **`POST /api/v1/auth/refresh`** (OQ-01 — Rotate): Accept `RefreshRequestDto { refreshToken: string }`. Delegate to `AuthService.refresh()`, which:
   - Calls `jwt.verify(refreshToken, JWT_SECRET)` — throws on invalid/expired token → 401.
   - Calls `AuthService.lookupRefreshToken(refreshToken)` → gets `userId` from Redis (`gateway:refresh-token:<sha256(token)>`); if null → 401.
   - Calls `AuthService.revokeRefreshToken(refreshToken)` → `DEL gateway:refresh-token:<sha256(token)>`.
   - Signs new `accessToken` (8 h) and new `refreshToken` (7 d).
   - Calls `AuthService.storeRefreshToken(newRefreshToken, userId)` → `SET gateway:refresh-token:<sha256(newToken)> userId EX 604800`.
   - Returns `{ accessToken, refreshToken, expiresIn: 28800 }`.
   - On any failure: return 401.

Both endpoints are exempt from `JwtAuthGuard` and `ThrottlerGuard` (use `@SkipThrottle()` and `@Public()`).

> **Concurrent idempotency guard (login)**: The login idempotency cache write MUST use Redis `SET gateway:idempotency:login:<key> <response> NX EX 30` (atomic set-if-not-exists). If the key already exists (a concurrent duplicate request), return the cached response immediately without re-executing login logic. This prevents a race condition where two simultaneous requests with the same `Idempotency-Key` both execute the full login flow.

> **`lookupRefreshToken` — Redis fail-closed**: If the Redis call in `lookupRefreshToken()` throws a connection error (not just a cache miss), the method MUST **throw `ServiceUnavailableException`** with a `Retry-After: 5` response header. The refresh flow must NOT proceed if token-store availability is uncertain (fail-closed). This prevents token reuse attacks during Redis outages.

> **`storeRefreshToken` — warn-and-continue**: If the Redis `SET` in `storeRefreshToken()` throws a connection error, log a `warn`-level message (include `userId`, `correlationId`, and error details) and **continue without throwing**. A transient storage failure on token issuance is recoverable; the issued tokens remain valid for their lifetime even if the refresh-token entry is not stored (the next refresh will simply fail with 401, which is acceptable).

### Acceptance Criteria

**AC-01**: Valid credentials return 200 with `accessToken`, `refreshToken`, `expiresIn`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/auth.controller.spec.ts` |
| Test case | `should return 200 with accessToken and refreshToken for valid credentials` |
| Must fail if | Response body is missing `accessToken` or `refreshToken` for a valid login |

**AC-02**: Invalid credentials return 401.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/auth.controller.spec.ts` |
| Test case | `should return 401 for invalid credentials` |
| Must fail if | Controller returns anything other than 401 for bad credentials |

**AC-03**: Duplicate login with same idempotency key within 30 s returns cached response.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/auth.service.spec.ts` |
| Test case | `should return cached response on duplicate login within 30s idempotency window` |
| Must fail if | `AuthService.login()` executes login logic twice for two requests with the same key within 30 s |

**AC-04**: Valid refresh token returns new `accessToken` AND new `refreshToken` (rotation).

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/auth.controller.spec.ts` |
| Test case | `should return 200 with new accessToken and new refreshToken for valid refresh token` |
| Must fail if | Refresh endpoint does not issue a new `refreshToken` alongside `accessToken`, or the response body lacks either field |

**AC-05**: Expired or invalid refresh token returns 401.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/auth.controller.spec.ts` |
| Test case | `should return 401 for expired or invalid refresh token` |
| Must fail if | Refresh endpoint returns 200 for an expired refresh token |

**AC-06**: Old refresh token is rejected after rotation (Redis key deleted).

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/auth.service.spec.ts` |
| Test case | `should return 401 when the old refresh token is used after rotation` |
| Must fail if | `AuthService.refresh()` accepts a refresh token whose Redis key has already been deleted by a prior rotation |

**AC-07**: Login stores refresh token hash in Redis with 7-day TTL.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/auth/auth.service.spec.ts` |
| Test case | `should store SHA-256 hash of refresh token in Redis with TTL 604800 on login` |
| Must fail if | Redis `SET` is not called with the correct key pattern `gateway:refresh-token:<hash>` and TTL 604800 after a successful login |

---

## T10 — Proxy Routing Module

**Status**: TODO

### Files Affected
- `api-gateway/src/routing/routing.module.ts`
- `api-gateway/src/routing/route-table.config.ts`
- `api-gateway/src/routing/proxy-routing.controller.ts`
- `api-gateway/src/routing/proxy-routing.controller.spec.ts`

### Description
Implement the route table in `route-table.config.ts` mapping path prefixes to downstream service URLs (loaded from `ConfigService`):

| Prefix | Env var |
|---|---|
| `/api/v1/bookings` | `BOOKING_SERVICE_URL` |
| `/api/v1/policies` | `POLICY_SERVICE_URL` |
| `/api/v1/travelers` | `TRAVELER_SERVICE_URL` |
| `/api/v1/payments` | `PAYMENT_SERVICE_URL` |
| `/api/v1/inventory` | `INVENTORY_SERVICE_URL` |
| `/api/v1/expenses` | `EXPENSE_SERVICE_URL` |

Implement `ProxyRoutingController` with a catch-all handler (`@All('*')`) that resolves the correct downstream URL from the route table, then calls `ProxyHttpClient` with the full path, method, headers, query params, and body. Apply `JwtAuthGuard` and `RolesGuard` globally (registered in `AppModule`). Forward `X-Correlation-ID` and `Idempotency-Key` from request context (set by T04 and `IdempotencyMiddleware`). Return the downstream response status, headers, and body to the client unchanged.

### Acceptance Criteria

**AC-01**: Request to `/api/v1/bookings/bkg-001` is routed to `BOOKING_SERVICE_URL/api/v1/bookings/bkg-001`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-routing.controller.spec.ts` |
| Test case | `should route /api/v1/bookings/** to booking-service URL` |
| Must fail if | `ProxyHttpClient` is called with a URL other than `BOOKING_SERVICE_URL + /api/v1/bookings/bkg-001` |

**AC-02**: All six service prefixes resolve to their correct downstream URLs.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-routing.controller.spec.ts` |
| Test case | `should resolve all six service prefixes to correct downstream URLs` |
| Must fail if | Any one of the six prefixes maps to the wrong URL |

**AC-03**: Unmatched route returns 404.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-routing.controller.spec.ts` |
| Test case | `should return 404 for unrecognised route prefix` |
| Must fail if | An unmatched route does not result in a 404 response |

**AC-04**: Response status, body, and headers from downstream are returned unchanged to client.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/routing/proxy-routing.controller.spec.ts` |
| Test case | `should return downstream response status and body unchanged` |
| Must fail if | Response status or body is modified by the proxy layer |

---

## T11 — Health Controller

**Status**: TODO

### Files Affected
- `api-gateway/src/health/health.controller.ts`
- `api-gateway/src/health/health.controller.spec.ts`

### Description
Implement `HealthController` with two endpoints, both exempt from `JwtAuthGuard`, `RolesGuard`, and `ThrottlerGuard`:

1. **`GET /health`**: Returns `{ status: 'ok', service: 'api-gateway', timestamp: '<ISO>' }` with HTTP 200. Used by Kubernetes liveness/readiness probes.
2. **`GET /metrics`**: Delegates to `prom-client` default registry's `metrics()` method and returns Prometheus plain-text format with `Content-Type: text/plain; version=0.0.4`.

Note: `/health` and `/metrics` do not use the `/api/v1` global prefix (configure with `@Controller()` and exclude from global prefix in `main.ts`).

### Acceptance Criteria

**AC-01**: `GET /health` returns 200 with `{ status: 'ok', service: 'api-gateway' }` — no auth required.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/health/health.controller.spec.ts` |
| Test case | `should return 200 with health status without authentication` |
| Must fail if | `/health` returns anything other than 200, or requires a JWT |

**AC-02**: `GET /metrics` returns 200 with Prometheus plain-text content type.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/health/health.controller.spec.ts` |
| Test case | `should return 200 with text/plain Prometheus metrics format` |
| Must fail if | `/metrics` returns JSON, HTML, or a non-200 status |

---

## T12 — Idempotency Key Forwarding Middleware

**Status**: TODO

### Files Affected
- `api-gateway/src/common/middleware/idempotency.middleware.ts`
- `api-gateway/src/common/middleware/idempotency.middleware.spec.ts`

### Description
Implement `IdempotencyMiddleware` implementing `NestMiddleware`. On every request: (1) Read `Idempotency-Key` header. (2) If absent, generate UUID v4. (3) Attach the key to `request['idempotencyKey']` so downstream interceptors and `ProxyHttpClient` can forward it. Apply middleware globally for all routes via `AppModule.configure()`. The middleware does NOT perform dedup caching for arbitrary routes (that is handled at the service level for auth/login in T09); it only ensures the key exists on the request.

### Acceptance Criteria

**AC-01**: Provided `Idempotency-Key` is preserved on `request['idempotencyKey']`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/middleware/idempotency.middleware.spec.ts` |
| Test case | `should preserve provided Idempotency-Key header on request context` |
| Must fail if | `request['idempotencyKey']` differs from the provided header value |

**AC-02**: Missing `Idempotency-Key` is auto-generated as UUID v4.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/common/middleware/idempotency.middleware.spec.ts` |
| Test case | `should generate UUID v4 when Idempotency-Key header is absent` |
| Must fail if | `request['idempotencyKey']` is null/undefined when no key was provided |

---

## T13 — Observability Instrumentation

**Status**: TODO

### Files Affected
- `api-gateway/src/observability/observability.module.ts`
- `api-gateway/src/observability/metrics.service.ts`
- `api-gateway/src/observability/tracing.service.ts`
- `api-gateway/src/observability/metrics.service.spec.ts`
- `api-gateway/src/observability/tracing.service.spec.ts`

### Description
Implement `MetricsService` using `prom-client`. Register and export the following metrics:

| Metric name | Type | Labels |
|---|---|---|
| `http_requests_total` | Counter | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | Histogram (buckets: 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5) | `method`, `route` |
| `retry_count` | Counter | `service`, `outcome` (retry\|exhausted\|success) |
| `circuit_state` | Gauge | `service` |
| `circuit_breaker_errors_total` | Counter | `service` |
| `cache_hit_total` | Counter | `type` (rate_limit) |
| `cache_miss_total` | Counter | `type` (rate_limit) |

`MetricsService` exposes typed methods: `incrementHttpRequests(method, route, statusCode)`, `recordHttpDuration(method, route, durationSeconds)`, `incrementRetryCount(service, outcome)`, `setCircuitState(service, state: 0|0.5|1)`, `incrementCircuitBreakerErrors(service)`, `incrementCacheHit(type)`, `incrementCacheMiss(type)`.

Implement `TracingService` using `@opentelemetry/sdk-node` and `@opentelemetry/auto-instrumentations-node`. Configure Jaeger exporter with `JAEGER_ENDPOINT` env var (defaults to `http://localhost:14268/api/traces`). Each span MUST include `correlation_id` attribute from request context.

`RequestLoggingInterceptor` (T05) calls `MetricsService.incrementHttpRequests()` and `MetricsService.recordHttpDuration()` after each request. `CircuitBreakerService` (T06) calls `MetricsService.setCircuitState()` and `MetricsService.incrementCircuitBreakerErrors()`. `ProxyHttpClient` (T07) calls `MetricsService.incrementRetryCount()`. `RedisThrottlerStore` (T08) calls `MetricsService.incrementCacheHit()` and `MetricsService.incrementCacheMiss()`.

### Acceptance Criteria

**AC-01**: `http_requests_total` counter is incremented with correct labels on each request.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/observability/metrics.service.spec.ts` |
| Test case | `should increment http_requests_total with method, route, and status_code labels` |
| Must fail if | Counter value is not incremented or labels are missing/incorrect |

**AC-02**: `circuit_state` gauge reflects correct state (0, 0.5, 1) after state transitions.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/observability/metrics.service.spec.ts` |
| Test case | `should set circuit_state gauge to 1 when setCircuitState(service, 1) is called` |
| Must fail if | Gauge value does not match the value passed to `setCircuitState()` |

**AC-03**: `retry_count` counter is incremented with `service` and `outcome` labels.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/observability/metrics.service.spec.ts` |
| Test case | `should increment retry_count with correct service and outcome labels` |
| Must fail if | Counter is incremented without labels or with wrong label values |

**AC-04**: `cache_hit_total` and `cache_miss_total` counters are incremented with `type=rate_limit` label.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/observability/metrics.service.spec.ts` |
| Test case | `should increment cache_hit_total and cache_miss_total with type label` |
| Must fail if | Either counter is missing the `type` label on increment |

**AC-05**: `circuit_breaker_errors_total` is incremented on breaker error event.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/observability/metrics.service.spec.ts` |
| Test case | `should increment circuit_breaker_errors_total with service label` |
| Must fail if | Counter does not increment when `incrementCircuitBreakerErrors(service)` is called |

**AC-06**: OpenTelemetry tracer initialises without error and `correlation_id` attribute is included in spans.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/src/observability/tracing.service.spec.ts` |
| Test case | `should initialise tracer and create a span with correlation_id attribute` |
| Must fail if | `TracingService.getTracer()` throws or a test span does not contain `correlation_id` |

---

## T14 — End-to-End Wiring and Integration Smoke Test

**Status**: TODO

### Files Affected
- `api-gateway/src/app.module.ts` (final wiring of all modules)
- `api-gateway/src/common/filters/http-exception.filter.ts`
- `api-gateway/src/main.ts` (global filter, pipes, interceptors registration)
- `api-gateway/test/app.e2e-spec.ts`

### Description
Wire all modules together in `AppModule`: `ConfigModule`, `AuthModule`, `RateLimitModule`, `CircuitBreakerModule`, `RoutingModule`, `HealthModule`, `ObservabilityModule`. Register global interceptors (`CorrelationIdInterceptor`, `RequestLoggingInterceptor`) and middleware (`IdempotencyMiddleware`) in `AppModule`. Implement `HttpExceptionFilter` normalising all `HttpException` errors to the standard error schema defined in design.md §8 (including `correlationId` from `request['correlationId']`).

Write an integration smoke test in `test/app.e2e-spec.ts` using `@nestjs/testing` `TestingModule` and `supertest`. The smoke test verifies the critical paths with a mocked downstream (no real services required):

1. `GET /health` → 200
2. `POST /api/v1/auth/login` with valid creds (mocked `AuthService`) → 200 with `accessToken`
3. Authenticated `GET /api/v1/bookings` (mocked `ProxyHttpClient`) → forwarded response
4. Unauthenticated `GET /api/v1/bookings` → 401
5. Rate limit enforced (101st request) → 429
6. `GET /metrics` → 200 with `text/plain`

### Acceptance Criteria

**AC-01**: `GET /health` returns 200 without authentication in the integrated app.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/app.e2e-spec.ts` |
| Test case | `should return 200 on GET /health without authentication` |
| Must fail if | `/health` returns non-200 or requires a JWT in the integrated app |

**AC-02**: Unauthenticated request to a protected route returns 401 in the integrated app.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/app.e2e-spec.ts` |
| Test case | `should return 401 for unauthenticated request to protected route` |
| Must fail if | Protected route returns anything other than 401 when no JWT is provided |

**AC-03**: Authenticated request with valid JWT is proxied to downstream (mocked).

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/app.e2e-spec.ts` |
| Test case | `should proxy authenticated request to mocked booking-service` |
| Must fail if | `ProxyHttpClient` is not called or response is not returned to the client |

**AC-04**: `POST /api/v1/auth/login` with valid credentials returns `accessToken`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/app.e2e-spec.ts` |
| Test case | `should return accessToken on successful login` |
| Must fail if | Login endpoint returns non-200 or response body lacks `accessToken` |

**AC-05**: `GET /metrics` returns 200 with `Content-Type: text/plain`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/app.e2e-spec.ts` |
| Test case | `should return Prometheus metrics on GET /metrics` |
| Must fail if | `/metrics` returns non-200 or `Content-Type` is not `text/plain` |

**AC-06**: `HttpExceptionFilter` normalises all errors to standard schema including `correlationId`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/app.e2e-spec.ts` |
| Test case | `should return standard error schema with correlationId on 401 response` |
| Must fail if | Error response body is missing `error`, `message`, `correlationId`, or `timestamp` fields |

---

## T15 — Contract Tests for Auth API Endpoints

**Status**: TODO

### Files Affected
- `api-gateway/test/contracts/auth.contract.spec.ts`
- `api-gateway/package.json` (add `@pact-foundation/pact` or supertest schema validation)

### Description
Implement contract tests for the two public-facing API contracts issued by the gateway:

1. **`POST /api/v1/auth/login`**: Verify that the response body always matches `{ accessToken: string (JWT), refreshToken: string (JWT), expiresIn: number }`. Test against a real NestJS test application instance (not mocked AuthService) using `@nestjs/testing` + supertest. Include: valid login → 200 with correct shape; missing email → 400; missing password → 400; invalid credentials (mocked Traveler Service returns 401) → 401.

2. **`POST /api/v1/auth/refresh`**: Verify that the response body matches `{ accessToken: string (JWT), refreshToken: string (JWT), expiresIn: number }` on success, and `{ error: string, message: string, correlationId: string, timestamp: string }` on failure. Include: valid refresh → 200 with rotation; missing refreshToken field → 400; expired/invalid token → 401.

The contract tests MUST run against a real NestJS application (not fully mocked) with Redis stubbed via ioredis-mock or a Testcontainers Redis instance. The response shape MUST match the OpenAPI schemas exactly.

### Acceptance Criteria

**AC-01**: `POST /api/v1/auth/login` response on success matches schema `{ accessToken: JWT, refreshToken: JWT, expiresIn: 28800 }`.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/contracts/auth.contract.spec.ts` |
| Test case | `POST /api/v1/auth/login should return accessToken, refreshToken, and expiresIn matching contract schema` |
| Must fail if | Response body is missing any of `accessToken`, `refreshToken`, or `expiresIn`, or any field has wrong type |

**AC-02**: `POST /api/v1/auth/login` with missing `email` field returns 400 matching error schema.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/contracts/auth.contract.spec.ts` |
| Test case | `POST /api/v1/auth/login with missing email should return 400 with standard error schema` |
| Must fail if | Response status is not 400, or response body is missing `error`, `message`, `correlationId`, or `timestamp` |

**AC-03**: `POST /api/v1/auth/refresh` response on success matches schema (rotation: new accessToken + new refreshToken).

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/contracts/auth.contract.spec.ts` |
| Test case | `POST /api/v1/auth/refresh should return new accessToken and refreshToken matching contract schema` |
| Must fail if | Response body is missing `refreshToken` or returns the same refreshToken as the input |

**AC-04**: `POST /api/v1/auth/refresh` with missing `refreshToken` field returns 400.

| Attribute | Value |
|---|---|
| Test file | `api-gateway/test/contracts/auth.contract.spec.ts` |
| Test case | `POST /api/v1/auth/refresh with missing refreshToken should return 400 with standard error schema` |
| Must fail if | Response status is not 400 |
