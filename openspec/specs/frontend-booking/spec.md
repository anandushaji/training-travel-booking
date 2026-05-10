## ADDED Requirements

### Requirement: Booking types defined
The system SHALL export `Booking`, `BookingStatus`, `BookingRequest`, `BookingListResponse`, and `BookingItinerary` TypeScript interfaces from `src/features/booking/booking.types.ts`. `BookingStatus` SHALL be a union type `'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED'`.

#### Scenario: Booking interface satisfies expected shape
- **GIVEN** the file `src/features/booking/booking.types.ts` is compiled by the TypeScript 5.x compiler with `strict: true` and `exactOptionalPropertyTypes: true` enabled
- **WHEN** a test file imports `Booking`, `BookingStatus`, `BookingRequest`, `BookingListResponse`, and `BookingItinerary` from the types file and asserts the required fields
- **THEN** TypeScript SHALL compile with zero errors for code asserting the required fields (`id: string`, `travelerId: string`, `flightOfferId: string`, `status: BookingStatus`, `totalAmount: number`, `currency: string`, `createdAt: string`)

---

### Requirement: bookingApi RTK Query endpoints
The system SHALL inject four endpoints into `baseApi` from `src/features/booking/bookingApi.ts`:
- `createBooking` mutation — `POST /bookings` — invalidates `Bookings` tag
- `getBookings` query — `GET /bookings?page=&limit=` — `keepUnusedDataFor: 300`; provides `Bookings` tag
- `getBookingById` query — `GET /bookings/:id` — `keepUnusedDataFor: 0` (always fresh for polling); provides `['Bookings', id]` tag
- `cancelBooking` mutation — `POST /bookings/:id/cancel` — invalidates `['Bookings', id]` and `Bookings` tags

#### Scenario: createBooking sends correct POST body
- **GIVEN** MSW is configured with `POST /api/bookings` returning 201 and a Redux store is initialized with `bookingApi` injected into `baseApi`
- **WHEN** `createBooking({ travelerId: 'user-1', flightOfferId: 'offer-42', itinerary: { origin: 'LHR', destination: 'JFK', departureDate: '2026-06-01', cabinClass: 'ECONOMY', passengers: 1 } })` is dispatched
- **THEN** a `POST http://localhost/api/bookings` request SHALL be made with JSON body `{ travelerId: 'user-1', flightOfferId: 'offer-42', itinerary: { origin: 'LHR', destination: 'JFK', departureDate: '2026-06-01', cabinClass: 'ECONOMY', passengers: 1 } }`

#### Scenario: getBookings sends correct page/limit params
- **GIVEN** MSW is configured with `GET /api/bookings` returning a valid `BookingListResponse` and a Redux store is initialized with `bookingApi`
- **WHEN** `getBookings({ page: 2, limit: 10 })` is dispatched
- **THEN** a `GET http://localhost/api/bookings?page=2&limit=10` request SHALL be made

#### Scenario: getBookingById uses zero TTL
- **GIVEN** MSW is configured with `GET /api/bookings/booking-1` returning a confirmed booking and a Redux store is initialized with `bookingApi`
- **WHEN** `getBookingById('booking-1')` is dispatched twice with identical id within 300s
- **THEN** two separate HTTP requests SHALL be made (no caching)

#### Scenario: cancelBooking hits correct endpoint
- **GIVEN** MSW is configured with `POST /api/bookings/b-1/cancel` returning a cancelled booking and a Redux store is initialized with `bookingApi`
- **WHEN** `cancelBooking({ bookingId: 'b-1', reason: 'Change of plans' })` is dispatched
- **THEN** a `POST http://localhost/api/bookings/b-1/cancel` request SHALL be made

---

### Requirement: bookingSlice state management
The system SHALL provide a Redux slice at `src/features/booking/bookingSlice.ts` with initial state `{ activeBooking: null, isPolling: false }`. It SHALL export actions `setActiveBooking`, `clearActiveBooking`, `setPolling`; and selectors `selectActiveBooking`, `selectIsPolling`.

