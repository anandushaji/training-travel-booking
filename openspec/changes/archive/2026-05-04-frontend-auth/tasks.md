# Tasks: Authentication Feature (SM-FE-02)

**Change ID**: frontend-auth  
**Spec**: `specs/frontend-auth/spec.md`  
**Status**: Ready for implementation

---

## T00 — Install missing frontend dependencies

**File(s)**: `pgt/frontend/package.json`

Run the following from `pgt/frontend/` before any other task:

```bash
npm install @hookform/resolvers --legacy-peer-deps
```

Verify that `react-hook-form` and `zod` are already present in `package.json`
dependencies (they were installed in SM-FE-01). If either is missing, install:

```bash
npm install react-hook-form zod --legacy-peer-deps
```

No test needed. Confirmed by `npm run build` succeeding in T12.

**ACs covered**: Prerequisite for T08 compilation

---

## T01 — Auth types and JwtUserPayload interface

**File(s)**: `src/features/auth/auth.types.ts`

Create the shared TypeScript types used across the auth feature:

```typescript
export type UserRole = 'EMPLOYEE' | 'MANAGER' | 'ADMIN';

export interface JwtUserPayload {
  id: string;         // sub claim
  email: string;
  role: UserRole;
  exp: number;        // epoch seconds
  iat: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

export interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: JwtUserPayload;
}

export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: JwtUserPayload | null;
  isAuthenticated: boolean;
}
```

**ACs covered**: REQ-AUTH-01, REQ-AUTH-03

---

## T02 — JWT utility helpers

**File(s)**:  
- `src/features/auth/jwt.utils.ts`  
- `src/features/auth/__tests__/jwt.utils.spec.ts`

Implement `decodeJwt`, `isTokenExpired`, `getPayload` as described in
REQ-AUTH-02. Use `atob` (available in all modern browsers and JSDOM) to
base64url-decode the payload segment (replace `-` → `+`, `_` → `/` before
calling `atob`).

Test file MUST cover:
- Valid token decode (REQ-AUTH-02-S01)
- Expired token detection (REQ-AUTH-02-S02)
- Malformed token returns null (REQ-AUTH-02-S03)

Use a test token fixture with a known payload — generate via:
```
btoa(JSON.stringify({ sub: "u1", email: "a@b.com", role: "EMPLOYEE", exp: 9999999999, iat: 1000000000 }))
```
wrapped as `header.payload.sig`.

**ACs covered**: REQ-AUTH-02-S01, REQ-AUTH-02-S02, REQ-AUTH-02-S03

---

## T03 — authSlice Redux slice

**File(s)**:  
- `src/features/auth/authSlice.ts`  
- `src/features/auth/__tests__/authSlice.spec.ts`

Implement the Redux slice:
- Initial state: `{ accessToken: null, refreshToken: null, user: null, isAuthenticated: false }`
- `setCredentials(state, action: PayloadAction<TokenPairResponse>)`: stores tokens and user; sets `isAuthenticated: true`
- `logout(state)`: clears all fields; sets `isAuthenticated: false`

For REQ-AUTH-01-S03 (RTK Query cache reset on logout), add a Redux
middleware listener or export a `logoutAction` thunk that dispatches both
`authSlice.logout()` **and** `baseApi.util.resetApiState()`. The test
MUST spy on `baseApi.util.resetApiState` to verify it is called.

Export: `authReducer` (default), `setCredentials`, `logout`,
`selectAccessToken`, `selectRefreshToken`, `selectUser`,
`selectIsAuthenticated`.

**ACs covered**: REQ-AUTH-01-S01, REQ-AUTH-01-S02, REQ-AUTH-01-S03

---

## T04 — Register auth reducer in rootReducer and store

**File(s)**:  
- `src/app/rootReducer.ts`  
- `src/app/store.ts`

Add `auth: authReducer` to `combineReducers`. Update the `RootState` type
export. No test needed for this task — existing `PrivateRoute.spec.tsx`
and future auth tests will catch misconfigurations.

