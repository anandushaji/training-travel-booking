## 1. Types and API layer

- [x] 1.1 Create `src/features/booking/booking.types.ts` — define `BookingStatus` union (`'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED'`), `BookingItinerary`, `Booking`, `BookingRequest`, `BookingListResponse` interfaces matching OpenAPI schema
  - **AC**: TypeScript compiles with zero errors for any code importing these interfaces
  - **Artifact**: `src/features/booking/booking.types.spec.ts`: "booking.types — all exported interfaces satisfy expected shape"
  - **Must fail if**: Required field removed or typed incorrectly

- [x] 1.2 Create `src/features/booking/bookingApi.ts` — inject `createBooking` (POST /bookings, invalidates Bookings tag), `getBookings` (GET /bookings, keepUnusedDataFor:300, provides Bookings tag), `getBookingById` (GET /bookings/:id, keepUnusedDataFor:0), `cancelBooking` (POST /bookings/:id/cancel) into `baseApi`
  - **AC** (createBooking): GIVEN MSW returns 201, WHEN `createBooking({ travelerId, flightOfferId, itinerary })` is dispatched, THEN `POST http://localhost/api/bookings` SHALL have been called with the correct body
  - **AC** (getBookings): WHEN `getBookings({ page: 2, limit: 10 })` is dispatched, THEN `GET .../api/bookings?page=2&limit=10` SHALL have been called
  - **AC** (getBookingById zero TTL): WHEN `getBookingById` is dispatched twice with identical id within 300s, THEN two HTTP requests SHALL have been made
  - **AC** (cancelBooking): WHEN `cancelBooking({ bookingId: 'b-1', reason: 'Change' })` is dispatched, THEN `POST .../api/bookings/b-1/cancel` SHALL have been called
  - **Artifact**: `src/features/booking/bookingApi.spec.ts`: "createBooking — sends correct POST body" | "getBookings — sends page/limit params" | "getBookingById — zero TTL forces re-fetch" | "cancelBooking — hits correct endpoint"
  - **Must fail if**: URL is wrong, body is mis-serialised, or keepUnusedDataFor is non-zero for getBookingById

- [x] 1.3 Update `src/api/baseQueryWithReauth.ts` — extend the error-logging predicate to include `/api/bookings`, `/api/bookings/:id`, and `/api/bookings/:id/cancel` paths (add these alongside the existing `/flights/search`, `/airports`, `/policies` entries); log shape: `{ level: 'error', service: 'frontend', correlationId, endpoint: '<method> <path>', status, message: 'Booking API error' }`
  - **AC**: GIVEN MSW returns 4xx for `GET /api/bookings/b-1`, WHEN the request is made via `getBookingById`, THEN a structured log event SHALL be emitted containing `endpoint`, `status`, and `correlationId` fields
  - **Artifact**: `src/api/baseQueryWithReauth.spec.ts` — add test case "baseQueryWithReauth — logs structured error for /bookings 4xx response"
  - **Must fail if**: Logging predicate excludes `/bookings` paths or emitted log is missing required fields

## 2. Redux slice

- [x] 2.1 Create `src/features/booking/bookingSlice.ts` — initial state `{ activeBooking: null, isPolling: false }`; actions `setActiveBooking`, `clearActiveBooking`, `setPolling`; selectors `selectActiveBooking`, `selectIsPolling`
  - **AC** (setActiveBooking): WHEN `setActiveBooking(booking)` is dispatched, THEN `selectActiveBooking` SHALL return the booking
  - **AC** (clearActiveBooking): WHEN `clearActiveBooking()` is dispatched, THEN `selectActiveBooking` SHALL return `null`
  - **AC** (setPolling): WHEN `setPolling(true)` is dispatched, THEN `selectIsPolling` SHALL return `true`
  - **Artifact**: `src/features/booking/bookingSlice.spec.ts`: "setActiveBooking" | "clearActiveBooking" | "setPolling"
  - **Must fail if**: State not updated on dispatch or selectors read wrong key