#### Scenario: setActiveBooking stores booking in state
- **GIVEN** a Redux store with `bookingSlice` at initial state `{ activeBooking: null, isPolling: false }` and a booking fixture `{ id: 'b-1', status: 'PENDING', travelerId: 'user-1', flightOfferId: 'offer-42', totalAmount: 1200, currency: 'GBP', createdAt: '2026-06-01T10:00:00Z' }`
- **WHEN** `setActiveBooking(bookingFixture)` is dispatched
- **THEN** `selectActiveBooking(store.getState())` SHALL return the booking fixture with all fields intact

#### Scenario: clearActiveBooking resets to null
- **GIVEN** a Redux store with `bookingSlice.activeBooking` set to booking fixture `{ id: 'b-1', ... }`
- **WHEN** `clearActiveBooking()` is dispatched
- **THEN** `selectActiveBooking(store.getState())` SHALL return `null`

#### Scenario: setPolling toggles polling flag
- **GIVEN** a Redux store with `bookingSlice` at initial state `{ activeBooking: null, isPolling: false }`
- **WHEN** `setPolling(true)` is dispatched
- **THEN** `selectIsPolling(store.getState())` SHALL return `true`

---

### Requirement: rootReducer includes booking slice
The system SHALL register `booking: bookingReducer` in `src/app/rootReducer.ts`.

#### Scenario: booking slice present at store creation
- **GIVEN** the root reducer is configured with `booking: bookingReducer`
- **WHEN** the Redux store is created using `configureStore({ reducer: rootReducer })`
- **THEN** `store.getState().booking` SHALL deep-equal `{ activeBooking: null, isPolling: false }`

---

### Requirement: useBooking hook
The system SHALL provide `src/features/booking/hooks/useBooking.ts`. When `submit(request)` is called it SHALL:
1. Call `createBooking(request)` mutation
2. On 201 success: dispatch `setActiveBooking(booking)`, dispatch `setPolling(true)`, begin polling `getBookingById(id)` with exponential back-off (base 1s, factor ×2, max 10 attempts, per-attempt cap 30s)
3. On polling reaching `CONFIRMED` or `FAILED`: dispatch `setPolling(false)`; stop polling
4. On unmount: abort any in-flight poll timer
5. On `createBooking` returning a non-2xx response: set `error` and return `isSubmitting: false`
6. On poll exhausting all 10 attempts without a terminal status: set `error` to a timeout message and set `isPolling: false`

The hook SHALL return `{ submit, booking, isSubmitting, isPolling, error }`.

#### Scenario: useBooking polls until CONFIRMED
- **GIVEN** MSW returns `{ status: 201, body: { id: 'b-1', status: 'PENDING', ... } }` for `POST /api/bookings` and `{ status: 200, body: { status: 'PENDING' } }` for the first `GET /api/bookings/b-1` and `{ status: 200, body: { status: 'CONFIRMED' } }` for the second
- **WHEN** `submit({ travelerId: 'user-1', flightOfferId: 'offer-42', itinerary: {...} })` is called on the hook
- **THEN** `booking.status` SHALL eventually equal `'CONFIRMED'` AND `isPolling` SHALL be `false`

#### Scenario: useBooking stops polling on FAILED
- **GIVEN** MSW returns `{ status: 201, body: { id: 'b-2', status: 'PENDING', ... } }` for `POST /api/bookings` and `{ status: 200, body: { id: 'b-2', status: 'FAILED' } }` for `GET /api/bookings/b-2`
- **WHEN** the first poll completes
- **THEN** polling SHALL stop and `booking.status` SHALL equal `'FAILED'` AND `isPolling` SHALL be `false`

#### Scenario: useBooking cleans up on unmount
- **GIVEN** `createBooking` returned a PENDING booking (`id: 'b-3'`) and the polling loop is active (first poll timer has been set but not yet fired)
- **WHEN** the component using `useBooking` unmounts
- **THEN** no further `GET /api/bookings/b-3` HTTP requests SHALL be made after unmount

#### Scenario: useBooking surfaces error on createBooking transient failure
- **GIVEN** MSW returns 503 for `POST /api/bookings` on the first call and the configured `baseQueryWithRetry` retries up to `MAX_RETRIES` times (all returning 503)
- **WHEN** `submit(request)` is called and all retries are exhausted
- **THEN** `error` SHALL be set to a non-null error value AND `isSubmitting` SHALL be `false` AND `isPolling` SHALL be `false`

