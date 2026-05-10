## ADDED Requirements

### Requirement: SearchForm collects flight search parameters
The system SHALL render a form with origin airport, destination airport, departure date, optional return date, passenger count (adults 1–9), cabin class (ECONOMY | PREMIUM_ECONOMY | BUSINESS | FIRST), and a non-stop toggle. All required fields SHALL be validated before submission. The form SHALL debounce changes by 400 ms before triggering an API call.

#### Scenario: Required-field validation on empty submit
- **GIVEN** an authenticated Employee is on `/search`, the search form is at its initial empty state, and the inventory API is available
- **WHEN** the user clicks the Submit button without entering origin, destination, or departure date
- **THEN** an inline validation error SHALL appear beneath each missing required field, no `GET /inventory/flights/search` request SHALL be made, and the results area SHALL remain empty

#### Scenario: Successful form submission triggers flight search
- **GIVEN** an authenticated Employee is on `/search`, the inventory API returns HTTP 200 with 3 flight offers, and all required fields (origin="JFK", destination="LAX", departureDate="2026-06-01", adults=1) are filled in
- **WHEN** the user clicks the Submit button
- **THEN** a `GET /inventory/flights/search?origin=JFK&destination=LAX&departureDate=2026-06-01&adults=1` request SHALL be made to the inventory API, and the results area SHALL display a loading skeleton

#### Scenario: Return date optional for one-way trips
- **GIVEN** an authenticated Employee is on `/search` with origin="JFK", destination="LAX", departureDate="2026-06-01", adults=1 filled in, returnDate left empty, and the inventory API returns HTTP 200 with 2 offers
- **WHEN** the user clicks the Submit button
- **THEN** the API call SHALL omit the `returnDate` query parameter AND 2 flight cards SHALL be displayed

#### Scenario: Adults count below minimum rejected
- **GIVEN** an authenticated Employee is on `/search` with all required fields filled in but adults set to 0
- **WHEN** the user clicks the Submit button
- **THEN** an inline validation error SHALL appear on the adults field stating the minimum is 1 AND no API call SHALL be made

#### Scenario: Adults count above maximum rejected
- **GIVEN** an authenticated Employee is on `/search` with all required fields filled in but adults set to 10
- **WHEN** the user clicks the Submit button
- **THEN** an inline validation error SHALL appear on the adults field stating the maximum is 9 AND no API call SHALL be made

#### Scenario: Return date before departure date rejected
- **GIVEN** an authenticated Employee is on `/search` with departureDate="2026-06-10" and returnDate="2026-06-05"
- **WHEN** the user clicks the Submit button
- **THEN** an inline validation error SHALL appear on the returnDate field stating the return date must be after the departure date AND no API call SHALL be made

#### Scenario: Departure date in the past rejected
- **GIVEN** an authenticated Employee is on `/search` with a departureDate set to yesterday's date
- **WHEN** the user clicks the Submit button
- **THEN** an inline validation error SHALL appear on the departureDate field stating the departure date cannot be in the past AND no API call SHALL be made

---

### Requirement: AirportInput provides typeahead suggestions
The system SHALL render an autocomplete input that queries `GET /inventory/airports/search?q=<term>` once the user types at least 2 characters. Results SHALL be displayed as `<IATA> — <city>, <name>` options.

#### Scenario: Typeahead skipped for 1-character input
- **GIVEN** an authenticated Employee is on `/search` with the origin AirportInput focused and empty
- **WHEN** the user types exactly 1 character
- **THEN** no `GET /inventory/airports/search` request SHALL be made AND no dropdown SHALL appear

#### Scenario: Typeahead fires after exactly 2 characters
- **GIVEN** an authenticated Employee is on `/search` with the origin AirportInput focused, and the airport search API returns [{ iata: "JFK", city: "New York", name: "John F. Kennedy International" }] for query "JF"
- **WHEN** the user types exactly 2 characters ("JF")
- **THEN** a `GET /inventory/airports/search?q=JF` request SHALL be made AND the dropdown SHALL show the option "JFK — New York, John F. Kennedy International"

