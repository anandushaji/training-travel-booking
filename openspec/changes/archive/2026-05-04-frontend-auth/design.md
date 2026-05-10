# Design: Authentication Feature (SM-FE-02)

## Pattern Selection Log

| Pattern | Decision | Rationale |
|---|---|---|
| Database-per-service | Not applicable | Frontend module — no database or data store |
| CQRS | Not applicable | Redux slice is read/write but operates in a single-process browser context; no separate command/query services |
| Saga (Choreography) | Not applicable | Login is synchronous; no multi-service distributed transaction |
| Saga (Orchestration) | Not applicable | Same as above |
| Outbox | Not applicable | No event publishing from the frontend |
| Idempotency | Not applicable | Login POST is user-initiated; duplicate logins simply re-authenticate. Refresh tokens are single-use by the api-gateway (rotation enforced server-side) |
| Timeouts | Already in place | `baseQueryWithTimeout` (SM-FE-01) enforces 10 s per request; no additional frontend config needed |
| Retries | Already in place | `baseQueryWithRetry` (SM-FE-01) restricts retries to SAFE_METHODS (GET/HEAD/OPTIONS); login + refresh are POST — they correctly receive no retry |
| Circuit Breaker | Not applicable | No per-dependency failure threshold tracking at frontend layer; backend circuit breakers protect downstream services |
| Bulkheads | Not applicable | Single-threaded JavaScript; no thread pool isolation needed |
| Cache-aside | Not applicable | Auth tokens are not cached in a cache store; they live in Redux memory |
| Read-through | Not applicable | Same reason as Cache-aside |
| Write-through | Not applicable | Same reason |
| Cache Invalidation | **Applied** | On `logout`, `baseApi.util.resetApiState()` evicts all RTK Query cached data to prevent the next user from seeing the previous user's data |

**Applied patterns**: Cache Invalidation  
**Architectural assumptions**:
- API Gateway at `REACT_APP_API_URL/api/v1`; auth endpoints per `openapi-api-gateway.yaml`
- Tokens are in-memory only; page-refresh session loss is accepted (ADR-005)
- `refreshToken` in Redis expires after 7 d server-side

---

## Architecture Overview

```
Browser (Redux store)
│
│  auth.accessToken  ──────────────────────────────────────────────────┐
│  auth.refreshToken                                                    │
│  auth.user                                                            ▼
│                                                        baseQueryWithReauth
│                                                               │
│  RTK Query (all feature endpoints)  ────────────────────────►│
│                                                               │
│    1. Attach Authorization: Bearer <accessToken>              │
│    2. Forward to baseQueryWithRetry → baseQueryWithTimeout    │
│    3. On 401: refresh → setCredentials → retry once           │
│    4. On second 401: dispatch logout → PrivateRoute redirects │
│                                                               │
│                                                    API Gateway :4000
│                                                       POST /api/v1/auth/login
│                                                       POST /api/v1/auth/refresh
│                                                       POST /api/v1/auth/logout
│                                                       (+ all protected routes)
│
│  LoginPage ──► LoginForm ──► authApi.useLoginMutation()
│                              ──► dispatch(setCredentials)
│                              ──► navigate(location.state.from ?? '/')
│
│  PrivateRoute reads auth.accessToken: null → /login redirect
│
│  RoleGuard reads auth.user.role: renders children | null
```

---

## Data Model / Schema Changes

### Redux State — `auth` slice

```typescript
interface AuthState {
  accessToken: string | null;   // HS256 JWT, TTL 8 h; null when unauthenticated
  refreshToken: string | null;  // HS256 JWT, TTL 7 d; null when unauthenticated
  user: JwtUserPayload | null;  // decoded from accessToken at login
  isAuthenticated: boolean;     // derived: accessToken !== null
}

interface JwtUserPayload {
  id: string;        // sub claim — traveler UUID
  email: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
  exp: number;       // expiry epoch seconds
  iat: number;       // issued-at epoch seconds
}
```

**No persisted state** — Redux store is in-memory; no `localStorage`,
no `IndexedDB`, no cookies. This is a deliberate ADR-005 security
constraint (XSS mitigation). The trade-off is that users must re-login
after a hard page refresh.

### No database changes

This is a pure frontend module. The server-side refresh token storage
(Redis key `gateway:refresh-token:<sha256(token)>`) is owned by the API
Gateway service (already implemented per the archived api-gateway spec).

---

## API / Interface Contracts

Per `docs/contracts/openapi/openapi-api-gateway.yaml`:

### `POST /api/v1/auth/login`

**Request**:
```json
{ "email": "alice@corp.com", "password": "S3cure!Pass" }
```

**Response 200**:
```json
{
  "accessToken": "<HS256 JWT>",
  "refreshToken": "<HS256 JWT>",
  "expiresIn": 28800,
  "user": { "id": "<uuid>", "email": "alice@corp.com", "role": "EMPLOYEE" }
}
```

**Errors**: 400 (validation), 401 (invalid credentials), 503 (gateway down)

### `POST /api/v1/auth/refresh`

**Request**: `{ "refreshToken": "<HS256 JWT>" }`  
**Response 200**: same schema as login  
**Errors**: 401 (token invalid/expired/already rotated)