#### Scenario: useBooking stops and sets error after 10 poll attempts
- **GIVEN** MSW always returns `{ status: 200, body: { id: 'b-4', status: 'PENDING' } }` for `GET /api/bookings/b-4` and `createBooking` has returned `id: 'b-4'` successfully
- **WHEN** 10 poll attempts all complete with status `PENDING`
- **THEN** `isPolling` SHALL be `false` AND `error` SHALL contain a non-null timeout message AND no further `GET /api/bookings/b-4` requests SHALL be made

---

### Requirement: BookingForm component
`src/features/booking/components/BookingForm.tsx` SHALL:
- Pre-fill flight summary from `searchSlice.selectedOffer` (airline, route, dates, price)
- Display traveler name and email from `auth.user` (read-only)
- Render a payment method radio group with options: `CORPORATE_CARD`, `PERSONAL_CARD`, `INVOICE`; the field SHALL be required — submitting without a selection SHALL display a validation error
- Have a "Confirm Booking" submit button that calls `useBooking.submit`
- Show a loading spinner while `isSubmitting` is `true`
- Show an inline error `Alert` when `error` is set

#### Scenario: BookingForm renders offer details
- **GIVEN** a Redux store with `searchSlice.selectedOffer` set to `{ airline: 'British Airways', origin: 'LHR', destination: 'JFK', departureDate: '2026-06-01', price: 1200, currency: 'GBP', cabinClass: 'ECONOMY', passengers: 1, id: 'offer-42' }` and `auth.user` set to `{ id: 'user-1', name: 'Alice Smith', email: 'alice@corp.com' }`
- **WHEN** `BookingForm` is rendered
- **THEN** the airline name `'British Airways'`, origin `'LHR'`, destination `'JFK'`, and price `'1200'` SHALL be visible in the DOM

#### Scenario: BookingForm submit calls useBooking
- **GIVEN** a Redux store with `selectedOffer` and `auth.user` as above and a mocked `useBooking` hook
- **WHEN** the user selects payment method `CORPORATE_CARD` and clicks "Confirm Booking"
- **THEN** `useBooking.submit` SHALL be called with `{ travelerId: 'user-1', flightOfferId: 'offer-42', itinerary: { origin: 'LHR', destination: 'JFK', departureDate: '2026-06-01', cabinClass: 'ECONOMY', passengers: 1 } }`

#### Scenario: BookingForm shows validation error for missing payment method
- **GIVEN** a Redux store with `selectedOffer` and `auth.user` set and a mocked `useBooking` hook
- **WHEN** the user clicks "Confirm Booking" without selecting a payment method
- **THEN** a validation error message SHALL be visible in the DOM AND `useBooking.submit` SHALL NOT have been called

#### Scenario: BookingForm redirects to null-offer guard
- **GIVEN** `searchSlice.selectedOffer` is `null` in the Redux store
- **WHEN** `BookingPage` renders
- **THEN** the router SHALL navigate to `/search`

---

### Requirement: BookingPage
`src/features/booking/pages/BookingPage.tsx` SHALL be rendered at route `/bookings/new`. It SHALL:
- Redirect to `/search` if `selectedOffer` is `null`
- Render `BookingForm`
- On `booking.status === 'CONFIRMED'`, navigate to `/bookings/:id/confirmation` using `useNavigate`
- On `booking.status === 'FAILED'`, display an error message and remain on the booking page (no redirect)

#### Scenario: BookingPage redirects when no offer selected
- **GIVEN** a Redux store with `selectedOffer: null`
- **WHEN** `BookingPage` renders
- **THEN** the current route SHALL change to `/search`

#### Scenario: BookingPage navigates to confirmation on CONFIRMED
- **GIVEN** a Redux store with `selectedOffer` set and `useBooking` returning `{ booking: { id: 'b-1', status: 'CONFIRMED' }, isPolling: false, ... }`
- **WHEN** `BookingPage` renders
- **THEN** the router SHALL navigate to `/bookings/b-1/confirmation`

#### Scenario: BookingPage shows error on FAILED booking
- **GIVEN** a Redux store with `selectedOffer` set and `useBooking` returning `{ booking: { id: 'b-2', status: 'FAILED' }, error: 'Booking failed', isPolling: false, ... }`
- **WHEN** `BookingPage` renders
- **THEN** an error message SHALL be visible in the DOM AND the route SHALL remain `/bookings/new`

