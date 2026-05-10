## Why

With SM-FE-03 (Flight Search) complete, users can discover and select a flight offer. SM-FE-04 delivers the next step in the corporate travel flow: booking that offer, tracking its asynchronous confirmation through the policy-inventory-payment saga, viewing the booking list, inspecting booking details, and cancelling a booking. Without this slice, the "Select" button on a FlightCard is a dead end.

## What Changes

- New `src/features/booking/booking.types.ts` — `Booking`, `BookingStatus`, `BookingRequest`, `BookingListResponse` TypeScript interfaces
- New `src/features/booking/bookingApi.ts` — RTK Query endpoints: `POST /bookings`, `GET /bookings`, `GET /bookings/:id`, `DELETE /bookings/:id` injected into `baseApi`
- New `src/features/booking/bookingSlice.ts` — active booking state; polling control flag; actions `setActiveBooking`, `clearActiveBooking`, `setPolling`, `clearPolling`; selectors `selectActiveBooking`, `selectIsPolling`
- New `src/features/booking/hooks/useBooking.ts` — wraps `createBooking` mutation; on success, initiates exponential-backoff polling of `GET /bookings/:id` until status is `CONFIRMED` or `FAILED` (max 10 attempts, base delay 1s)
- New `src/features/booking/components/BookingForm.tsx` — displays pre-filled flight details from `searchSlice.selectedOffer`; traveler details from `auth.user`; payment method selector (static list: CORPORATE_CARD, PERSONAL_CARD, INVOICE); Submit button triggers `useBooking`
- New `src/features/booking/components/BookingList.tsx` — paginated table of user bookings; status badge per row; links to BookingDetails
- New `src/features/booking/components/BookingDetails.tsx` — full booking view: itinerary, status timeline (PENDING → CONFIRMED / FAILED / CANCELLED), receipt link when confirmed
- New `src/features/booking/pages/BookingPage.tsx` — route `/bookings/new`; hosts BookingForm; redirects to `/bookings/:id/confirmation` on CONFIRMED status
- New `src/features/booking/pages/BookingConfirmationPage.tsx` — route `/bookings/:id/confirmation`; shows booking reference, flight summary, "View My Bookings" CTA
- New `src/features/booking/pages/BookingListPage.tsx` — route `/bookings`; hosts BookingList
- New `src/features/booking/pages/BookingDetailsPage.tsx` — route `/bookings/:id`; hosts BookingDetails
- New `src/features/booking/index.ts` — barrel exporting all pages, slice, API, hook, types
- Update `src/app/rootReducer.ts` — add `booking: bookingReducer`
- Update `src/routes/AppRoutes.tsx` — add four new routes
- New MSW handlers for booking endpoints in `src/mocks/handlers/booking.handlers.ts`
- Update `src/mocks/handlers/index.ts` — spread `bookingHandlers`

## Capabilities

### New Capabilities

- `frontend-booking`: Full booking feature slice — form, list, details, confirmation pages; RTK Query API; Redux slice with status polling; `useBooking` hook; MSW mocks; all unit + integration + contract tests

### Modified Capabilities

- `frontend-auth`: No requirement changes (auth.user.id is read but auth behaviour is unchanged)

## Impact

- **Code**: `src/features/booking/` (new), `src/app/rootReducer.ts` (updated), `src/routes/AppRoutes.tsx` (updated), `src/mocks/handlers/index.ts` (updated)
- **APIs consumed**: `POST /bookings`, `GET /bookings`, `GET /bookings/:id`, `DELETE /bookings/:id` via API Gateway → booking-service (OpenAPI: `docs/contracts/openapi/openapi-booking-service.yaml`)
- **State dependencies**: reads `search.selectedOffer` (SM-FE-03) and `auth.user` (SM-FE-02)
- **No new npm dependencies** (RTK Query, React Router, MUI already installed)
- **Test files**: 12+ new spec files; Pact contract test for booking-service consumer