- [x] 2.2 Register `booking: bookingReducer` in `src/app/rootReducer.ts`
  - **AC**: GIVEN store is created, WHEN `store.getState()` is called, THEN `store.getState().booking` SHALL equal `{ activeBooking: null, isPolling: false }`
  - **Artifact**: `src/app/rootReducer.spec.ts` — add assertion for booking slice initial state
  - **Must fail if**: `booking` key absent from state

## 3. MSW handlers

- [x] 3.1 Create `src/mocks/handlers/booking.handlers.ts` — handlers for `GET /api/bookings`, `POST /api/bookings` (201 PENDING), `GET /api/bookings/:id` (CONFIRMED), `POST /api/bookings/:id/cancel` (CANCELLED)
  - **AC**: WHEN `POST /api/bookings` is intercepted, THEN response SHALL be 201 with `body.status === 'PENDING'`
  - **Artifact**: `src/mocks/handlers/booking.handlers.ts` (handler file itself serves as artifact; tested implicitly by component specs)
  - **Must fail if**: Handlers return wrong status codes or missing fields

- [x] 3.2 Update `src/mocks/handlers/index.ts` — spread `bookingHandlers` into the handlers array
  - **AC**: GIVEN `src/mocks/handlers/index.ts` is imported, WHEN the `handlers` export is inspected, THEN it SHALL include all four booking handler entries (GET /api/bookings, POST /api/bookings, GET /api/bookings/:id, POST /api/bookings/:id/cancel)
  - **Artifact**: `src/mocks/handlers/index.spec.ts` — add test case "handlers index — includes bookingHandlers entries"
  - **Must fail if**: `bookingHandlers` spread removed from the index array

## 4. useBooking hook

- [x] 4.1 Create `src/features/booking/hooks/useBooking.ts` — `submit(request)` calls `createBooking`; on success dispatches `setActiveBooking` + `setPolling(true)` + starts polling loop (base 1s, ×2, max 10 attempts, cap 30s per interval); polls via `getBookingById`; on CONFIRMED or FAILED dispatches `setPolling(false)` and stops; clears timer on unmount via `useEffect` cleanup
  - **AC** (polls until CONFIRMED): WHEN createBooking returns PENDING and second poll returns CONFIRMED, THEN `booking.status` SHALL equal 'CONFIRMED' and `isPolling` SHALL be false
  - **AC** (stops on FAILED): WHEN `getBookingById` returns status FAILED, THEN polling SHALL stop and `isPolling` SHALL be false
  - **AC** (unmount cleanup): WHEN component unmounts while polling, THEN no further requests SHALL be made
  - **AC** (createBooking transient failure): GIVEN `POST /api/bookings` returns 503 for all retry attempts, WHEN `submit(request)` is called, THEN `error` SHALL be non-null AND `isSubmitting` SHALL be false AND `isPolling` SHALL be false
  - **AC** (poll exhaustion): GIVEN `GET /api/bookings/:id` always returns PENDING, WHEN 10 poll attempts complete, THEN `isPolling` SHALL be false AND `error` SHALL contain a timeout message
  - **Artifact**: `src/features/booking/hooks/useBooking.spec.ts`: "useBooking — polls until CONFIRMED" | "useBooking — stops on FAILED" | "useBooking — cleans up on unmount" | "useBooking — error on createBooking failure" | "useBooking — error and stops after 10 poll attempts"
  - **Must fail if**: Polling continues after terminal status, timer not cleared on unmount, or error not set on exhaustion

## 5. Components