### `POST /api/v1/auth/logout`

**Request**: `{ "refreshToken": "<HS256 JWT>" }`  
**Response 204**: no body  
**Errors**: 401 (access token missing/invalid)

---

## Resilience Design

### Timeouts — Already in place (SM-FE-01)

`baseQueryWithTimeout` enforces `REQUEST_TIMEOUT_MS = 10_000` on every
request including login. A timed-out login results in a `FETCH_ERROR`
which `LoginForm` surfaces as a generic "Network error — please try again"
message.

### Retries — No additional design (SM-FE-01 behaviour is correct)

`baseQueryWithRetry` SAFE_METHODS restriction correctly prevents automatic
retry of `POST /auth/login` and `POST /auth/refresh`. Login retry is
user-initiated (re-submitting the form).

### Token Refresh (Reauth)

`baseQueryWithReauth` implements the single-reauth pattern:

```
call = await baseQueryWithRetry(args, api, extraOptions)   // with Bearer token
if (call.error?.status === 401) {
  refresh = await fetch POST /auth/refresh with stored refreshToken  // direct call, no retry
  if (refresh.ok) {
    dispatch(setCredentials(refresh.data))
    call = await baseQueryWithRetry(args, api, extraOptions) // retry ONCE with new token
  } else {
    dispatch(logout())
    // return 401 error to caller
  }
}
return call
```

**Mutex lock**: A `mutex` (using a simple `Promise` flag) prevents
concurrent 401 handlers from issuing multiple refresh requests. The first
handler acquires the mutex, refreshes, releases; subsequent concurrent 401
handlers wait and then retry with the already-refreshed token.

---

## Caching Design

### Cache Invalidation on Logout

On `authSlice.logout`:
1. `authSlice` reducer clears `accessToken`, `refreshToken`, `user`.
2. `App.tsx` (or via RTK middleware) calls `store.dispatch(baseApi.util.resetApiState())`.
3. All RTK Query cached data (bookings, flights, profile, expenses) is evicted.
4. `PrivateRoute` detects `accessToken === null` and redirects to `/login`.

This ensures multi-user scenarios (shared terminal) do not leak cached
data to the next user.

**Consistency window**: Zero — invalidation is synchronous with the
`logout` action dispatch.

---

## Error Handling

| Error | User-facing response | Log level |
|---|---|---|
| Login 401 (wrong password) | "Invalid email or password" inline form error | `info` |
| Login 503 (gateway down) | "Service unavailable — please try again" toast | `warn` |
| Login timeout | "Network error — please try again" toast | `warn` |
| Refresh 401 (expired/rotated) | Dispatch `logout` → redirect to `/login` + "Session expired" toast | `info` |
| Refresh network error | Dispatch `logout` → redirect to `/login` | `warn` |
| Logout failure | Silent (best-effort) | `debug` |

---

## Security Considerations

- **Token storage**: Redux memory only. No `localStorage`, `sessionStorage`,
  or cookies (ADR-005). Trade-off: tokens lost on page refresh.
- **XSS mitigation**: Tokens never exposed to `window` or serialised DOM.
  RTK Query `prepareHeaders` injects the Bearer token from Redux state
  in-memory.
- **Refresh token rotation**: Enforced server-side (api-gateway Redis key
  deleted on each use). Frontend simply stores the latest pair.
- **Mutex on refresh**: Prevents a race where two concurrent 401 responses
  each attempt a refresh, causing the second to fail with "already rotated"
  and incorrectly logging the user out.
- **Input validation**: Zod schema in `LoginForm` validates email format
  and password minimum length client-side before API call.
- **No sensitive data in logs**: Log payloads must never include
  `password`, `accessToken`, or `refreshToken` — only `userId`, `email`,
  and `role`.

---

## Observability

### Structured log events (logger.ts from SM-FE-01)

| Event | Level | Context fields |
|---|---|---|
| Login success | `info` | `{ userId, email, role }` |
| Login failure (401) | `info` | `{ email }` — no password |
| Login failure (network) | `warn` | `{ statusCode, correlationId }` |
| Token refresh success | `info` | `{ userId }` |
| Token refresh failure | `warn` | `{ statusCode, correlationId }` |
| Logout (user-initiated) | `info` | `{ userId }` |
| Logout (forced — session expired) | `info` | `{ userId, reason: 'token_expired' }` |

### Metrics (metrics.ts from SM-FE-01)

| Metric | Type | Labels |
|---|---|---|
| `frontend_auth_login_total` | Counter | `outcome: success\|failure`, `reason: invalid_credentials\|network\|timeout` |
| `frontend_auth_refresh_total` | Counter | `outcome: success\|failure` |
| `frontend_auth_logout_total` | Counter | `reason: user_initiated\|session_expired` |

---

## Dependencies on Other Changes

| Change | Dependency |
|---|---|
| SM-FE-01 (frontend-foundation) | `baseQueryWithRetry`, `baseQueryWithTimeout`, `baseApi`, `notificationSlice`, `logger`, `metrics`, `store`, `rootReducer`, `PrivateRoute`, `AppRoutes`, common components (`Button`, `TextInput`, `FormField`) |
| api-gateway (archived) | `POST /api/v1/auth/login`, `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` endpoints; JWT token shape |
