## Why

Authenticated employees cannot yet search for flights; without the Flight Search feature (SM-FE-03) users have no way to discover and select travel options, blocking the Booking feature (SM-FE-04) that depends on a selected flight offer.

## What Changes

- Add `src/features/search/` feature slice with `SearchPage`, `SearchForm`, `FlightResults`, and `FlightCard` components
- Add `flightApi.ts` — RTK Query lazy query for `GET /inventory/flights/search` with 5-min cache TTL
- Add `searchSlice.ts` — Redux slice holding filter/sort state (`sortBy`, `maxPrice`) and `selectedOffer`
- Wire `SearchPage` into `AppRoutes.tsx` at `/search` (protected by `PrivateRoute`)
- Display a policy-compliance badge on each `FlightCard` (derived inline from offer price vs. user's policy allowance obtained via `GET /policies/validate`)
- Add `useFlightSearch` hook encapsulating RTK Query + debounce logic

## Capabilities

### New Capabilities

- `frontend-search`: Flight search UI — form submission, results list, individual offer selection, policy badge, Redux state for downstream booking flow

### Modified Capabilities

- `frontend-foundation`: Register `searchReducer` in `rootReducer.ts` (additive-only, no existing requirement changes)

## Impact

- **New files**: `src/features/search/` (components, pages, hooks, slice, API, types, tests)
- **Modified files**: `src/app/rootReducer.ts` (add `search` slice), `src/routes/AppRoutes.tsx` (add `/search` route)
- **New RTK Query endpoints**: `flightApi` injected into `baseApi`
- **New Redux state**: `search` slice with `filters` and `selectedOffer`
- **API Gateway routes consumed**: `GET /inventory/flights/search`, `GET /policies/validate`
- **No breaking changes** — all additions are additive
