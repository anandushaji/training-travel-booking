## Pattern Selection Log

| Pattern | Decision | Rationale |
|---|---|---|
| Database-per-service | Not applicable | Frontend has no database; all persistence is in booking-service. |
| CQRS | Not applicable | RTK Query `endpoints` already separate queries from mutations; no dedicated read model needed at this layer. |
| Saga | Already in place (backend) | Choreography-based booking saga lives entirely in booking-service (ADR-003). Frontend triggers it via `POST /bookings` and polls for outcome; does not implement saga steps. |
| Outbox | Not applicable | Frontend emits no events; no Outbox needed. |
| Idempotency | Not applied — low risk | `POST /bookings` carries no client-generated idempotency key. Risk is low because `baseQueryWithRetry.ts` excludes non-safe HTTP methods from retries (only GET/HEAD/OPTIONS retried). Recommend backend-side idempotency key support as a future improvement. |
| Retries | Already in place | `baseQueryWithRetry.ts` (SM-FE-01) retries 5xx on safe methods with exponential back-off + jitter. `POST /bookings` is excluded from retry. |
| Circuit Breaker | Not applicable | Server-side resilience pattern. The analogous client-side guard is the polling max-attempts cap (10 attempts, ~60s), which prevents unbounded resource usage on saga timeout. |
| Bulkheads | Not applicable | No thread-pool or connection-pool partitioning needed in a browser frontend. Polling max-10 naturally limits concurrent requests per booking. |
| Cache-aside | Applied | RTK Query in-memory cache: `getBookings` TTL 300s, `getBookingById` TTL 0s (always fresh during polling). `createBooking` and `cancelBooking` mutations invalidate the `Bookings` tag. |

**Assumptions**: Retry and timeout infrastructure from SM-FE-01 (`baseQueryWithRetry.ts`, `baseQueryWithTimeout.ts`) are already integrated and apply automatically to all RTK Query calls including the four booking endpoints.

---

## Context

SM-FE-03 delivered flight search and the "Select" action that stores a `FlightOffer` in Redux and navigates to `/bookings/new`. SM-FE-04 implements the entire downstream booking flow: form → create booking → poll for async saga outcome → confirmation page; plus the booking list and detail views.

The booking-service uses a choreography-based saga (ADR-003): `POST /bookings` returns HTTP 201 with `status: PENDING` immediately. Policy validation, inventory reservation, and payment processing happen asynchronously via Kafka. The UI must poll `GET /bookings/:id` until status reaches a terminal state (`CONFIRMED` or `FAILED`), or time out after a configurable number of attempts.

**Current state**: The route `/bookings/new` exists in `AppRoutes.tsx` but renders a placeholder. `rootReducer.ts` has no `booking` slice. No `bookingApi`, `bookingSlice`, or booking components exist.

**Constraints**:
- TypeScript 5.x strict mode with `exactOptionalPropertyTypes: true`
- All common components imported from `src/common/components/index.ts` barrel — never raw MUI primitives in feature code (feature-owned wrappers like `BookingForm` may use MUI primitives internally)
- `useNavigate` for programmatic routing (React Router v6)
- Polling must not outlive the component mount; abort on unmount
- No new npm dependencies (RTK Query, React Router v6, MUI v5, RHF + Zod already installed)

## Goals / Non-Goals

**Goals:**
- `BookingForm` pre-fills from `searchSlice.selectedOffer` and `auth.user`, submits `POST /bookings`, and drives the polling loop
- `useBooking` hook encapsulates create + poll; returns `{ submit, booking, isSubmitting, isPolling, error }`
- Exponential back-off polling: base 1s, factor ×2, max 10 attempts; abort on terminal status or component unmount
- `BookingPage` (`/bookings/new`) renders BookingForm; redirects to `/bookings/:id/confirmation` on CONFIRMED
- `BookingConfirmationPage` (`/bookings/:id/confirmation`) shows booking reference and CTA
- `BookingListPage` (`/bookings`) renders BookingList with paginated table
- `BookingDetailsPage` (`/bookings/:id`) renders BookingDetails with status timeline
- All new files covered with unit and integration tests (80% coverage); Pact contract test for booking-service consumer
- Barrel `src/features/booking/index.ts` exports all public symbols
- `rootReducer.ts` updated to include `booking: bookingReducer`
- `AppRoutes.tsx` updated with four new routes
- MSW handlers for all four booking endpoints

**Non-Goals:**
- Payment UI beyond a static radio selector (no real payment form or PCI fields)
- Real-time WebSocket updates (polling is sufficient per current architecture)
- Admin/manager booking management (out of scope for SM-FE-04)
- Seat map or ancillary service selection

## Decisions

### D1: Polling in `useBooking` hook (not RTK Query polling)

**Decision**: Implement manual polling via a `useEffect` / `setTimeout` loop inside `useBooking`, not RTK Query's built-in `pollingInterval`.