---

### Requirement: BookingConfirmationPage
`src/features/booking/pages/BookingConfirmationPage.tsx` SHALL:
- Display the booking reference (`booking.id`)
- Display a flight summary (airline, route, dates)
- Render a "View My Bookings" button that navigates to `/bookings`
- Dispatch `clearActiveBooking` on mount
- When `booking.receiptId` is present, render a "View Receipt" link navigating to `/expenses/receipts/:receiptId`
- When `booking.receiptId` is absent or undefined, omit the receipt link (no error shown)

#### Scenario: Confirmation page shows booking reference
- **GIVEN** the route is `/bookings/b-1/confirmation` and MSW returns a booking with `{ id: 'b-1', status: 'CONFIRMED', ... }` for `GET /api/bookings/b-1`
- **WHEN** `BookingConfirmationPage` renders
- **THEN** the booking id `'b-1'` SHALL be visible in the DOM

#### Scenario: Confirmation page navigates to list on CTA
- **GIVEN** `BookingConfirmationPage` is rendered at route `/bookings/b-1/confirmation` with MSW returning a CONFIRMED booking
- **WHEN** the user clicks "View My Bookings"
- **THEN** the router SHALL navigate to `/bookings`

#### Scenario: Receipt link shown when receiptId present
- **GIVEN** MSW returns a booking with `{ id: 'b-1', status: 'CONFIRMED', receiptId: 'r-1' }` for `GET /api/bookings/b-1`
- **WHEN** `BookingConfirmationPage` renders
- **THEN** a link to `/expenses/receipts/r-1` SHALL be visible in the DOM

#### Scenario: Receipt link absent when receiptId missing
- **GIVEN** MSW returns a booking with `{ id: 'b-2', status: 'CONFIRMED' }` (no `receiptId`) for `GET /api/bookings/b-2`
- **WHEN** `BookingConfirmationPage` renders
- **THEN** no receipt link SHALL be present in the DOM

---

### Requirement: BookingList component
`src/features/booking/components/BookingList.tsx` SHALL:
- Call `useGetBookingsQuery({ page, limit: 20 })`
- Render a table/list with columns: Booking ID, Origin→Destination, Departure Date, Status, Actions
- Show a `StatusBadge` for each booking status
- Show skeleton rows while loading
- Show an empty state when the list is empty
- Show pagination controls; clicking a page updates `page` state
- "View Details" action per row navigates to `/bookings/:id`

#### Scenario: BookingList renders booking rows
- **GIVEN** MSW is configured with `GET /api/bookings?page=1&limit=20` returning `{ bookings: [<b-1>, <b-2>, <b-3>], pagination: { currentPage: 1, totalPages: 1, totalItems: 3, limit: 20 } }`
- **WHEN** `BookingList` is rendered within a Redux Provider and Router
- **THEN** 3 "View Details" links SHALL be visible in the DOM

#### Scenario: BookingList shows empty state for zero results
- **GIVEN** MSW is configured with `GET /api/bookings?page=1&limit=20` returning `{ bookings: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 20 } }`
- **WHEN** `BookingList` is rendered
- **THEN** an empty-state message SHALL be visible in the DOM and no table rows SHALL be present

---

### Requirement: BookingDetails component
`src/features/booking/components/BookingDetails.tsx` SHALL:
- Accept `bookingId: string` prop
- Call `useGetBookingByIdQuery(bookingId)`
- Display full itinerary: origin, destination, departure date, cabin class
- Display status timeline: PENDING → CONFIRMED or PENDING → FAILED or CONFIRMED → CANCELLED
- Show a loading skeleton while fetching
- Show a "Cancel Booking" button only when status is `PENDING` or `CONFIRMED`
- On "Cancel", call `cancelBooking` and show confirmation

#### Scenario: BookingDetails renders itinerary
- **GIVEN** MSW is configured with `GET /api/bookings/b-1` returning `{ id: 'b-1', status: 'CONFIRMED', itinerary: { origin: 'LHR', destination: 'JFK', departureDate: '2026-06-01', cabinClass: 'ECONOMY' }, ... }`
- **WHEN** `BookingDetails` is rendered with `bookingId="b-1"`
- **THEN** `'LHR'`, `'JFK'`, and a status badge with text `'CONFIRMED'` SHALL be visible in the DOM