> After this task, `PrivateRoute` will redirect to `/login` only when
> `state.auth.accessToken === null` (which is the default until login).

**ACs covered**: REQ-AUTH-01 (registration prerequisite)

---

## T05 — authApi RTK Query endpoints

**File(s)**:  
- `src/features/auth/authApi.ts`  
- `src/features/auth/__tests__/authApi.spec.ts`

Inject three mutations into `baseApi`:

```typescript
login: build.mutation<TokenPairResponse, LoginRequest>({ query: (body) => ({ url: '/auth/login', method: 'POST', body }) })
refresh: build.mutation<TokenPairResponse, RefreshRequest>({ query: (body) => ({ url: '/auth/refresh', method: 'POST', body }) })
logoutApi: build.mutation<void, LogoutRequest>({ query: (body) => ({ url: '/auth/logout', method: 'POST', body }) })
```

None may set `allowRetry: true`.

Test file MUST use MSW v2 handlers (`http.post`) to cover:
- REQ-AUTH-03-S01: successful login returns token pair
- REQ-AUTH-03-S02: 401 is returned as error with no retry
- REQ-AUTH-08-S01: logger spy confirms no `password`/`accessToken`/`refreshToken` in log output

**ACs covered**: REQ-AUTH-03-S01, REQ-AUTH-03-S02, REQ-AUTH-08-S01

---

## T06 — baseQueryWithReauth

**File(s)**:  
- `src/api/baseQueryWithReauth.ts`  
- `src/api/__tests__/baseQueryWithReauth.spec.ts`

Implement the wrapper as described in REQ-AUTH-04 and `design.md`.

Key implementation points:
- Use `(api.getState() as RootState).auth.accessToken` to read the token
- Use the following **canonical mutex pattern** (no alternatives):

```typescript
let mutexPromise: Promise<boolean> | null = null;

// inside baseQueryWithReauth:
if (result.error?.status === 401) {
  if (!mutexPromise) {
    mutexPromise = (async () => {
      try {
        const refreshToken = (api.getState() as RootState).auth.refreshToken;
        if (!refreshToken) {
          api.dispatch(logout());
          return false;
        }
        const refreshResult = await fetch(/* POST /auth/refresh */);
        if (refreshResult.ok) {
          api.dispatch(setCredentials(await refreshResult.json()));
          return true;
        }
        api.dispatch(logout());
        return false;
      } finally {
        mutexPromise = null;
      }
    })();
  }
  const refreshed = await mutexPromise;
  if (refreshed) {
    result = await baseQueryWithRetry(args, api, extraOptions); // retry once
  }
}
```

- After a successful refresh, `mutexPromise` is set to `null` in `finally` before the retry, so concurrent waiters get the already-dispatched new credentials from Redux state
- After a failed refresh, `mutexPromise` is set to `null` and `logout()` was dispatched; all waiters return the 401 error

Update `src/api/baseApi.ts`: replace `baseQueryWithRetry` with `baseQueryWithReauth` as the `baseQuery` argument.

Test file MUST cover:
- REQ-AUTH-04-S01: Bearer header attached
- REQ-AUTH-04-S02: 401 → refresh → retry succeeds
- REQ-AUTH-04-S03: 401 + failed refresh → logout dispatched
- REQ-AUTH-04-S04-A: null refreshToken → logout dispatched immediately, no refresh call
- REQ-AUTH-04-S05: concurrent 401s trigger exactly one refresh call (use `vi.useFakeTimers()` or a deferred Promise resolver to control timing — instantiate two simultaneous RTK queries, confirm `fetch` for `/auth/refresh` is called once via `vi.spyOn(global, 'fetch')`)
- REQ-AUTH-04-S06: FETCH_ERROR on refresh → logout dispatched

**ACs covered**: REQ-AUTH-04-S01 through REQ-AUTH-04-S06

---

## T07 — useAuth custom hook

**File(s)**:  
- `src/common/hooks/useAuth.ts`  
- `src/common/hooks/__tests__/useAuth.spec.ts`

