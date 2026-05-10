# Proposal: API Gateway Service (SM-02)

**Change ID**: api-gateway  
**Domain**: api-gateway  
**Status**: Proposed  
**Date**: 2026-05-02  
**Author**: spec-generator  
**Prerequisite**: SM-01 (`@travel/shared` package available)

---

## 1. Intent

Implement the NestJS API Gateway (port 4000) as the single, authenticated entry point for the React SPA and all downstream microservices. The gateway centralises JWT authentication, role-based access control (RBAC), rate limiting, circuit breaking, request/response logging, and reverse-proxy routing, eliminating the need for each microservice to repeat these cross-cutting concerns.

---

## 2. Background

The Corporate Travel Portal currently exposes six microservices (booking, policy, traveler, payment, inventory, expense) as independent NestJS applications on ports 3001–3006. Without a unified gateway:

- Every client call must know each service's port and URL.
- Cross-cutting concerns (auth, rate limiting) must be duplicated across services.
- There is no single place to enforce company-wide security policy (ADR-005, ADR-006).
- Correlation ID propagation for distributed tracing (ADR-007) has no consistent origin point.

ADR-006 (Accepted) mandates a centralised API Gateway with auth, rate limiting, and circuit breaking.

---

## 3. In Scope

| Area | Detail |
|---|---|
| JWT Authentication Guard | `JwtAuthGuard` using `@nestjs/passport` + `passport-jwt`; validates HS256 tokens signed with `JWT_SECRET`; extracts `JwtPayload` (sub, email, role, exp) |
| RBAC Roles Guard | `RolesGuard` + `@Roles()` decorator; enforces EMPLOYEE / MANAGER / ADMIN role hierarchy |
| Rate Limiting | `@nestjs/throttler` backed by Redis; 100 req/15 min per user (global); 30 req/min for search routes; 429 on exceeded |
| Circuit Breaker | One `opossum` instance per downstream service; threshold 50% errors over 10 req / 30 s window; 503 fallback; half-open 30 s, full recovery 60 s |
| Request / Response Logging | Winston structured JSON interceptor; logs method, path, status, latency, correlationId on every request/response; never logs Bearer token |
| X-Correlation-ID Propagation | Auto-generates UUID v4 if header absent; attaches to outbound proxied request; returns in response header |
| Reverse-Proxy Routing | Route table for all six downstream services; preserves path suffix, query params, headers, and body; strips `/api/v1` prefix where needed |
| Auth Endpoints | `POST /api/v1/auth/login` — validates credentials and returns JWT; `POST /api/v1/auth/refresh` — issues new access token from refresh token |
| Health / Metrics Endpoints | `GET /health` — Kubernetes liveness/readiness (no auth); `GET /metrics` — Prometheus scrape endpoint (no auth) |
| Idempotency Key Forwarding | Extracts or auto-generates `Idempotency-Key` (UUID); forwards downstream; deduplicates auth/login POSTs within 30 s Redis window |
| Observability Instrumentation | Prometheus counters/histograms, OpenTelemetry traces, per-pattern signals (circuit state, retry count, cache hit/miss) |
| Docker Compose Integration | `api-gateway` service in `docker-compose.yml` with all env vars (`JWT_SECRET`, `*_SERVICE_URL`, `REDIS_URL`) |

---

## 4. Out of Scope

| Excluded | Reason |
|---|---|
| ~~JWT issuance by the gateway~~ | ~~In v1, each microservice issues its own tokens; the gateway validates only~~ — **Superseded by OQ-02 decision**: the gateway IS the sole JWT issuer; downstream services validate only |
| Business logic (booking, policy, etc.) | Belongs to the respective bounded context services |
| WebSocket proxying | Not required in v1; can be added in a future change |
| Frontend SPA serving | Served independently on port 3000 |
| Service-level OpenAPI documentation | Each service owns its own OpenAPI spec; the gateway documents auth endpoints only |
| Kafka event publishing | The gateway is not an event producer |
| Database (PostgreSQL / MongoDB) | The gateway owns no domain data |