#### Scenario: Selecting an airport populates the IATA field
- **GIVEN** an authenticated Employee is on `/search` with the origin AirportInput showing a dropdown containing "JFK — New York, John F. Kennedy International"
- **WHEN** the user clicks on the "JFK — New York, John F. Kennedy International" option
- **THEN** the origin field SHALL be populated with the value "JFK" AND the dropdown SHALL close

#### Scenario: Airport typeahead API failure shows no dropdown
- **GIVEN** an authenticated Employee is on `/search` with the origin AirportInput focused, and the airport search API returns HTTP 503
- **WHEN** the user types 2 or more characters
- **THEN** no dropdown SHALL appear AND no error banner SHALL be shown for the typeahead failure (silent degradation)

---

### Requirement: FlightResults renders offer list
The system SHALL display `FlightCard` components for each `FlightOffer` returned by the search API. It SHALL show a loading skeleton while the query is in-flight and a descriptive empty-state message when zero results are returned. It SHALL show an error banner on API failure with a retry option.

#### Scenario: Loading skeleton during API call
- **GIVEN** an authenticated Employee has submitted a valid search form and the inventory API has not yet responded
- **WHEN** the `GET /inventory/flights/search` request is pending
- **THEN** the results area SHALL display skeleton placeholder cards instead of real flight cards

#### Scenario: Empty-state message for zero results
- **GIVEN** an authenticated Employee has submitted a valid search form and the inventory API returns HTTP 200 with an empty `offers` array
- **WHEN** the response is received
- **THEN** the results area SHALL display a message containing the text "No flights found" (or equivalent) AND no flight cards SHALL be rendered

#### Scenario: Error banner on API permanent failure
- **GIVEN** an authenticated Employee has submitted a valid search form and the inventory API returns HTTP 400
- **WHEN** the response is received
- **THEN** the results area SHALL display an error banner with a "Try again" (or equivalent) retry button AND no flight cards SHALL be rendered AND no retry request SHALL be automatically made

#### Scenario: Error banner after all retries exhausted (transient failure)
- **GIVEN** an authenticated Employee has submitted a valid search form and the inventory API returns HTTP 503 on every attempt for 30 seconds
- **WHEN** the retry deadline of 30s elapses
- **THEN** the results area SHALL display an error banner with a retry option AND no further automatic requests SHALL be made

#### Scenario: Results displayed after transient failure then success
- **GIVEN** an authenticated Employee has submitted a valid search form, the inventory API returns HTTP 503 on the first attempt, and returns HTTP 200 with 2 offers on the second attempt
- **WHEN** the retry succeeds
- **THEN** 2 flight cards SHALL be displayed without any error banner

#### Scenario: Correct number of cards rendered for N offers
- **GIVEN** an authenticated Employee has submitted a valid search form and the inventory API returns HTTP 200 with 5 flight offers
- **WHEN** the response is received
- **THEN** the results area SHALL render exactly 5 `FlightCard` components

---

### Requirement: FlightCard displays offer details and policy badge
Each `FlightCard` SHALL display airline name, origin → destination route, departure and arrival times, number of stops, total duration, and price with currency. It SHALL call `GET /policies/validate` to determine compliance and SHALL render a badge. It SHALL render a "Select" button.

#### Scenario: Policy badge shows loading while validating
- **GIVEN** a FlightCard is rendered for an offer with offerId "offer-1", price $450, currency "USD", and the `GET /policies/validate?offerId=offer-1&amount=450&currency=USD` request is pending
- **WHEN** the FlightCard mounts
- **THEN** a loading spinner SHALL be visible in the policy badge area

