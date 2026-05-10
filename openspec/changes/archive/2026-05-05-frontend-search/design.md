## Pattern Selection Log

| Pattern | Decision | Rationale |
|---|---|---|
| Cache-aside (RTK Query in-memory) | **Applied** | Flight search results cached client-side for 300s (matches inventory-service backend TTL). Airport typeahead cached 600s (stable data). Policy validation cached 60s per offer. RTK Query `keepUnusedDataFor` per-endpoint config. No server-side Redis involvement — this is a frontend read-through cache. |
| Retry with exponential backoff | **Already in place** | `baseQueryWithRetry.ts` (established SM-FE-01) restricts retries to SAFE_METHODS (GET/HEAD/OPTIONS) with exponential backoff, jitter, and a 30s total deadline. All three new endpoints (`/inventory/flights/search`, `/inventory/airports/search`, `/policies/validate`) are GET — retry applies automatically. No new configuration required. |
| Timeout | **Already in place** | `baseQueryWithTimeout.ts` (established SM-FE-01) applies a 10s AbortController timeout to every RTK Query call. All three new endpoints inherit this. No new configuration required. |
| Circuit Breaker | **Not applicable (delegated to API Gateway)** | Per ADR-006, the API Gateway implements circuit breaking at 50% failure rate over a 10-request window with a 30s recovery period. The frontend SPA does not implement its own circuit breaker — it receives 503 from the gateway when a downstream circuit is open, which the retry and error-banner logic handles correctly. This delegation is intentional and consistent with all other SM-FE modules. |
| Bulkheads | **Not applied — risk documented** | Each `FlightCard` independently calls `GET /policies/validate`. For a 50-result search this generates up to 50 simultaneous requests, consuming 50 of the ADR-006 rate limit budget (100 req/15min/user). Mitigation: `PolicyBadge` SHALL limit concurrent in-flight policy calls to ≤10 using a component-level gate (simple counter ref; fire next when one completes). This prevents rate limit exhaustion and Policy Service overload without requiring a shared semaphore. |
| Saga / Outbox / Idempotency | **Not applicable** | Read-only feature; no distributed writes or event publishing. |
| CQRS | **Not applicable** | No separate read/write models required; RTK Query cache-aside is sufficient. |

---

## Context

The frontend application (SM-FE-01, SM-FE-02) has a working foundation: Vite 5 + React 18, Redux Toolkit + RTK Query, MUI v5, and an authenticated route guard. The next user-facing capability is flight search — employees must be able to discover and select flight offers before they can create a booking (SM-FE-04). The backend Inventory Service (`GET /inventory/flights/search`) and Policy Service (`GET /policies/validate`) are already live and healthy.

Current state: `src/features/` has only the `auth/` slice; `rootReducer.ts` has only `auth` + `api` slices; `AppRoutes.tsx` has a placeholder `SearchPage` component inline that must be replaced.

## Goals / Non-Goals

**Goals:**
- `SearchForm` — origin/destination airport IATA inputs (with typeahead via `GET /airports/search`), departure/return date pickers, passenger count (adults 1–9), cabin class, non-stop toggle, Zod validation
- `FlightResults` — sorted/filtered list of `FlightCard` components; loading skeleton; empty state; error banner with retry
- `FlightCard` — airline, route, times, stops, duration, price, policy badge (COMPLIANT / EXCEEDS POLICY / POLICY UNKNOWN), "Select" CTA
- `searchSlice` — filter/sort state (`sortBy: 'price' | 'duration'`, `maxPrice: number | null`, `selectedOffer: FlightOffer | null`); sort/filter applied client-side to results list
- `flightApi` — RTK Query lazy query (`useLazySearchFlightsQuery`), `keepUnusedDataFor: 300`; airport typeahead (`useSearchAirportsQuery`), `keepUnusedDataFor: 600`
- `policyApi` — RTK Query query (`useValidatePolicyQuery`), `keepUnusedDataFor: 60`
- `useFlightSearch` hook — encapsulates lazy trigger + 400 ms debounce + result selector
- `SearchPage` — protected at `/search`; replaces AppRoutes.tsx placeholder; wires form → results → selection → navigate `/bookings/new`
- Policy badge — per-offer, capped at ≤10 concurrent in-flight calls via PolicyBadge gate
- `searchReducer` registered in `rootReducer.ts`; placeholder `SearchPage` replaced in `AppRoutes.tsx`
- All components covered by Vitest unit tests; ≥80% coverage
- WCAG 2.1 AA: all form fields labelled; results list has `aria-live="polite"`

**Non-Goals:**
- Multi-city search
- Seat-map / ancillary selection
- Payment or booking confirmation (SM-FE-04)
- Saving / favoriting searches
- Policy management UI
- Server-side circuit breaker (handled by API Gateway)

## Decisions