#### Scenario: Cancel button absent for CANCELLED booking
- **GIVEN** MSW is configured with `GET /api/bookings/b-2` returning `{ id: 'b-2', status: 'CANCELLED', ... }`
- **WHEN** `BookingDetails` is rendered with `bookingId="b-2"`
- **THEN** no element with text `'Cancel Booking'` SHALL be present in the DOM

---

### Requirement: MSW handlers for booking endpoints
`src/mocks/handlers/booking.handlers.ts` SHALL provide handlers for:
- `GET /api/bookings` — returns `{ bookings: [<default booking>], pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 20 } }`
- `POST /api/bookings` — returns 201 with a `PENDING` booking
- `GET /api/bookings/:id` — returns booking with `status: 'CONFIRMED'` by default
- `POST /api/bookings/:id/cancel` — returns booking with `status: 'CANCELLED'`

#### Scenario: MSW POST /bookings returns 201 PENDING
- **GIVEN** MSW is started and the booking handlers are registered
- **WHEN** `POST /api/bookings` is called in a test
- **THEN** the response SHALL have HTTP status `201` and `body.status === 'PENDING'`

---

### Requirement: Pact consumer contract for booking-service
`src/features/booking/__tests__/contracts/bookingApi.contract.spec.ts` SHALL contain a Pact V3 consumer test covering `POST /bookings` returning a 201 Booking shape.

#### Scenario: POST /bookings contract test passes
- **GIVEN** the Pact mock server is configured with the `createBooking` interaction and MSW is stopped for the duration of the test
- **WHEN** the `createBooking` request is sent to the Pact mock server with a valid `BookingRequest` body
- **THEN** the response SHALL match the Booking schema with required fields `id`, `status`, `travelerId`, `flightOfferId`, and the pact file SHALL be written to `pacts/frontend-booking-service.json`

---

### Requirement: AppRoutes updated with booking routes
`src/routes/AppRoutes.tsx` SHALL include routes:
- `/bookings/new` → `BookingPage`
- `/bookings/:id/confirmation` → `BookingConfirmationPage`
- `/bookings` → `BookingListPage`
- `/bookings/:id` → `BookingDetailsPage`

#### Scenario: All four booking routes resolve
- **GIVEN** the router is rendered with all route definitions and a Redux store
- **WHEN** the path is set to each of `/bookings/new`, `/bookings/b-1/confirmation`, `/bookings`, and `/bookings/b-1` in turn
- **THEN** the corresponding page component (`BookingPage`, `BookingConfirmationPage`, `BookingListPage`, `BookingDetailsPage`) SHALL be rendered for each path

---

### Requirement: Booking feature barrel export
`src/features/booking/index.ts` SHALL export:
`BookingPage`, `BookingConfirmationPage`, `BookingListPage`, `BookingDetailsPage`, `bookingReducer`, `selectActiveBooking`, `selectIsPolling`, `setActiveBooking`, `clearActiveBooking`, `setPolling`, `useBooking`, `bookingApi`

#### Scenario: Barrel exports all required symbols
- **GIVEN** the barrel file `src/features/booking/index.ts` exists and all sub-modules it references have been compiled
- **WHEN** `import * as barrel from './index'` is executed in a test
- **THEN** all listed symbols SHALL be defined (not `undefined`)

---

### Requirement: Booking type includes optional receiptId
`src/features/booking/booking.types.ts` `Booking` interface SHALL include an optional field `receiptId?: string` representing the ID of the generated receipt for this booking.

#### Scenario: Booking interface allows receiptId
- **GIVEN** a `Booking` object is constructed with `receiptId: 'r-1'`
- **WHEN** TypeScript compiles with `exactOptionalPropertyTypes: true`
- **THEN** no type errors SHALL be emitted

#### Scenario: Booking interface allows omitted receiptId
- **GIVEN** a `Booking` object is constructed without `receiptId`
- **WHEN** TypeScript compiles
- **THEN** no type errors SHALL be emitted
