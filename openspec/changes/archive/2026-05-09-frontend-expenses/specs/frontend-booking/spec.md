## MODIFIED Requirements

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

## ADDED Requirements

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