- [x] 5.1 Create `src/features/booking/components/BookingForm.tsx` — displays pre-filled offer details from `selectSelectedOffer`, traveler name/email from `auth.user` (read-only), payment method radio group (`CORPORATE_CARD` | `PERSONAL_CARD` | `INVOICE`), "Confirm Booking" button calling `useBooking.submit`, loading spinner while `isSubmitting`, error `Alert` when `error` is set
  - **AC** (renders offer): WHEN rendered with selectedOffer in Redux, THEN airline, origin, destination, and price SHALL be visible
  - **AC** (submit): WHEN payment method selected and "Confirm Booking" clicked, THEN `useBooking.submit` SHALL be called with correct args including `travelerId: auth.user.id`
  - **AC** (validation — missing payment method): WHEN "Confirm Booking" clicked without a payment method selected, THEN a validation error SHALL be visible in the DOM AND `useBooking.submit` SHALL NOT have been called
  - **Artifact**: `src/features/booking/components/BookingForm.spec.tsx`: "BookingForm — renders offer details" | "BookingForm — submit calls useBooking with correct args" | "BookingForm — shows validation error for missing payment method"
  - **Must fail if**: Submit fires with wrong travelerId, offer fields not displayed, or form submits without payment method

- [x] 5.2 Create `src/features/booking/components/BookingList.tsx` — calls `useGetBookingsQuery({ page, limit: 20 })`; renders table rows with booking ID, route, departure date, StatusBadge for status, "View Details" link to `/bookings/:id`; skeleton rows while loading; empty state when zero results; pagination controls
  - **AC** (renders rows): WHEN MSW returns 3 bookings, THEN 3 "View Details" links SHALL be in the DOM
  - **AC** (empty state): WHEN MSW returns 0 bookings, THEN empty-state message SHALL be visible
  - **Artifact**: `src/features/booking/components/BookingList.spec.tsx`: "BookingList — renders booking rows" | "BookingList — empty state"
  - **Must fail if**: Rows not rendered or empty state absent

- [x] 5.3 Create `src/features/booking/components/BookingDetails.tsx` — fetches `getBookingById(bookingId)`; displays itinerary (origin, destination, departureDate, cabinClass); status timeline chip; loading skeleton; "Cancel Booking" button only when status is PENDING or CONFIRMED; cancel calls `cancelBooking`
  - **AC** (renders itinerary): WHEN MSW returns a CONFIRMED booking, THEN origin, destination, and "CONFIRMED" badge SHALL be visible
  - **AC** (cancel absent for CANCELLED): WHEN booking status is CANCELLED, THEN no "Cancel Booking" button SHALL be in the DOM
  - **Artifact**: `src/features/booking/components/BookingDetails.spec.tsx`: "BookingDetails — renders itinerary" | "BookingDetails — no cancel button for CANCELLED booking"
  - **Must fail if**: Cancel button shown for terminal status, or fields not displayed

## 6. Pages

- [x] 6.1 Create `src/features/booking/pages/BookingPage.tsx` — route `/bookings/new`; redirects to `/search` if `selectedOffer` is null; renders `BookingForm`; on `booking.status === 'CONFIRMED'` calls `navigate('/bookings/:id/confirmation')`; on `booking.status === 'FAILED'` displays an error message and remains on the current route
  - **AC** (redirect guard): WHEN `selectedOffer` is null, THEN route SHALL change to `/search`
  - **AC** (navigate on confirmed): WHEN `useBooking` reports CONFIRMED, THEN router SHALL navigate to `/bookings/<id>/confirmation`
  - **AC** (FAILED booking error): WHEN `useBooking` reports FAILED, THEN an error message SHALL be visible in the DOM AND the route SHALL remain `/bookings/new`
  - **Artifact**: `src/features/booking/pages/BookingPage.spec.tsx`: "BookingPage — redirects when no offer" | "BookingPage — navigates to confirmation on CONFIRMED" | "BookingPage — shows error message on FAILED booking"
  - **Must fail if**: Form rendered with null offer, navigation to confirmation skipped, or error not shown on FAILED

- [x] 6.2 Create `src/features/booking/pages/BookingConfirmationPage.tsx` — reads `:id` from URL param; calls `getBookingById(id)`; displays booking `id`, flight summary; "View My Bookings" navigates to `/bookings`; dispatches `clearActiveBooking` on mount
  - **AC** (shows reference): WHEN rendered with a confirmed booking, THEN booking id SHALL be visible in the DOM
  - **AC** (CTA navigates): WHEN "View My Bookings" clicked, THEN router SHALL navigate to `/bookings`
  - **Artifact**: `src/features/booking/pages/BookingConfirmationPage.spec.tsx`: "BookingConfirmationPage — shows reference" | "BookingConfirmationPage — CTA navigates to list"
  - **Must fail if**: booking reference missing or CTA goes to wrong route