#### Scenario: COMPLIANT badge for within-policy offer
- **GIVEN** a FlightCard is rendered for offer with offerId "offer-1" and the policy API returns HTTP 200 with `{ compliant: true }`
- **WHEN** the policy response is received
- **THEN** a green chip with text "COMPLIANT" SHALL replace the loading spinner

#### Scenario: EXCEEDS-POLICY badge for out-of-policy offer
- **GIVEN** a FlightCard is rendered for offer with offerId "offer-1" and the policy API returns HTTP 200 with `{ compliant: false }`
- **WHEN** the policy response is received
- **THEN** an amber chip with text "EXCEEDS POLICY" SHALL replace the loading spinner

#### Scenario: UNKNOWN badge on policy API failure
- **GIVEN** a FlightCard is rendered for offer with offerId "offer-1" and the policy API returns HTTP 503
- **WHEN** the policy error response is received
- **THEN** a grey chip with text "POLICY UNKNOWN" SHALL be displayed (the employee can still select the flight)

#### Scenario: Select button stores offer and navigates to booking
- **GIVEN** an authenticated Employee is viewing FlightResults with 3 offers, and `selectSelectedOffer(store.getState())` returns `null`
- **WHEN** the user clicks the "Select" button on the first FlightCard (offer with id "offer-1")
- **THEN** `selectSelectedOffer(store.getState())` SHALL return the offer with id "offer-1" AND the browser SHALL navigate to `/bookings/new`

---

### Requirement: searchSlice manages filter/sort state and selected offer
`searchSlice` SHALL hold `filters: { sortBy: 'price' | 'duration', maxPrice: number | null }` and `selectedOffer: FlightOffer | null`. It SHALL expose actions `setFilters`, `setSelectedOffer`, and `clearSelectedOffer`. It SHALL expose selectors `selectFilters`, `selectSelectedOffer`.

#### Scenario: setSelectedOffer updates state
- **GIVEN** the search slice is at its initial state with `selectedOffer: null`
- **WHEN** the `setSelectedOffer` action is dispatched with a FlightOffer `{ id: "offer-1", airline: "AA", price: { amount: 350, currency: "USD" }, ... }`
- **THEN** `selectSelectedOffer(store.getState())` SHALL return the offer with `id: "offer-1"`

#### Scenario: clearSelectedOffer resets to null
- **GIVEN** the search slice has `selectedOffer` set to a FlightOffer with id "offer-1"
- **WHEN** the `clearSelectedOffer` action is dispatched
- **THEN** `selectSelectedOffer(store.getState())` SHALL return `null`

#### Scenario: setFilters updates sortBy and maxPrice
- **GIVEN** the search slice is at its initial state with `filters: { sortBy: 'price', maxPrice: null }`
- **WHEN** the `setFilters` action is dispatched with `{ sortBy: 'duration', maxPrice: 500 }`
- **THEN** `selectFilters(store.getState())` SHALL return `{ sortBy: 'duration', maxPrice: 500 }`

#### Scenario: Results sorted by price ascending when sortBy is 'price'
- **GIVEN** FlightResults is rendered with 3 offers with prices $600, $300, $450, and `selectFilters` returns `{ sortBy: 'price', maxPrice: null }`
- **WHEN** the results are displayed
- **THEN** the flight cards SHALL appear in the order $300, $450, $600 from top to bottom

#### Scenario: Results sorted by duration ascending when sortBy is 'duration'
- **GIVEN** FlightResults is rendered with 3 offers with durations 5h, 3h, 7h, and `selectFilters` returns `{ sortBy: 'duration', maxPrice: null }`
- **WHEN** the `setFilters({ sortBy: 'duration', maxPrice: null })` action is dispatched
- **THEN** the flight cards SHALL appear in the order 3h, 5h, 7h from top to bottom

#### Scenario: Results filtered by maxPrice
- **GIVEN** FlightResults is rendered with 3 offers with prices $300, $600, $800, and `selectFilters` returns `{ sortBy: 'price', maxPrice: 500 }`
- **WHEN** the results are displayed
- **THEN** only the offer with price $300 SHALL be displayed AND the offers with prices $600 and $800 SHALL not be visible