### 1. Lazy query for search, not automatic

`useLazySearchFlightsQuery` is used instead of `useSearchFlightsQuery` so that the API call fires only when the user explicitly submits the form. The decomposition described "debounced auto-refresh" but this was narrowed to explicit-submit to avoid spurious calls during form entry. The 400 ms debounce still applies for keyboard-driven form navigation.

*Alternative considered*: `useSearchFlightsQuery(params, { skip: !ready })` — rejected because `skip` still registers a subscription and the skip-to-ready transition causes a double render.

### 2. Debounce at hook level, not component level

`useFlightSearch` owns a 400 ms debounce using `useDebounce` from `src/common/hooks/useDebounce.ts` so `SearchForm` stays a controlled component with no internal timer logic.

### 3. Policy badge via separate RTK Query call per offer, capped at ≤10 concurrent

Each `FlightCard` calls `useValidatePolicyQuery({ offerId, amount, currency })` independently. Results are cached by `offerId`; `keepUnusedDataFor: 60`. The badge renders a loading spinner while the policy call is in-flight and shows COMPLIANT / EXCEEDS POLICY / POLICY UNKNOWN on completion or error.

To prevent ADR-006 rate limit exhaustion (100 req/15min/user), `PolicyBadge` uses a module-level counter `inFlightPolicyRequests` (ref-counted, not React state) to gate concurrent calls: if `inFlightPolicyRequests >= 10`, the badge stays in loading state until a slot opens. This ensures at most 10 simultaneous policy calls regardless of result set size.

*Alternative considered*: Batch policy validation at `SearchPage` level — rejected because it couples all card renders to a secondary API round-trip and delays display.

### 4. `searchSlice` owns `selectedOffer` — not RTK Query cache

`selectedOffer` is write-once-per-search transient UI state. Storing it in Redux ensures SM-FE-04 (`BookingPage`) can read it directly via `selectSelectedOffer` without prop-drilling.

### 5. Sort/filter applied client-side in FlightResults

`FlightResults` reads `selectFilters` and applies `sortBy` (price or duration) and `maxPrice` filtering on the RTK Query result array before rendering cards. This avoids a second API call for sorting and is consistent with the 300s cache (the sorted/filtered view is derived from the same cached data).

### 6. Airport typeahead uses `useSearchAirportsQuery` with `skip: query.length < 2`

Calls are skipped until the user types at least 2 characters. Results are normalised to `{ iata: string; name: string; city: string }[]`.

## Risks / Trade-offs

- **Policy service latency** → N policy calls after N results load. Mitigation: `keepUnusedDataFor: 60` caches within session; ≤10 concurrent cap prevents rate limit breach; badge shows loading state gracefully; errors show POLICY UNKNOWN (non-blocking).
- **Stale price risk** → Offers cached for 300s may have changed price by booking time. Known limitation; documented for SM-FE-04 to re-validate price at booking confirmation.
- **Airport typeahead flicker** → Rapid keystrokes fire separate queries. Mitigation: 400 ms debounce on airport query input.
- **`selectedOffer` stale** → `SearchPage` dispatches `clearSelectedOffer()` on mount to reset.
- **AppRoutes.tsx placeholder** → The existing inline `function SearchPage()` placeholder at lines ~16-18 must be removed and replaced with an import from `features/search`. Forgetting this leaves the placeholder in place silently.

## Observability

This is a frontend SPA. Standard server-side observability (Prometheus, Jaeger) does not apply directly. The following signals SHALL be implemented:

### Correlation ID Forwarding (ADR-007)
- `baseQueryWithReauth.ts` already receives API Gateway responses that include an `X-Correlation-ID` response header.
- On any non-2xx response from a search-feature endpoint (`/inventory/flights/search`, `/inventory/airports/search`, `/policies/validate`), the error handler SHALL log a structured entry to `console.error`:
  ```json
  { "level": "error", "service": "frontend", "endpoint": "<url>", "status": <status_code>, "correlationId": "<X-Correlation-ID header value or 'unknown'>", "timestamp": "<ISO8601>" }
  ```

### Browser Error Boundary
- `SearchPage` SHALL wrap `FlightResults` in a React `ErrorBoundary` component (`src/common/components/ErrorBoundary.tsx` if available, or a local boundary).
- Uncaught rendering errors within `FlightResults` or `FlightCard` SHALL be caught and a fallback "Something went wrong — please refresh" UI SHALL be displayed.

### Metrics (Not applicable at frontend layer)
- Prometheus metrics are server-side only. Client-side performance measurement (RTK Query cache hit rate, time-to-first-results) is out of scope for SM-FE-03 and deferred to a future frontend observability initiative.
- The p95 < 500ms target (ADR-008) is enforced by the backend inventory-service cache TTL (300s) and validated via k6 load tests in the backend CI pipeline — not by frontend instrumentation.
