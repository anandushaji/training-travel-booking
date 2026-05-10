# Delta Spec: Authentication Feature (SM-FE-02)

**Change ID**: frontend-auth  
**Domain**: frontend-auth  
**Spec type**: ADDED (new feature slice — all requirements are additive)  
**Date**: 2026-05-04  
**Status**: Proposed  
**Prerequisites**: frontend-foundation (SM-FE-01 — archived)

> **Delta convention**: This file contains only ADDED requirements. The
> existing `frontend-foundation` spec is not modified. All new files are
> under `src/features/auth/` unless stated otherwise.

---

## REQ-AUTH-01: Auth Redux Slice

The system SHALL provide an `authSlice` with state shape
`{ accessToken: string|null, refreshToken: string|null, user: JwtUserPayload|null, isAuthenticated: boolean }`
and actions `setCredentials(TokenPairResponse)` and `logout()`.
`isAuthenticated` MUST be a derived flag (`accessToken !== null`), not a
separate field subject to inconsistency.

The slice MUST be registered in `rootReducer.ts` under the key `auth` so
that `PrivateRoute` (SM-FE-01) can read `state.auth.accessToken`.

### Scenario REQ-AUTH-01-S01 — setCredentials stores token pair and user

```
GIVEN the Redux store is initialised with auth: { accessToken: null, refreshToken: null, user: null }
WHEN dispatch(setCredentials({ accessToken: "at", refreshToken: "rt", expiresIn: 28800, user: { id: "u1", email: "a@b.com", role: "EMPLOYEE" } }))
THEN state.auth.accessToken === "at"
  AND state.auth.refreshToken === "rt"
  AND state.auth.user.id === "u1"
  AND state.auth.isAuthenticated === true
```

**Verification artifact**: `src/features/auth/__tests__/authSlice.spec.ts`

### Scenario REQ-AUTH-01-S02 — logout clears all auth state

```
GIVEN state.auth.accessToken is "at" and state.auth.user is { id: "u1", ... }
WHEN dispatch(logout())
THEN state.auth.accessToken === null
  AND state.auth.refreshToken === null
  AND state.auth.user === null
  AND state.auth.isAuthenticated === false
```

**Verification artifact**: `src/features/auth/__tests__/authSlice.spec.ts`

### Scenario REQ-AUTH-01-S03 — RTK Query cache is reset on logout

```
GIVEN the store contains populated RTK Query cache entries (bookings, flights)
WHEN dispatch(logout()) is dispatched
THEN store.dispatch(baseApi.util.resetApiState()) is called within the same synchronous tick
  AND all RTK Query cached entries are evicted
```

**Verification artifact**: `src/features/auth/__tests__/authSlice.spec.ts` — spy on `baseApi.util.resetApiState`

---

## REQ-AUTH-02: JWT Utility Helpers

The system SHALL provide `src/features/auth/jwt.utils.ts` with three
pure-function exports: `decodeJwt(token: string): JwtUserPayload`,
`isTokenExpired(token: string): boolean`, and `getPayload(token: string): JwtUserPayload | null`.

`decodeJwt` MUST NOT verify the signature (the API Gateway is the trust
boundary). It MUST base64url-decode the payload segment and parse JSON.

`isTokenExpired` MUST return `true` when `payload.exp * 1000 < Date.now()`.

`getPayload` MUST return `null` on any decode error rather than throwing.

### Scenario REQ-AUTH-02-S01 — decodeJwt extracts payload from a valid token

```
GIVEN a known HS256 JWT with payload { sub: "u1", email: "a@b.com", role: "EMPLOYEE", exp: 9999999999 }
WHEN decodeJwt(token) is called
THEN the returned object has id === "u1", email === "a@b.com", role === "EMPLOYEE"
```

**Verification artifact**: `src/features/auth/__tests__/jwt.utils.spec.ts`

### Scenario REQ-AUTH-02-S02 — isTokenExpired returns true for past exp

```
GIVEN a JWT with exp claim set to epoch 1 (1970-01-01T00:00:01Z)
WHEN isTokenExpired(token) is called
THEN the return value is true
```

**Verification artifact**: `src/features/auth/__tests__/jwt.utils.spec.ts`

### Scenario REQ-AUTH-02-S03 — getPayload returns null for a malformed token

```
GIVEN the string "not.a.jwt"
WHEN getPayload("not.a.jwt") is called
THEN the return value is null and no exception is thrown
```

**Verification artifact**: `src/features/auth/__tests__/jwt.utils.spec.ts`

---

## REQ-AUTH-03: Auth RTK Query Endpoints

The system SHALL provide `src/features/auth/authApi.ts` with two RTK Query
mutations injected into `baseApi`:

- `login(LoginRequest) → TokenPairResponse` — maps to `POST /api/v1/auth/login`
- `refresh(RefreshRequest) → TokenPairResponse` — maps to `POST /api/v1/auth/refresh`

A fire-and-forget `logoutApi` mutation (`POST /api/v1/auth/logout`) MUST
also be exported; its failure MUST NOT block the `logout` action dispatch.

Neither `login` nor `refresh` mutations may use `allowRetry: true`. They
inherit the SAFE_METHODS-only retry behaviour from `baseQueryWithRetry`
(SM-FE-01), meaning POST failures are returned immediately without retry.

### Scenario REQ-AUTH-03-S01 — login mutation calls POST /auth/login and returns token pair

```
GIVEN MSW intercepts POST /api/v1/auth/login and returns { accessToken: "at", refreshToken: "rt", expiresIn: 28800, user: { id: "u1", email: "a@b.com", role: "EMPLOYEE" } }
WHEN useLoginMutation trigger is called with { email: "a@b.com", password: "pass" }
THEN the mutation result contains data.accessToken === "at"
  AND data.user.role === "EMPLOYEE"
```

**Verification artifact**: `src/features/auth/__tests__/authApi.spec.ts`

### Scenario REQ-AUTH-03-S02 — login mutation surfaces 401 as error

```
GIVEN MSW intercepts POST /api/v1/auth/login and returns 401 { error: "Unauthorized", message: "Invalid credentials" }
WHEN useLoginMutation trigger is called with { email: "a@b.com", password: "wrong" }
THEN the mutation result contains error.status === 401
  AND no retry is attempted (POST is not in SAFE_METHODS)
```

**Verification artifact**: `src/features/auth/__tests__/authApi.spec.ts`

---

## REQ-AUTH-04: baseQueryWithReauth

The system SHALL provide `src/api/baseQueryWithReauth.ts` that wraps
`baseQueryWithRetry` (SM-FE-01) with two behaviours:

1. **Authorization injection**: every outbound request has
   `Authorization: Bearer <state.auth.accessToken>` prepended before
   `baseQueryWithRetry` is called. If `accessToken` is null, the header
   is omitted (login/refresh routes must not receive an auth header).

2. **Single-reauth on 401**: if `baseQueryWithRetry` returns `{ error: { status: 401 } }`,
   the wrapper MUST attempt one token refresh using the stored
   `state.auth.refreshToken`. On refresh success it dispatches
   `setCredentials` and retries the original request exactly once. On
   refresh failure it dispatches `logout()` and returns the 401 error.

A promise-based mutex MUST prevent concurrent 401 handlers from issuing
multiple refresh requests simultaneously.

`baseApi.ts` MUST be updated to use `baseQueryWithReauth` in place of
`baseQueryWithRetry`.

### Scenario REQ-AUTH-04-S01 — Bearer token is attached to every outgoing request

```
GIVEN state.auth.accessToken === "valid-at"
  AND MSW captures the Authorization header of the next API call
WHEN any RTK Query query or mutation is dispatched
THEN the captured header value is "Bearer valid-at"
```

**Verification artifact**: `src/api/__tests__/baseQueryWithReauth.spec.ts`

### Scenario REQ-AUTH-04-S02 — 401 triggers refresh and retries original request

```
GIVEN state.auth.accessToken === "expired-at"
  AND state.auth.refreshToken === "valid-rt"
  AND MSW returns 401 on the first call to GET /api/v1/bookings
  AND MSW returns 200 { accessToken: "new-at", refreshToken: "new-rt", ... } on POST /api/v1/auth/refresh
  AND MSW returns 200 { data: [] } on the second call to GET /api/v1/bookings
WHEN the RTK Query bookings query fires
THEN the final result contains data: []
  AND state.auth.accessToken === "new-at"
  AND POST /api/v1/auth/refresh was called exactly once
  AND GET /api/v1/bookings was called exactly twice
```

**Verification artifact**: `src/api/__tests__/baseQueryWithReauth.spec.ts`

### Scenario REQ-AUTH-04-S03 — Failed refresh dispatches logout

```
GIVEN state.auth.accessToken === "expired-at"
  AND state.auth.refreshToken === "expired-rt"
  AND MSW returns 401 on GET /api/v1/bookings
  AND MSW returns 401 on POST /api/v1/auth/refresh
WHEN the RTK Query bookings query fires
THEN dispatch(logout()) is called
  AND state.auth.accessToken === null
  AND the query result contains error.status === 401
```

**Verification artifact**: `src/api/__tests__/baseQueryWithReauth.spec.ts`

### Scenario REQ-AUTH-04-S04-A — Null refresh token skips refresh and dispatches logout