---

## 5. Microservice Patterns Applied

| Pattern | Applied? | Summary |
|---|---|---|
| Idempotency | Yes | `Idempotency-Key` forwarded to all downstream calls; auth/login deduplication within 30 s Redis window |
| Timeouts | Yes | All proxied HTTP calls: connect 2 s, read 10 s; returns 504 on breach |
| Retries | Yes | 3 retries (4 total) on 500/502/503/504/408; exponential backoff base 200 ms, max 5 s, jitter; 4xx fails immediately |
| Circuit Breaker | Yes | One opossum instance per downstream service; 50%/10 req/30 s; 503 fallback; 30 s half-open, 60 s full recovery |
| Cache-aside (rate limit) | Yes | Redis key `gateway:rate-limit:<userId>` with 15 min TTL; sliding window counter |

---

## 6. Acceptance Summary

The change is complete when:

1. All 14 tasks in `tasks.md` are implemented and pass their verification artifacts.
2. `npm run test:coverage` reports ≥ 80 % for `api-gateway/src/`.
3. `GET /health` returns 200 with no auth.
4. `POST /api/v1/auth/login` with valid credentials returns a signed JWT.
5. A request to a proxied route without a token returns 401.
6. A request to a Manager-only route with an EMPLOYEE token returns 403.
7. Exceeding 100 requests within a 15-min window returns 429.
8. A simulated downstream 503 triggers the circuit breaker and returns 503 after the threshold.
9. All log lines contain `correlationId` and no Bearer token value.
10. Prometheus `/metrics` exposes `http_requests_total`, `circuit_state`, `retry_count`, `cache_hit_total`, `cache_miss_total`.

---

## 7. Open Questions

| # | Question | Options | Impact if Deferred |
|---|---|---|---|
| OQ-01 | Should the gateway rotate the refresh token on each use (rotation strategy) or return the same token until expiry (reuse strategy)? | (a) Rotation — issues a new refresh token and invalidates the old one; requires Redis token store. (b) Reuse — simpler, but refresh token theft is not detectable. | Low for v1; affects T09 (auth controller) and T02 (JWT strategy). Default to **reuse** if not resolved before implementation. | **DECIDED: ROTATE** — On `POST /api/v1/auth/refresh`, issue a new access token + new refresh token. The old refresh token is invalidated (deleted from Redis). Requires Redis refresh token store (see design.md §9). Impacts T02 (AuthService token-issuance logic) and T09 (Auth controller refresh endpoint). |
| OQ-02 | Should the gateway issue JWTs itself (centralised issuance) or remain validate-only with each service issuing its own token? | (a) Gateway-issued — single source of truth for auth; simplifies services. (b) Service-issued (current v1 plan) — each service must manage `JWT_SECRET`; gateway validates only. | Affects T02 and T09 significantly. Default to **validate-only** per current SM-02 scope. | **DECIDED: Gateway issues tokens** — The API Gateway is the sole JWT issuer. `POST /api/v1/auth/login` forwards credentials to Traveler Service `POST /travelers/auth`, receives `userId` + `roles`, then signs and returns the access + refresh token pair. Downstream services receive and validate JWTs but never issue them. All downstream services share `JWT_SECRET` for validation only. Impacts T02 (AuthService), T09 (Auth controller login + refresh), and the Out of Scope row above. |

---

## 8. Dependencies

| Dependency | Type | Status |
|---|---|---|
| `@travel/shared` (SM-01) | Code package | Done — provides `JwtPayload`, `DomainException`, shared DTOs |
| Redis 7 | Infrastructure | Available per PROJECT.md §6 |
| `opossum` library | NPM package | Available per ADR-011 |
| `@nestjs/passport`, `passport-jwt` | NPM packages | Standard, no ADR required |
| `@nestjs/throttler` | NPM package | Standard, no ADR required |
| `@opentelemetry/*` | NPM packages | Standard per ADR-007 |
| `winston` | NPM package | Standard per PROJECT.md §8 |
