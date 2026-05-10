# Proposal: Frontend Foundation & Infrastructure (SM-FE-01)

## Intent

Establish the complete React 18 + TypeScript SPA scaffold (`pgt/frontend/`) that every
subsequent frontend feature module builds upon. This includes the Redux Toolkit store,
RTK Query base API client with timeout and retry policies, an MUI v5 design-system
theme, a **reusable common component library** (layouts, inputs, buttons, tables,
feedback, loading, and empty-state components), React Router v6 routing primitives
(including `PrivateRoute`), global error handling, and Docker integration that adds the
`frontend` container to the existing `pgt/docker-compose.yml`.

## Scope

### In Scope
- Vite 5 + React 18 + TypeScript 5 project initialisation under `pgt/frontend/`
- Redux Toolkit store with RTK Query `baseApi` (global timeout, retry-on-transient-error,
  tag-based cache invalidation infrastructure)
- MUI v5 `ThemeProvider` + custom corporate theme and component overrides
- Reusable common component library:
  - Layout: `Header`, `Sidebar`, `Footer`, `PageContainer`
  - Form primitives: `FormField`, `TextInput`, `SelectInput`, `DatePickerInput`, `NumberInput`
  - Actions: `Button` (variants: primary / secondary / danger / ghost), `IconButton`, `LoadingButton`
  - Data display: `DataTable` (sortable, paginated), `StatusBadge`, `CurrencyDisplay`, `Card`, `ClickableCard`
  - Feedback: `Alert`, `GlobalSnackbar`, `Modal`, `ConfirmDialog`
  - Loading: `Spinner`, `Skeleton`, `LoadingOverlay`
  - Empty: `EmptyState`
  - `ErrorBoundary` (React error boundary)
- Common hooks: `useDebounce`, shared utilities (`api.utils.ts`, `date.utils.ts`, `currency.utils.ts`)
- React Router v6 configuration: `AppRoutes.tsx`, `PrivateRoute.tsx`, `routes.config.ts`
- Global notification slice (`notificationSlice`) consumed by `GlobalSnackbar`
- Dockerfile (multi-stage: Vite build → Nginx serve) + `.dockerignore`
- `frontend` service in `pgt/docker-compose.yml` on the `travel-portal` network

### Out of Scope
- Feature-specific components (BookingForm, SearchForm, etc.) — belong to SM-FE-03/04/05/06
- `authSlice` and JWT token handling — SM-FE-02
- RTK Query endpoint definitions for any backend service — SM-FE-02 through SM-FE-06
- Storybook component catalogue — deferred; can be added post-launch
- Internationalisation (i18n) — deferred to v2
- PWA/service-worker offline support — not in scope for v1

## Approach

A Vite-based React 18 SPA is bootstrapped with strict TypeScript. The Redux store uses
RTK Query's `fetchBaseQuery` wrapped in a custom `baseQueryWithRetry` that retries
transient HTTP failures (5xx, 408, 502–504) with exponential back-off (base 200ms, max 5s,
jitter, 3 retries) and enforces a 10s read timeout per PROJECT.md resilience defaults.
RTK Query's tag-based invalidation system is pre-configured in `baseApi` so all feature
slices can plug in with `providesTags` / `invalidatesTags` without re-defining the base.

The MUI theme establishes a corporate colour palette, typography scale, and component
overrides (Button, Input, Card, Table) so feature modules never import raw MUI primitives
directly — they import from `common/components/` wrappers, ensuring visual consistency
and enabling future theming changes in one place.

Docker uses a two-stage Nginx build. `REACT_APP_API_URL` is injected at runtime via
`window.__ENV__` (served by Nginx from `env-config.js`) so the same image can target
different API Gateway URLs without a rebuild.

## Microservice Patterns Applied

| Pattern | Justification |
|---|---|
| Retries with Backoff | RTK Query `baseQueryWithRetry` retries transient backend failures per PROJECT.md §7 (3 retries, exp. backoff, base 200ms, max 5s, jitter) |
| Timeouts | `fetchBaseQuery` enforces 10s read timeout on every outbound request per PROJECT.md §7 |
| Cache-aside | RTK Query's built-in normalised cache; `keepUnusedDataFor` defaults set in `baseApi`; per-endpoint TTLs overridden in feature slices |
| Cache Invalidation | Tag-based invalidation infra in `baseApi`; tag registry defined so all feature modules use consistent tag names |

## Assumptions

- API Gateway is reachable at `REACT_APP_API_URL` (default `http://localhost:4000` for local dev).
- MUI v5 is the agreed UI library per PROJECT.md §2; no other design system is introduced.
- Vite is the build tool (not CRA) — inferred from `vite.config.ts` reference in DDD §8.2.
- Runtime environment injection (`window.__ENV__`) is acceptable for Docker deployments
  (avoids per-environment rebuilds).
- `react-router-dom` v6.x is the router library.
- `react-hook-form` + `zod` are acceptable form/validation libraries (not dictated by ADR;
  flagged as open question).
- Nginx Alpine is acceptable as the production web server for the SPA.

## Open Questions

1. **Form library**: **DECIDED — `react-hook-form` + `zod`**. ADR-002 Amendment 01
   formalises `react-hook-form 7.x` + `Zod 3.x` as the frontend form/validation stack.
   `FormField` is a layout/error wrapper; feature modules (SM-FE-03+) use `react-hook-form`
   `Controller` to integrate inputs.
2. **Icon set**: **DECIDED — `@mui/icons-material` (default MUI icon pack)**. Included in
   T00 as `@mui/icons-material@5`. Custom icons can be layered later via `SvgIcon` wrappers.
3. **Runtime env injection**: **DECIDED — `window.__ENV__` via Nginx `env-config.js`**.
   Documented in `design.md` §Security; same image targets any API Gateway URL without rebuild.
4. **Test framework**: **DECIDED — Vitest 1.x** (switched from Jest 29.x).
   Vitest uses Vite's native transform pipeline (no separate Babel/ts-jest config) and is
   ~10× faster for a Vite project. `@testing-library/react`, `@testing-library/user-event`,
   and `@testing-library/jest-dom` work identically with Vitest. MSW v2 is added as a dev
   dependency for API mocking in unit/integration tests. PROJECT.md §2 and ADR-002 Amendment
   01 updated to reflect Vitest 1.x.