- [x] 6.3 Create `src/features/booking/pages/BookingListPage.tsx` — wraps `BookingList`; title "My Bookings"
  - **AC**: WHEN rendered, THEN "My Bookings" heading SHALL be visible
  - **Artifact**: `src/features/booking/pages/BookingListPage.spec.tsx`: "BookingListPage — renders heading"
  - **Must fail if**: Heading absent

- [x] 6.4 Create `src/features/booking/pages/BookingDetailsPage.tsx` — reads `:id` from URL param; passes to `BookingDetails`
  - **AC**: WHEN rendered with bookingId "b-1", THEN `BookingDetails` SHALL receive `bookingId="b-1"`
  - **Artifact**: `src/features/booking/pages/BookingDetailsPage.spec.tsx`: "BookingDetailsPage — passes bookingId to BookingDetails"
  - **Must fail if**: bookingId prop not passed

## 7. Routing

- [x] 7.1 Update `src/routes/routes.config.ts` — add route constants `BOOKINGS_NEW = '/bookings/new'`, `BOOKING_CONFIRMATION = '/bookings/:id/confirmation'`, `BOOKINGS_LIST = '/bookings'`, `BOOKING_DETAIL = '/bookings/:id'`; then update `src/routes/AppRoutes.tsx` — add four protected routes using these constants: `ROUTES.BOOKINGS_NEW` → `BookingPage`, `ROUTES.BOOKING_CONFIRMATION` → `BookingConfirmationPage`, `ROUTES.BOOKINGS_LIST` → `BookingListPage`, `ROUTES.BOOKING_DETAIL` → `BookingDetailsPage`; import all four pages from `../features/booking`
  - **AC**: WHEN router navigates to each of the four paths, THEN the correct page component SHALL render
  - **Artifact**: `src/routes/AppRoutes.spec.tsx` — add four route resolution tests (or update existing file)
  - **Must fail if**: Route missing, page component not rendered, or path strings hardcoded (not using ROUTES constants)

## 8. Barrel export

- [x] 8.1 Create `src/features/booking/index.ts` — export `BookingPage`, `BookingConfirmationPage`, `BookingListPage`, `BookingDetailsPage`, `bookingReducer`, `selectActiveBooking`, `selectIsPolling`, `setActiveBooking`, `clearActiveBooking`, `setPolling`, `useBooking`, `bookingApi`
  - **AC**: `import * as barrel from './index'` results in all listed symbols being defined
  - **Artifact**: `src/features/booking/index.spec.ts`: "booking barrel — all required exports present"
  - **Must fail if**: Any listed export is missing

## 9. Contract test

- [x] 9.1 Create `src/features/booking/__tests__/contracts/bookingApi.contract.spec.ts` — Pact V3 consumer test for `POST /bookings` returning 201 Booking; follow SM-FE-03 pattern: `server.close()` in `beforeAll`, `server.listen()` in `afterAll`
  - **AC**: Pact file written to `pacts/frontend-booking-service.json` containing the interaction
  - **Artifact**: `src/features/booking/__tests__/contracts/bookingApi.contract.spec.ts`
  - **Must fail if**: Pact interaction not written or request/response shape deviates from OpenAPI

- [x] 9.2 Update `openspec/CONTRACTS.md` — add entry for the `frontend ↔ booking-service` Pact V3 consumer contract produced by task 9.1
  - **AC**: `openspec/CONTRACTS.md` contains an entry referencing `pacts/frontend-booking-service.json` with consumer `frontend` and provider `booking-service`
  - **Artifact**: `openspec/CONTRACTS.md` inspection (manual review)
  - **Must fail if**: Entry missing or consumer/provider names incorrect
