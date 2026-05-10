# Proposal: Authentication Feature (SM-FE-02)

## Intent

Implement the Authentication feature slice for the Corporate Travel Portal
SPA. This enables employees to log in with email and password, receive a
JWT token pair from the API Gateway, and have all subsequent API calls
automatically authenticated. Tokens are stored in Redux memory only
(ADR-005 — no `localStorage` / cookies) and silently refreshed on 401
responses. All protected routes (SM-FE-01 `PrivateRoute`) become
functional once this slice is deployed.

## Scope

### In Scope

- `authSlice.ts` — Redux slice storing `accessToken`, `refreshToken`,
  `user: JwtUserPayload | null`, `isAuthenticated`
- `authApi.ts` — RTK Query mutations for `POST /api/v1/auth/login` and
  `POST /api/v1/auth/refresh`
- `baseQueryWithReauth.ts` — RTK Query `baseQuery` wrapper; prepends
  `Authorization: Bearer <accessToken>` header; on 401 intercepts,
  attempts one token refresh, retries original request; on second 401
  dispatches `logout`
- Update `baseApi.ts` to use `baseQueryWithReauth` (replaces the direct
  `baseQueryWithRetry` set in SM-FE-01)
- `jwt.utils.ts` — client-side JWT decode (no verification), `isExpired`,
  `getPayload` helpers
- `useAuth.ts` — custom hook exposing `{ user, isAuthenticated, login,
  logout, isLoading, error }`
- `LoginForm.tsx` — react-hook-form + Zod validated email/password form
- `LoginPage.tsx` — full-page layout wrapping `LoginForm`
- `RoleGuard.tsx` — HOC / wrapper rendering children only when
  `auth.user.role` satisfies a required role; renders null otherwise
- Update `AppRoutes.tsx` — replace placeholder `LoginPage` stub with real
  `LoginPage`
- Update `rootReducer.ts` — add `auth` slice
- Observability — structured log on login success/failure and token refresh

### Out of Scope

- Password reset / forgot-password flow — deferred to v2
- Multi-factor authentication — deferred
- Social/SSO login — deferred
- Session persistence across page refresh — intentionally excluded
  (ADR-005: tokens in memory only; users must re-login after page reload)
- Admin user management UI — belongs to SM-FE-05 (Traveler Profile)
- Logout API call to invalidate server-side refresh token — minimal stub
  only; full server-side invalidation is api-gateway concern

## Approach

`baseQueryWithReauth` wraps `baseQueryWithRetry` (SM-FE-01) with two
additional concerns:

1. **Authorization injection**: every outbound RTK Query request gets
   `Authorization: Bearer <accessToken>` from the Redux store before the
   underlying `baseQueryWithRetry` call is made.

2. **Silent token refresh (Reauth)**: when a `baseQueryWithRetry` call
   returns a 401, `baseQueryWithReauth` makes one direct call to
   `POST /api/v1/auth/refresh` using the stored `refreshToken`. On
   success it dispatches `authSlice.setCredentials` and retries the
   original request once. On failure it dispatches `authSlice.logout` and
   lets the 401 propagate, causing `PrivateRoute` to redirect to `/login`.

Login and refresh are `POST` endpoints — `baseQueryWithRetry` (SM-FE-01)
does not retry `POST` by default (SAFE_METHODS restriction), which is
correct; a failed login should not be retried automatically.

The `LoginForm` uses `react-hook-form` + Zod schema validation to surface
field-level errors before submission. On successful login, credentials are
stored in `authSlice` and the user is navigated to the originally
requested URL (from `location.state.from`, set by `PrivateRoute`).

## Microservice Patterns Applied

| Pattern | Justification |
|---|---|
| Cache Invalidation | On `logout`, `baseApi.util.resetApiState()` clears all RTK Query cached data so the next user cannot see the previous user's data |
| Retries | POST login/refresh endpoints are intentionally excluded from retry (SM-FE-01 SAFE_METHODS) — no new retry design needed |
| Timeouts | Already in place via `baseQueryWithTimeout` (SM-FE-01) — no changes |

## Assumptions

- The API Gateway is live and reachable at `REACT_APP_API_URL/api/v1`
  (verified via `docker-compose up` — all 7 backend services healthy).
- `POST /api/v1/auth/login` returns `{ accessToken, refreshToken,
  expiresIn, user: { id, email, role } }` per `openapi-api-gateway.yaml`.
- The `sub` claim in the JWT equals the traveler's UUID (needed by
  SM-FE-03–06 to scope queries).
- `refreshToken` is a JWT (client can decode it to read expiry), consistent
  with the api-gateway spec (REQ-01-S04 in the archived spec).
- Role values are exactly `EMPLOYEE | MANAGER | ADMIN` (from
  `openapi-api-gateway.yaml` enum).
- The application does NOT need to persist auth state across hard reloads
  (confirmed by ADR-005 security constraint).

## Open Questions

- **OQ-01 [DECIDED — Logout API]**: Should the frontend call
  `POST /auth/logout` on logout to invalidate the server-side refresh
  token key in Redis?
  _Decision_: Yes — call it best-effort (fire-and-forget); failure is
  non-blocking. Refresh token will expire naturally after 7 days.

- **OQ-02 [DECIDED — Token storage]**: Should the refresh token be stored
  in an `httpOnly` cookie instead of Redux memory to survive page refreshes?
  _Decision_: No — Redux memory only per ADR-005. Page-refresh session
  loss is accepted. Cookie-based storage is a v2 security enhancement.

- **OQ-03 [DECIDED — RoleGuard placement]**: Should `RoleGuard` be a
  route-level component in `AppRoutes` or an inline conditional per page?
  _Decision_: Inline conditional via `RoleGuard` wrapper component — keeps
  route config simple and lets feature modules control access granularity.