**Rationale**: RTK Query's `pollingInterval` is a fixed interval; we need exponential back-off (1s → 2s → 4s → …). The hook also needs to stop polling on terminal status and clean up on unmount. `useEffect` with `AbortController`-style cleanup gives precise control without coupling polling logic to the component tree.

**Alternative considered**: RTK Query `pollingInterval` with constant interval — rejected because the saga can take 5–30s; constant 1s polling would be noisy. Back-off is the correct pattern for async saga outcomes.

### D2: `bookingSlice` stores in-progress booking only

**Decision**: `bookingSlice.activeBooking` holds the most recent in-flight or just-created booking. It is set on `POST /bookings` success and cleared when the user navigates away from the confirmation page.

**Rationale**: The booking list and details pages read directly from `bookingApi` RTK Query cache (no duplication in Redux). Only the creation/polling lifecycle needs slice-level coordination.

**Alternative considered**: Storing all bookings in Redux — rejected (redundant with RTK Query cache; adds complexity).

### D3: Cancel via `POST /bookings/:id/cancel` (not DELETE)

**Decision**: Use `POST /bookings/:id/cancel` as specified in the OpenAPI contract. The spec does not expose `DELETE /bookings/:id`; cancellation is a saga trigger, not a resource deletion.

**Alternative considered**: `DELETE /bookings/:id` — rejected (not in OpenAPI spec; would require backend change out of scope for SM-FE-04).

### D4: Polling timeout = 10 attempts, base delay = 1s

**Decision**: Max 10 poll attempts with exponential back-off (1s, 2s, 4s, 8s, 16s, 32s, capped at 30s). After 10 failed attempts without terminal status, treat as `FAILED` and show error.

**Rationale**: Back-end saga typically completes in < 10s. 10 attempts gives ~60s total wait before declaring failure — acceptable for flight booking.

### D5: `BookingForm` reads `searchSlice.selectedOffer` with redirect guard

**Decision**: If `selectedOffer` is `null` when `BookingPage` mounts, immediately redirect to `/search`. This prevents blank forms if the user navigates directly to `/bookings/new`.

**Rationale**: `selectedOffer` is the only pre-fill source. A null offer means there is nothing to book.

## Observability

### Structured Logging

All booking API calls flow through `baseQueryWithReauth.ts`. The logging predicate introduced in SM-FE-03 must be extended to include `/bookings` routes:

```
Logged paths: /flights/search, /flights/offers, /airports, /policies, /bookings, /bookings/:id, /bookings/:id/cancel
```

Each non-2xx response logs:

```json
{
  "level": "error",
  "service": "frontend",
  "correlationId": "<X-Correlation-ID response header>",
  "endpoint": "<method> <path>",
  "status": <http_status>,
  "message": "Booking API error"
}
```

### Polling Loop Logging

Inside `useBooking`, each poll iteration logs at `debug` level:

```json
{
  "level": "debug",
  "service": "frontend",
  "correlationId": "<booking correlationId>",
  "bookingId": "<id>",
  "attempt": <n>,
  "status": "<PENDING|CONFIRMED|FAILED>",
  "message": "Booking poll attempt"
}
```

On poll exhaustion (10 attempts without terminal status):

```json
{
  "level": "warn",
  "service": "frontend",
  "bookingId": "<id>",
  "attempts": 10,
  "message": "Booking poll exhausted — treating as FAILED"
}
```

### Correlation ID Propagation

`baseQueryWithReauth.ts` already sets `X-Correlation-ID` on outbound requests (SM-FE-01). All four booking endpoints (`POST /bookings`, `GET /bookings`, `GET /bookings/:id`, `POST /bookings/:id/cancel`) propagate this header automatically. No additional wiring required.

### Metrics

Frontend emits no Prometheus metrics (browser context). Operational visibility is provided by:
- booking-service Prometheus counters (`bookings_created_total`, `bookings_failed_total`) — already in place
- API Gateway access logs — already in place
- Structured console logs above (captured by browser DevTools and any browser-side log forwarder)

---

## Risks / Trade-offs

- **Polling race on unmount** → Mitigation: store interval timer ref in `useRef`; clear in `useEffect` cleanup function
- **Saga completes before first poll** → Mitigation: poll immediately on success of `POST /bookings` (first delay = 0ms), then apply back-off for subsequent attempts; first poll at 0ms catches instant completions
- **`exactOptionalPropertyTypes` strictness** → Mitigation: all optional props typed as `T | undefined` explicitly where the value can be `undefined` at the call site; no implicit `string | undefined` assigned to `string?`
- **Booking form submits stale offer** → Mitigation: `BookingPage` dispatches `clearSelectedOffer` only on confirmation, not on mount, so the offer persists through the form ↔ confirm cycle
- **Pact contract tests blocked by MSW** → Mitigation: same pattern as SM-FE-03 — `server.close()` in `beforeAll`, `server.listen()` in `afterAll` within contract spec files

## Open Questions

_(none — all decisions resolved above)_