```
GIVEN state.auth.accessToken === "expired-at"
  AND state.auth.refreshToken === null
  AND any RTK Query request returns 401
WHEN baseQueryWithReauth handles the 401
THEN dispatch(logout()) is called immediately
  AND POST /api/v1/auth/refresh is NOT called
  AND the query result contains error.status === 401
```

**Verification artifact**: `src/api/__tests__/baseQueryWithReauth.spec.ts`

### Scenario REQ-AUTH-04-S05 — Mutex prevents concurrent refresh storms

```
GIVEN two concurrent RTK Query requests both return 401 simultaneously
  AND MSW returns 200 on the first POST /api/v1/auth/refresh
WHEN both 401 handlers run concurrently
THEN POST /api/v1/auth/refresh is called exactly once (not twice)
  AND both original requests are retried with the new access token
```

**Verification artifact**: `src/api/__tests__/baseQueryWithReauth.spec.ts`

### Scenario REQ-AUTH-04-S06 — Network failure during refresh dispatches logout

```
GIVEN state.auth.accessToken === "expired-at"
  AND state.auth.refreshToken === "valid-rt"
  AND MSW returns 401 on the original request
  AND the POST /api/v1/auth/refresh call results in a network error (FETCH_ERROR)
WHEN baseQueryWithReauth handles the 401
THEN dispatch(logout()) is called
  AND state.auth.accessToken === null
  AND the query result contains error.status matching "FETCH_ERROR" or equivalent network error
```

**Verification artifact**: `src/api/__tests__/baseQueryWithReauth.spec.ts`

---

## REQ-AUTH-05: useAuth Custom Hook

The system SHALL provide `src/common/hooks/useAuth.ts` that wraps
`authSlice` selectors and the `authApi` login mutation into a single hook
with the interface:

```typescript
interface UseAuthReturn {
  user: JwtUserPayload | null;
  isAuthenticated: boolean;
  login: (credentials: LoginRequest) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}
```

`login` MUST dispatch `setCredentials` on success and throw/reject on
failure so that `LoginForm` can catch and display errors.

`logout` MUST dispatch `authSlice.logout()` and call `logoutApi` best-effort
(fire-and-forget; failure is swallowed).

### Scenario REQ-AUTH-05-S01 — useAuth.login dispatches setCredentials on success

```
GIVEN MSW intercepts POST /api/v1/auth/login and returns a valid TokenPairResponse
WHEN useAuth().login({ email: "a@b.com", password: "pass" }) is awaited
THEN state.auth.isAuthenticated === true
  AND state.auth.user.email === "a@b.com"
```

**Verification artifact**: `src/common/hooks/__tests__/useAuth.spec.ts`

### Scenario REQ-AUTH-05-S02 — useAuth.login rejects on 401

```
GIVEN MSW intercepts POST /api/v1/auth/login and returns 401
WHEN useAuth().login({ email: "a@b.com", password: "wrong" }) is awaited
THEN the promise rejects with an error message containing "Invalid credentials" or equivalent
  AND state.auth.isAuthenticated === false
```

**Verification artifact**: `src/common/hooks/__tests__/useAuth.spec.ts`

### Scenario REQ-AUTH-05-S03 — useAuth.logout does not throw when logoutApi fails

```
GIVEN state.auth is authenticated with a valid user
  AND MSW returns 500 on POST /api/v1/auth/logout
WHEN useAuth().logout() is called
THEN no exception is thrown
  AND state.auth.accessToken === null (logout action dispatched synchronously)
  AND the component calling logout does not crash
```

**Verification artifact**: `src/common/hooks/__tests__/useAuth.spec.ts`

---

## REQ-AUTH-06: LoginForm Component

The system SHALL provide `src/features/auth/components/LoginForm.tsx` using
`react-hook-form` + Zod schema validation. The Zod schema MUST enforce:
- `email`: valid email format (using `z.string().email()`)
- `password`: minimum 8 characters

Field-level validation errors MUST be displayed inline under the
respective field using the `FormField` component (SM-FE-01).

On successful submission, `useAuth().login()` MUST be called. A loading
state MUST disable the submit button and show a `LoadingButton` spinner
while the API call is in flight.

On API error, a non-blocking toast (via `notificationSlice`) MUST be
dispatched with the server's error message or a generic fallback.

### Scenario REQ-AUTH-06-S01 — Zod validation prevents submission with invalid email

```
GIVEN LoginForm is rendered
WHEN the user submits with email "not-an-email" and password "validpass"
THEN no API call is made
  AND an inline error message appears under the email field
```

**Verification artifact**: `src/features/auth/__tests__/LoginForm.spec.tsx`

### Scenario REQ-AUTH-06-S02 — Zod validation prevents submission with short password