---

### Requirement: flightApi exposes lazy search and airport typeahead endpoints
`flightApi` SHALL inject into `baseApi` a `searchFlights` lazy query (`GET /inventory/flights/search`) with `keepUnusedDataFor: 300` and a `searchAirports` query (`GET /inventory/airports/search`) with `keepUnusedDataFor: 600`.

#### Scenario: searchFlights lazy query sends correct URL and parameters
- **GIVEN** `baseApi` is configured with `REACT_APP_API_URL = 'http://localhost/api'` and the inventory API returns HTTP 200 with `{ offers: [], meta: { count: 0, cached: false, searchId: "s-1" } }`
- **WHEN** `triggerSearchFlights({ origin: 'JFK', destination: 'LAX', departureDate: '2026-06-01', adults: 1 })` is called
- **THEN** a `GET http://localhost/api/inventory/flights/search?origin=JFK&destination=LAX&departureDate=2026-06-01&adults=1` request SHALL be made

#### Scenario: searchAirports skips request for input shorter than 2 characters
- **GIVEN** `baseApi` is configured and the airport search API is available
- **WHEN** `searchAirports` is called with `q = "J"` (1 character)
- **THEN** no HTTP request to `GET /inventory/airports/search` SHALL be made

#### Scenario: Cached search result returned without API call within TTL
- **GIVEN** a `searchFlights` query with params `{ origin: 'JFK', destination: 'LAX', departureDate: '2026-06-01', adults: 1 }` has already been made successfully and 299 seconds have elapsed
- **WHEN** `triggerSearchFlights` is called again with the identical parameters
- **THEN** no new `GET /inventory/flights/search` HTTP request SHALL be made AND the previously received offers SHALL be returned from the RTK Query cache

#### Scenario: Cache miss triggers API call on first request
- **GIVEN** no prior `searchFlights` query has been made for params `{ origin: 'BOS', destination: 'SFO', departureDate: '2026-07-01', adults: 1 }` and the inventory API returns HTTP 200 with 2 offers
- **WHEN** `triggerSearchFlights({ origin: 'BOS', destination: 'SFO', departureDate: '2026-07-01', adults: 1 })` is called for the first time
- **THEN** a `GET /inventory/flights/search?origin=BOS&destination=SFO&departureDate=2026-07-01&adults=1` request SHALL be made AND the 2 offers SHALL be stored in the RTK Query cache

#### Scenario: Retry succeeds after transient inventory API failure
- **GIVEN** an authenticated Employee has submitted a valid search form, the inventory API returns HTTP 503 on the first attempt, and returns HTTP 200 with 2 offers on the second attempt within the 30s retry window
- **WHEN** the retry fires
- **THEN** the 2 offers SHALL be displayed and no error banner SHALL be shown

#### Scenario: Retry exhausted after permanent transient inventory failure
- **GIVEN** an authenticated Employee has submitted a valid search form and the inventory API returns HTTP 503 on every attempt until the 30-second retry deadline elapses
- **WHEN** the deadline elapses
- **THEN** FlightResults SHALL display an error banner and no flight cards SHALL be rendered

#### Scenario: 400 response triggers no retry
- **GIVEN** an authenticated Employee has submitted a valid search form and the inventory API returns HTTP 400
- **WHEN** the 400 response is received
- **THEN** no retry SHALL be attempted AND FlightResults SHALL display an error banner immediately

---

### Requirement: SearchPage orchestrates search flow at /search
`SearchPage` SHALL be rendered at the `/search` route, protected by `PrivateRoute`. It SHALL dispatch `clearSelectedOffer()` on mount, render `SearchForm` and `FlightResults`, and pass `searchId` from the API meta to child components for correlation.