Implement the hook as specified in REQ-AUTH-05:
- `login`: calls `authApi.useLoginMutation` trigger, dispatches
  `setCredentials` on success, throws the error object on failure so
  `LoginForm` can catch it
- `logout`: dispatches the `logoutAction` thunk (T03) to clear auth +
  reset RTK cache, then calls `logoutApi` mutation best-effort (do not
  `await`, ignore rejection)

Test file uses `renderHook` with a real Redux store (MSW for HTTP) and covers:
- REQ-AUTH-05-S01: login dispatches setCredentials
- REQ-AUTH-05-S02: login rejects on 401
- REQ-AUTH-05-S03: logout does not throw when `POST /auth/logout` returns 500 (MSW returns 500; hook call must resolve, not reject; `state.auth.accessToken` must be null)

> File location: `src/common/hooks/useAuth.spec.ts` (flat convention, matching `useDebounce.spec.ts`)

**ACs covered**: REQ-AUTH-05-S01, REQ-AUTH-05-S02, REQ-AUTH-05-S03

---

## T08 — LoginForm component

**File(s)**:  
- `src/features/auth/components/LoginForm.tsx`  
- `src/features/auth/__tests__/LoginForm.spec.tsx`

Implement using `react-hook-form` + `zodResolver` with the Zod schema:
```typescript
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});
```

Use `TextInput` + `FormField` from `src/common/components/index.ts`.
Submit button: use `LoadingButton` with `loading={isLoading}`.

On submit error, dispatch `addNotification({ message: ..., severity: 'error' })`.

Test file uses `@testing-library/react` + MSW and covers:
- REQ-AUTH-06-S01: invalid email → no API call, inline error shown
- REQ-AUTH-06-S02: short password → no API call, inline error shown
- REQ-AUTH-06-S04: API 401 → toast notification dispatched
- REQ-AUTH-06-S05: network timeout → `server.use(http.post('/api/v1/auth/login', () => HttpResponse.error()))` simulates network failure → toast dispatched; submit button re-enabled

**ACs covered**: REQ-AUTH-06-S01, REQ-AUTH-06-S02, REQ-AUTH-06-S04, REQ-AUTH-06-S05

---

## T09 — LoginPage component

**File(s)**:  
- `src/features/auth/pages/LoginPage.tsx`  
- `src/features/auth/__tests__/LoginPage.spec.tsx`

Full-page layout: centred card (MUI `Box` / `Paper`) with the corporate
logo placeholder (text "Corporate Travel Portal"), `LoginForm`, and a
tagline. No sidebar or header — the auth page is intentionally outside
the main `Layout`.

On successful login, navigate to `location.state?.from ?? '/'`.

Replace the placeholder `LoginPage` stub in `AppRoutes.tsx` with this
real component.

Test file covers REQ-AUTH-06-S03 (navigate to `from` after success).

**ACs covered**: REQ-AUTH-06-S03

---

## T10 — RoleGuard component

**File(s)**:  
- `src/features/auth/components/RoleGuard.tsx`  
- `src/features/auth/__tests__/RoleGuard.spec.tsx`

```typescript
const ROLE_RANK: Record<UserRole, number> = { EMPLOYEE: 1, MANAGER: 2, ADMIN: 3 };

export function RoleGuard({ requiredRole, children }: { requiredRole: UserRole; children: ReactNode }) {
  const user = useAppSelector(selectUser);
  if (!user || ROLE_RANK[user.role] < ROLE_RANK[requiredRole]) return null;
  return <>{children}</>;
}
```

Test file covers REQ-AUTH-07-S01, REQ-AUTH-07-S02, and REQ-AUTH-07-S03 (null user renders null).

**ACs covered**: REQ-AUTH-07-S01, REQ-AUTH-07-S02, REQ-AUTH-07-S03

---

## T11 — MSW handlers for auth endpoints