```
GIVEN LoginForm is rendered
WHEN the user submits with email "a@b.com" and password "short"
THEN no API call is made
  AND an inline error message appears under the password field
```

**Verification artifact**: `src/features/auth/__tests__/LoginForm.spec.tsx`

### Scenario REQ-AUTH-06-S03 — Successful login navigates to requested route

```
GIVEN LoginPage is rendered after PrivateRoute redirected from "/bookings"
  AND location.state.from === "/bookings"
  AND MSW returns a valid TokenPairResponse on POST /api/v1/auth/login
WHEN the user submits valid credentials
THEN the browser navigates to "/bookings"
  AND state.auth.isAuthenticated === true
```

**Verification artifact**: `src/features/auth/__tests__/LoginPage.spec.tsx`

### Scenario REQ-AUTH-06-S04 — API error dispatches toast notification

```
GIVEN MSW returns 401 on POST /api/v1/auth/login
WHEN the user submits valid-format credentials
THEN state.notifications contains a notification with severity "error"
  AND the submit button is re-enabled
```

**Verification artifact**: `src/features/auth/__tests__/LoginForm.spec.tsx`

### Scenario REQ-AUTH-06-S05 — Network timeout during login surfaces generic toast

```
GIVEN MSW simulates a network timeout (no response within REQUEST_TIMEOUT_MS) on POST /api/v1/auth/login
WHEN the user submits valid credentials
THEN state.notifications contains a notification with severity "error" and message containing "Network error" or "try again"
  AND the submit button is re-enabled
  AND no navigation occurs
```

**Verification artifact**: `src/features/auth/__tests__/LoginForm.spec.tsx`

---

## REQ-AUTH-07: RoleGuard Component

The system SHALL provide `src/features/auth/components/RoleGuard.tsx`
that accepts a `requiredRole: 'EMPLOYEE' | 'MANAGER' | 'ADMIN'` prop and
renders its `children` only when `auth.user.role` satisfies the role
requirement. Role hierarchy: `ADMIN > MANAGER > EMPLOYEE`.

When the required role is not met, `RoleGuard` MUST render `null`
(silent — no error message or redirect; the page itself may choose to
show an alternative).

### Scenario REQ-AUTH-07-S01 — ADMIN can see MANAGER-gated content

```
GIVEN state.auth.user.role === "ADMIN"
WHEN <RoleGuard requiredRole="MANAGER"><div>secret</div></RoleGuard> is rendered
THEN the text "secret" is visible in the DOM
```

**Verification artifact**: `src/features/auth/__tests__/RoleGuard.spec.tsx`

### Scenario REQ-AUTH-07-S02 — EMPLOYEE cannot see MANAGER-gated content

```
GIVEN state.auth.user.role === "EMPLOYEE"
WHEN <RoleGuard requiredRole="MANAGER"><div>secret</div></RoleGuard> is rendered
THEN the text "secret" is NOT present in the DOM
```

**Verification artifact**: `src/features/auth/__tests__/RoleGuard.spec.tsx`

### Scenario REQ-AUTH-07-S03 — Unauthenticated user (null user) sees no guarded content

```
GIVEN state.auth.user === null (user not logged in)
WHEN <RoleGuard requiredRole="EMPLOYEE"><div>secret</div></RoleGuard> is rendered
THEN the text "secret" is NOT present in the DOM
```

**Verification artifact**: `src/features/auth/__tests__/RoleGuard.spec.tsx`

---

The system SHALL emit structured log events and increment in-memory
metrics counters (SM-FE-01 `logger.ts` / `metrics.ts`) for all auth
lifecycle events as specified in `design.md` (Observability section).

Log payloads MUST NOT contain `password`, `accessToken`, or `refreshToken`.

### Scenario REQ-AUTH-08-S01 — Login success emits info log without credentials

```
GIVEN a successful login completes
WHEN the logger output is captured
THEN a log entry with level "info" and fields { userId, email, role } is emitted
  AND the entry does NOT contain the fields "password", "accessToken", or "refreshToken"
```

**Verification artifact**: `src/features/auth/__tests__/authApi.spec.ts` — spy on logger

---

## Non-Functional Requirements (delta)

| NFR | Requirement |
|---|---|
| Token security | Tokens stored in Redux memory only; no `localStorage`, `sessionStorage`, or cookies (ADR-005) |
| Token TTL | Access token ≤ 8 h; Refresh token ≤ 7 d — enforced server-side; frontend reads `exp` claim |
| XSS | No token exposure via `window.*`, DOM attributes, or serialised state |
| Test coverage | ≥ 80% line coverage across `src/features/auth/` and `src/api/baseQueryWithReauth.ts` |
| Build | `npm run build` produces no TypeScript errors after this change is applied |