#### Scenario: Unauthenticated user is redirected from /search
- **GIVEN** the Redux store has `auth.accessToken = null` (no authenticated session)
- **WHEN** the browser navigates to `/search`
- **THEN** the browser SHALL be redirected to `/login` AND `SearchPage` SHALL not be rendered

#### Scenario: Authenticated Employee lands on SearchPage
- **GIVEN** the Redux store has a valid `auth.accessToken` and `auth.user` with role "EMPLOYEE"
- **WHEN** the browser navigates to `/search`
- **THEN** `SearchPage` SHALL render with `SearchForm` and an empty results area visible

#### Scenario: Previously selected offer is cleared on SearchPage mount
- **GIVEN** the Redux store has `selectedOffer` set to a FlightOffer with id "offer-1" (from a prior session)
- **WHEN** `SearchPage` mounts
- **THEN** `selectSelectedOffer(store.getState())` SHALL return `null`

---

### Requirement: searchReducer registered in rootReducer
`rootReducer.ts` SHALL include `search: searchReducer` so that `searchSlice` state is accessible via `state.search`.

#### Scenario: search slice initialised at store creation
- **GIVEN** the Redux store is created with the `rootReducer`
- **WHEN** the store is initialised with no preloaded state
- **THEN** `store.getState().search` SHALL equal `{ filters: { sortBy: 'price', maxPrice: null }, selectedOffer: null }`

---

### Requirement: /search route renders SearchPage for authenticated users
`AppRoutes.tsx` SHALL define a `PrivateRoute`-wrapped `/search` route that renders the `SearchPage` component from `src/features/search`.

#### Scenario: /search route renders the real SearchPage component
- **GIVEN** the Redux store has a valid `auth.accessToken` and `auth.user`
- **WHEN** an authenticated user navigates to `/search`
- **THEN** the `SearchPage` component from `src/features/search/pages/SearchPage.tsx` SHALL be rendered (not the placeholder)

---

### Requirement: Search UI meets WCAG 2.1 AA accessibility standards
All interactive form elements in `SearchForm` SHALL have accessible labels (via `aria-label` or an associated `<label>` element), and all non-decorative icon-only buttons SHALL have `aria-label` text. The results list SHALL have an appropriate `aria-live` region so screen readers are notified when results load.

#### Scenario: All form fields have accessible labels
- **GIVEN** `SearchForm` is rendered in a browser environment
- **WHEN** an automated accessibility scan (e.g., axe-core) is run on the rendered form
- **THEN** no "Form elements must have labels" WCAG violation SHALL be reported

#### Scenario: Results region announces updates to screen readers
- **GIVEN** `FlightResults` is rendered with `aria-live="polite"` on its container
- **WHEN** the API response arrives and flight cards are displayed
- **THEN** the results container SHALL have `aria-live="polite"` so assistive technologies announce the result count change

---

### Requirement: Flight search results meet p95 500ms display target
The system SHALL display initial flight search results within a p95 latency of 500ms after form submission under normal load conditions, leveraging the RTK Query cache (TTL: 300s) to serve repeated identical searches without an additional network round-trip.

#### Scenario: Cached search returns results without additional latency
- **GIVEN** a prior search for the same parameters completed successfully within the last 300 seconds
- **WHEN** the user submits the form with identical parameters
- **THEN** the results SHALL be displayed immediately from cache with no observable network latency (0 additional HTTP requests)

## MODIFIED Requirements

### Requirement: rootReducer includes search slice
`rootReducer.ts` SHALL register `search: searchReducer` in addition to the existing `auth`, `api`, and `notifications` slices. The combined state type SHALL expose `state.search` with type `SearchState`.

#### Scenario: search state is initialised at store creation
- **GIVEN** the Redux store is created with the updated `rootReducer`
- **WHEN** `store.getState()` is called with no preloaded state
- **THEN** `store.getState().search` SHALL equal the `searchSlice` initial state: `{ filters: { sortBy: 'price', maxPrice: null }, selectedOffer: null }`