**File(s)**:  
- `src/mocks/handlers/auth.handlers.ts` *(new)*  
- `src/mocks/handlers/index.ts` *(new — replaces the previous flat `handlers.ts` export if applicable)*  
- `src/mocks/server.ts` *(update import path)*

**Step 1** — Create `src/mocks/handlers/auth.handlers.ts`:
```typescript
import { http, HttpResponse } from 'msw';

export const authHandlers = [
  http.post('/api/v1/auth/login', () =>
    HttpResponse.json({ accessToken: 'test-at', refreshToken: 'test-rt', expiresIn: 28800, user: { id: 'u1', email: 'test@corp.com', role: 'EMPLOYEE' } }),
  ),
  http.post('/api/v1/auth/refresh', () =>
    HttpResponse.json({ accessToken: 'new-at', refreshToken: 'new-rt', expiresIn: 28800, user: { id: 'u1', email: 'test@corp.com', role: 'EMPLOYEE' } }),
  ),
  http.post('/api/v1/auth/logout', () => new HttpResponse(null, { status: 204 })),
];
```

Individual test files override these defaults using `server.use(http.post(...))` for error cases.

**Step 2** — Create (or update) `src/mocks/handlers/index.ts`:
```typescript
import { authHandlers } from './auth.handlers';
export const handlers = [...authHandlers];
```

If `src/mocks/handlers/index.ts` does not yet exist AND a flat `src/mocks/handlers.ts` file currently exists, convert by:
1. Creating `src/mocks/handlers/` directory
2. Moving/renaming `handlers.ts` content into `handlers/index.ts` with the `authHandlers` merged in
3. Deleting the old flat `handlers.ts`

**Step 3** — Update `src/mocks/server.ts`: ensure it imports from `'./handlers'` which now resolves to `./handlers/index.ts`. If the import path is already `'./handlers'`, no change is needed (TypeScript module resolution will pick up `index.ts`). If it imports from `'./handlers.ts'` explicitly, change to `'./handlers/index'`.

```typescript
// src/mocks/server.ts — verify this import resolves correctly after Step 2
import { handlers } from './handlers';
```

**ACs covered**: Enabler for T05, T06, T07, T08, T09

---

## T12 — Auth barrel export and AppRoutes wire-up

**File(s)**:  
- `src/features/auth/index.ts` (barrel)  
- `src/routes/AppRoutes.tsx` (update import)

Create a barrel export:
```typescript
export { authReducer, setCredentials, logout, logoutAction } from './authSlice';
export { selectAccessToken, selectRefreshToken, selectUser, selectIsAuthenticated } from './authSlice';
export { useLoginMutation, useRefreshMutation, useLogoutApiMutation } from './authApi';
export { LoginPage } from './pages/LoginPage';
export { LoginForm } from './components/LoginForm';
export { RoleGuard } from './components/RoleGuard';
```

In `AppRoutes.tsx`, replace:
```typescript
// import LoginPage from '../features/auth/pages/LoginPage'; // TODO: SM-FE-02
```
with:
```typescript
import { LoginPage } from '../features/auth';
```

Run `npm run build` (inside `pgt/frontend/`) to confirm zero TypeScript errors.

**ACs covered**: REQ-AUTH-01 (integration), build verification

---

## Task Dependency Order

```
T00  ──►  T01 (deps must be installed before any compilation)
T01  ──►  T02, T03
T03  ──►  T04  ──►  T05, T06
T05  ──►  T06 (authApi needed by baseQueryWithReauth)
T06  ──►  T07 (baseQueryWithReauth wires into baseApi — needs T04 store)
T07  ──►  T08
T08  ──►  T09
T01, T03  ──►  T10
T11  (parallel — enabler for T05..T09 tests; must run before any test that uses MSW)
T12  (last — wire-up + build verify)
```

**Suggested implementation sequence**:
Wave 0 (deps): T00  
Wave 1 (foundation): T01, T11  
Wave 2 (data layer): T02, T03, T04  
Wave 3 (API + reauth): T05, T06  
Wave 4 (hooks + UI): T07, T08, T09, T10  
Wave 5 (integration): T12  
