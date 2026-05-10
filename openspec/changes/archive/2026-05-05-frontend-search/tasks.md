## 1. Types and API layer

- [ ] 1.1 Create `src/features/search/search.types.ts` — define `FlightOffer`, `SearchParams`, `AirportOption`, `SearchState`, `PolicyValidationResult` TypeScript interfaces
  - **AC**: GIVEN the file is imported in another module, WHEN TypeScript compiles, THEN zero type errors SHALL be reported for any code importing these interfaces
  - **Artifact**: `src/features/search/search.types.spec.ts`: "search.types — all exported interfaces satisfy expected shape"
  - **Must fail if**: Any required field (e.g. `FlightOffer.id`) is removed or typed incorrectly

- [ ] 1.2 Create `src/features/search/flightApi.ts` — inject `searchFlights` lazy query (`GET /inventory/flights/search`, `keepUnusedDataFor: 300`) and `searchAirports` query (`GET /inventory/airports/search`, `keepUnusedDataFor: 600`) into `baseApi` using `baseApi.injectEndpoints({ endpoints: (build) => ({ ... }), overrideExisting: false })`
  - **AC** (Scenario: searchFlights lazy query sends correct URL and parameters): GIVEN `REACT_APP_API_URL = 'http://localhost/api'` and MSW returns 200, WHEN `triggerSearchFlights({ origin: 'JFK', destination: 'LAX', departureDate: '2026-06-01', adults: 1 })` is called, THEN a `GET http://localhost/api/inventory/flights/search?origin=JFK&destination=LAX&departureDate=2026-06-01&adults=1` request SHALL have been made
  - **AC** (Scenario: searchAirports skips request for input shorter than 2 characters): GIVEN the airport API is available, WHEN `searchAirports` is called with `q = "J"`, THEN no `GET /inventory/airports/search` request SHALL be made
  - **AC** (Scenario: Cached search result returned without API call within TTL): GIVEN a prior call with identical params completed within 300s, WHEN `triggerSearchFlights` is called with the same params, THEN no new HTTP request SHALL be made
  - **Artifact**: `src/features/search/flightApi.spec.ts`: "searchFlights — sends correct URL params" | "searchAirports — skips for q.length < 2" | "searchFlights — returns cached result within TTL"
  - **Must fail if**: URL params are mis-serialised, `keepUnusedDataFor` is removed, or `skip` condition on searchAirports is inverted

- [ ] 1.3 Create `src/features/search/policyApi.ts` — inject `validatePolicy` query (`GET /policies/validate?offerId=&amount=&currency=`, `keepUnusedDataFor: 60`) into `baseApi`
  - **AC**: GIVEN MSW returns `{ compliant: true }` for `GET /policies/validate?offerId=offer-1&amount=450&currency=USD`, WHEN `useValidatePolicyQuery({ offerId: 'offer-1', amount: 450, currency: 'USD' })` is called, THEN the result SHALL contain `{ compliant: true }`
  - **Artifact**: `src/features/search/policyApi.spec.ts`: "validatePolicy — sends correct URL params and returns compliant flag"
  - **Must fail if**: Query params are mis-ordered or `compliant` field is not returned from the hook

## 2. Observability

- [ ] 2.0 In `src/api/baseQueryWithReauth.ts`, add structured `console.error` logging for non-2xx responses from the three search-feature endpoints (`/inventory/flights/search`, `/inventory/airports/search`, `/policies/validate`). After receiving a non-2xx result from `rawBaseQuery`, check if `args.url` (or the resolved URL string) includes one of these three paths; if so, call `console.error({ level: 'error', service: 'frontend', endpoint: String(args.url), status: result.error?.status, correlationId: result.meta?.response?.headers?.get('x-correlation-id') ?? 'unknown', timestamp: new Date().toISOString() })`. Do not modify any other retry, refresh, or mutex logic.
  - **AC** (Scenario: Structured error logged on non-2xx from search endpoint): GIVEN the inventory API returns HTTP 503, WHEN `triggerSearchFlights` is called and the error response is received, THEN `console.error` SHALL have been called with an object containing `{ level: 'error', service: 'frontend', endpoint: <url containing '/inventory/flights/search'>, status: 503 }`
  - **Artifact**: `src/api/baseQueryWithReauth.spec.ts`: "baseQueryWithReauth — logs structured error on non-2xx from search endpoints"
  - **Must fail if**: The `console.error` call is removed or the `status` field is absent from the logged object

## 3. Redux slice

- [ ] 2.1 Create `src/features/search/searchSlice.ts` — define `SearchState` with `filters: { sortBy: 'price' | 'duration', maxPrice: number | null }` and `selectedOffer: FlightOffer | null`; initial state `{ filters: { sortBy: 'price', maxPrice: null }, selectedOffer: null }`; expose actions `setFilters`, `setSelectedOffer`, `clearSelectedOffer`; expose selectors `selectFilters`, `selectSelectedOffer`
  - **AC** (Scenario: setSelectedOffer updates state): GIVEN the slice is at initial state, WHEN `setSelectedOffer({ id: 'offer-1', ... })` is dispatched, THEN `selectSelectedOffer(store.getState())` SHALL return the offer with id "offer-1"
  - **AC** (Scenario: clearSelectedOffer resets to null): GIVEN `selectedOffer` is set, WHEN `clearSelectedOffer()` is dispatched, THEN `selectSelectedOffer(store.getState())` SHALL return `null`
  - **AC** (Scenario: setFilters updates sortBy and maxPrice): GIVEN initial state, WHEN `setFilters({ sortBy: 'duration', maxPrice: 500 })` is dispatched, THEN `selectFilters(store.getState())` SHALL return `{ sortBy: 'duration', maxPrice: 500 }`
  - **Artifact**: `src/features/search/searchSlice.spec.ts`: "setSelectedOffer — updates selectedOffer in state" | "clearSelectedOffer — resets selectedOffer to null" | "setFilters — updates filters"
  - **Must fail if**: Reducer returns unchanged state on dispatch, or selectors read wrong slice key

- [ ] 2.2 Register `search: searchReducer` in `src/app/rootReducer.ts`: add `import { searchReducer } from '../features/search'` at the top, then add `search: searchReducer` to `combineReducers`
  - **AC** (Scenario: search slice initialised at store creation): GIVEN the Redux store is created with the updated rootReducer, WHEN `store.getState()` is called, THEN `store.getState().search` SHALL equal `{ filters: { sortBy: 'price', maxPrice: null }, selectedOffer: null }`
  - **Artifact**: `src/app/rootReducer.spec.ts`: "rootReducer — includes search slice with correct initial state"
  - **Must fail if**: `search` key is missing from state or initial value differs

## 4. Custom hook

- [ ] 3.1 Create `src/features/search/hooks/useFlightSearch.ts` — wraps `useLazySearchFlightsQuery`; accepts `SearchParams`; applies 400 ms debounce using `import { useDebounce } from '../../../common/hooks/useDebounce'`; returns `{ trigger, results, isLoading, isError, searchId }`
  - **AC**: GIVEN `useFlightSearch` is rendered with params `{ origin: 'JFK', ... }` and Vitest fake timers are active, WHEN 399ms elapses, THEN no API call SHALL be made; WHEN 400ms elapses, THEN the API call SHALL be made
  - **Artifact**: `src/features/search/hooks/useFlightSearch.spec.ts`: "useFlightSearch — debounces trigger by 400ms" | "useFlightSearch — does not fire before 400ms"
  - **Must fail if**: Debounce delay is changed or removed, causing the call to fire immediately

## 5. Components

- [ ] 4.1 Create `src/features/search/components/AirportInput.tsx` — MUI `Autocomplete` wrapping `TextInput` from `src/common/components`; calls `useSearchAirportsQuery` with `skip: query.length < 2`; renders `<IATA> — <city>, <name>` options; fires `onChange` with selected IATA code; has `aria-label` for accessibility
  - **AC** (Scenario: Typeahead skipped for 1-character input): GIVEN AirportInput is rendered, WHEN user types 1 character, THEN no airport API request SHALL be made
  - **AC** (Scenario: Typeahead fires after exactly 2 characters): GIVEN MSW returns 1 airport for "JF", WHEN user types "JF", THEN the option "JFK — New York, John F. Kennedy International" SHALL appear in the dropdown
  - **AC** (Scenario: Selecting an airport populates the IATA field): GIVEN dropdown shows the JFK option, WHEN user clicks it, THEN `onChange` SHALL be called with value "JFK"
  - **Artifact**: `src/features/search/components/AirportInput.spec.tsx`: "AirportInput — no request for 1-char input" | "AirportInput — shows options for 2-char input" | "AirportInput — calls onChange with IATA on selection"
  - **Must fail if**: `skip` condition is removed, option label format changes, or `onChange` fires with wrong value

- [ ] 4.2 Create `src/features/search/components/SearchForm.tsx` — react-hook-form + Zod schema; fields: origin (`AirportInput`), destination (`AirportInput`), departureDate (`DatePickerInput`), returnDate (`DatePickerInput`, optional), adults (`SelectInput`, min 1 max 9), cabinClass (`SelectInput`), nonStop (`Switch`); on submit calls `useFlightSearch` trigger; all required fields validated before submit; Zod rules: adults min=1 max=9, departureDate not in past, returnDate (if set) after departureDate; all form fields have associated `<label>` or `aria-label`
  - **AC** (Scenario: Required-field validation on empty submit): GIVEN empty form, WHEN user clicks Submit, THEN inline error messages SHALL appear for origin, destination, and departureDate AND no API call SHALL be made
  - **AC** (Scenario: Adults count below minimum rejected): GIVEN adults=0, WHEN user clicks Submit, THEN an error SHALL appear on the adults field AND no API call SHALL be made
  - **AC** (Scenario: Adults count above maximum rejected): GIVEN adults=10, WHEN user clicks Submit, THEN an error SHALL appear on the adults field AND no API call SHALL be made
  - **AC** (Scenario: Return date before departure date rejected): GIVEN departureDate="2026-06-10" and returnDate="2026-06-05", WHEN user clicks Submit, THEN an error SHALL appear on returnDate AND no API call SHALL be made
  - **AC** (Scenario: Departure date in the past rejected): GIVEN departureDate = yesterday, WHEN user clicks Submit, THEN an error SHALL appear on departureDate AND no API call SHALL be made
  - **AC** (Scenario: Successful form submission triggers flight search): GIVEN all required fields filled, MSW returns 200 with 3 offers, WHEN user clicks Submit, THEN a `GET /inventory/flights/search` request SHALL be made with the correct params
  - **Artifact**: `src/features/search/components/SearchForm.spec.tsx`: "SearchForm — shows errors on empty submit" | "SearchForm — rejects adults=0" | "SearchForm — rejects adults=10" | "SearchForm — rejects return date before departure" | "SearchForm — rejects past departure date" | "SearchForm — submits with correct params on valid input"
  - **Must fail if**: Zod schema constraints are removed, or the API call fires on invalid input

- [ ] 4.3 Create `src/features/search/components/PolicyBadge.tsx` — calls `useValidatePolicyQuery({ offerId, amount, currency })`; enforces ≤10 concurrent in-flight policy calls via a module-level counter (`inFlightPolicyRequests`; increment on mount when slot available, decrement on completion/error); gate mechanism: when `inFlightPolicyRequests >= 10`, pass `skip: true` to `useValidatePolicyQuery` and render the loading spinner until a slot opens (i.e., a previous call completes or errors, decrementing the counter below 10); renders: spinner while loading or gated, green "COMPLIANT" MUI Chip when `{ compliant: true }`, amber "EXCEEDS POLICY" Chip when `{ compliant: false }`, grey "POLICY UNKNOWN" Chip on API error
  - **AC** (Scenario: Policy badge shows loading while validating): GIVEN MSW policy call is delayed, WHEN PolicyBadge mounts, THEN a loading spinner SHALL be visible
  - **AC** (Scenario: COMPLIANT badge for within-policy offer): GIVEN MSW returns `{ compliant: true }`, WHEN response arrives, THEN a chip with text "COMPLIANT" SHALL be visible
  - **AC** (Scenario: EXCEEDS-POLICY badge for out-of-policy offer): GIVEN MSW returns `{ compliant: false }`, WHEN response arrives, THEN a chip with text "EXCEEDS POLICY" SHALL be visible
  - **AC** (Scenario: UNKNOWN badge on policy API failure): GIVEN MSW returns 503, WHEN response arrives, THEN a chip with text "POLICY UNKNOWN" SHALL be visible
  - **Artifact**: `src/features/search/components/PolicyBadge.spec.tsx`: "PolicyBadge — shows spinner while loading" | "PolicyBadge — shows COMPLIANT chip" | "PolicyBadge — shows EXCEEDS POLICY chip" | "PolicyBadge — shows POLICY UNKNOWN on error"
  - **Must fail if**: Badge text is changed or error state shows blank instead of POLICY UNKNOWN chip

- [ ] 4.4 Create `src/features/search/components/FlightCard.tsx` — displays airline, origin → destination route, departure time, arrival time, stops count, total duration, `price.amount` with `price.currency`; embeds `PolicyBadge` passing `offerId`, `amount`, `currency`; "Select" button; on Select click: dispatches `setSelectedOffer(offer)` to Redux store AND calls `navigate('/bookings/new')`
  - **AC** (Scenario: Select button stores offer and navigates to booking): GIVEN FlightResults shows offer with id "offer-1" and `selectSelectedOffer` returns null, WHEN user clicks "Select" on that card, THEN `selectSelectedOffer(store.getState())` SHALL return the offer with id "offer-1" AND the browser SHALL be at `/bookings/new`
  - **AC**: GIVEN a FlightOffer with airline "American Airlines", origin "JFK", destination "LAX", WHEN FlightCard is rendered, THEN the text "American Airlines", "JFK", and "LAX" SHALL be visible in the DOM
  - **Artifact**: `src/features/search/components/FlightCard.spec.tsx`: "FlightCard — renders offer fields" | "FlightCard — Select dispatches setSelectedOffer and navigates"
  - **Must fail if**: `setSelectedOffer` is not dispatched, navigate is not called, or offer fields are not rendered

- [ ] 4.5 Create `src/features/search/components/FlightCardSkeleton.tsx` — MUI `Skeleton` placeholder matching `FlightCard` layout; add `data-testid="flight-card-skeleton"` to the root element; used during loading state
  - **AC**: GIVEN `isLoading=true`, WHEN `FlightResults` renders, THEN `data-testid="flight-card-skeleton"` elements SHALL be present and no `FlightCard` components SHALL be rendered
  - **Artifact**: `src/features/search/components/FlightResults.spec.tsx`: "FlightResults — shows skeletons while loading" (covered in task 4.6 test)
  - **Must fail if**: Skeleton is replaced with real card or hidden while `isLoading` is true

- [ ] 4.6 Create `src/features/search/components/FlightResults.tsx` — reads `selectFilters` from Redux; applies `sortBy` sort (price ascending or duration ascending) and `maxPrice` filter to RTK Query results before rendering; renders `FlightCardSkeleton` when `isLoading`; renders empty-state message containing "No flights found" when `offers.length === 0` and not loading/error; renders error banner with retry button when `isError`; renders N `FlightCard` components for N offers; container SHALL have `aria-live="polite"`
  - **AC** (Scenario: Loading skeleton during API call): GIVEN MSW is delayed, WHEN results are pending, THEN skeleton placeholders SHALL be shown
  - **AC** (Scenario: Empty-state message for zero results): GIVEN MSW returns `{ offers: [] }`, WHEN response arrives, THEN text containing "No flights found" SHALL be visible
  - **AC** (Scenario: Error banner on API permanent failure): GIVEN MSW returns 400, WHEN response arrives, THEN an error banner with retry option SHALL be shown
  - **AC** (Scenario: Correct number of cards rendered for N offers): GIVEN MSW returns 5 offers, WHEN response arrives, THEN exactly 5 FlightCard components SHALL be rendered
  - **AC** (Scenario: Results sorted by price ascending when sortBy is 'price'): GIVEN 3 offers priced $600/$300/$450 and `sortBy='price'`, WHEN rendered, THEN cards SHALL appear in order $300/$450/$600
  - **AC** (Scenario: Results filtered by maxPrice): GIVEN 3 offers $300/$600/$800 and `maxPrice=500`, WHEN rendered, THEN only the $300 offer SHALL be visible
  - **Artifact**: `src/features/search/components/FlightResults.spec.tsx`: "FlightResults — shows skeletons while loading" | "FlightResults — shows empty state for zero results" | "FlightResults — shows error banner on 400" | "FlightResults — renders N cards for N offers" | "FlightResults — sorts by price ascending" | "FlightResults — filters by maxPrice"
  - **Must fail if**: Sort order is reversed, filter allows prices above maxPrice, or error banner is suppressed

## 6. Page and routing

- [ ] 5.1 Create `src/features/search/pages/SearchPage.tsx` — dispatches `clearSelectedOffer()` on mount (useEffect with empty deps); renders `SearchForm` and `FlightResults`; wraps `FlightResults` in `ErrorBoundary` imported from `src/common/components/ErrorBoundary/ErrorBoundary` (this component already exists — import it directly); passes `searchId` from RTK Query API meta to `FlightResults`
  - **AC** (Scenario: Previously selected offer is cleared on SearchPage mount): GIVEN Redux store has `selectedOffer` set to an offer with id "offer-1", WHEN `SearchPage` mounts, THEN `selectSelectedOffer(store.getState())` SHALL return `null`
  - **AC** (Scenario: Authenticated Employee lands on SearchPage): GIVEN a valid `auth.accessToken` in the store, WHEN browser navigates to `/search`, THEN `data-testid="search-page"` SHALL be visible
  - **Artifact**: `src/features/search/pages/SearchPage.spec.tsx`: "SearchPage — dispatches clearSelectedOffer on mount" | "SearchPage — renders SearchForm and FlightResults"
  - **Must fail if**: `clearSelectedOffer` is not dispatched on mount, or SearchForm/FlightResults are not rendered

- [ ] 5.2 In `src/routes/AppRoutes.tsx`, remove the inline placeholder `function SearchPage(): React.ReactElement { return <div data-testid="search-page">Search</div> }` and add `import { SearchPage } from '../features/search'` at the top of the file. The `/search` route definition at `<Route path={ROUTES.SEARCH} element={<SearchPage />} />` already exists and SHALL NOT be modified.
  - **AC** (Scenario: /search route renders the real SearchPage component): GIVEN a valid auth token in the store, WHEN browser navigates to `/search`, THEN the `SearchPage` from `src/features/search/pages/SearchPage.tsx` SHALL render (containing both `SearchForm` and `FlightResults`)
  - **AC** (Scenario: Unauthenticated user is redirected from /search): GIVEN `auth.accessToken = null`, WHEN browser navigates to `/search`, THEN the browser SHALL be redirected to `/login`
  - **Artifact**: `src/features/search/pages/SearchPage.spec.tsx`: "SearchPage — redirects unauthenticated user to /login" (also covers route wiring)
  - **Must fail if**: The placeholder remains and `SearchPage` from features/search is not mounted, or PrivateRoute guard is removed

## 7. Barrel exports

- [ ] 6.1 Create `src/features/search/index.ts` — re-export: `SearchPage` from `./pages/SearchPage`; `searchReducer`, `setFilters`, `setSelectedOffer`, `clearSelectedOffer`, `selectFilters`, `selectSelectedOffer` from `./searchSlice`; `flightApi` from `./flightApi`; `useFlightSearch` from `./hooks/useFlightSearch`
  - **AC**: GIVEN `src/features/search/index.ts` is imported, WHEN TypeScript compiles, THEN all named exports SHALL resolve without errors AND importing `SearchPage`, `searchReducer`, `selectSelectedOffer` from `'../features/search'` in `rootReducer.ts` and `AppRoutes.tsx` SHALL succeed
  - **Artifact**: `src/features/search/index.spec.ts`: "search barrel — exports SearchPage, searchReducer, selectSelectedOffer, and useFlightSearch"
  - **Must fail if**: Any listed export is missing from the barrel

## 8. MSW mock handlers

- [ ] 7.1 Create `src/mocks/handlers/inventory.handlers.ts` — MSW v2 handlers using `http` and `HttpResponse` from `msw`; `http.get('http://localhost/api/inventory/flights/search', ...)` returns 200 with `{ offers: [mockFlightOffer], meta: { count: 1, cached: false, searchId: 'test-search-id' } }`; `http.get('http://localhost/api/inventory/airports/search', ...)` returns 200 with `[{ iata: 'JFK', name: 'John F. Kennedy International', city: 'New York' }]`; export as `inventoryHandlers`
  - **AC**: GIVEN `inventoryHandlers` are registered in the MSW server, WHEN a test fires `GET /inventory/flights/search`, THEN the handler SHALL respond with HTTP 200 and the mock offer array
  - **Artifact**: `src/features/search/flightApi.spec.ts`: "searchFlights — sends correct URL params"
  - **Must fail if**: Handler URL does not match the actual request URL (absolute http://localhost/api/... required)

- [ ] 7.2 Create `src/mocks/handlers/policy.handlers.ts` — MSW v2 `http.get('http://localhost/api/policies/validate', ...)` returns 200 with `{ compliant: true }` by default; export as `policyHandlers`; individual tests override with `server.use(http.get(...))` for 503 or `{ compliant: false }` cases
  - **AC**: GIVEN `policyHandlers` are registered, WHEN a test fires `GET /policies/validate`, THEN the handler SHALL respond with `{ compliant: true }` by default
  - **Artifact**: `src/features/search/components/PolicyBadge.spec.tsx`: "PolicyBadge — shows COMPLIANT chip"
  - **Must fail if**: Default response does not include `compliant` field or URL does not match

- [ ] 7.3 In `src/mocks/handlers/index.ts`, add `import { inventoryHandlers } from './inventory.handlers'` and `import { policyHandlers } from './policy.handlers'`, then spread both into the `handlers` array: `export const handlers = [...authHandlers, ...inventoryHandlers, ...policyHandlers]`
  - **AC**: GIVEN the updated `handlers/index.ts`, WHEN `server.listen()` is called in `setupTests.ts`, THEN MSW SHALL intercept requests to `/inventory/flights/search` and `/policies/validate`
  - **Artifact**: `src/features/search/flightApi.spec.ts`: "searchFlights — sends correct URL params" | `src/features/search/components/PolicyBadge.spec.tsx`: "PolicyBadge — shows COMPLIANT chip"
  - **Must fail if**: Handlers are not spread into the array (unhandled request causes `onUnhandledRequest: 'error'` to throw)

## 9. Unit tests

- [ ] 9.1 Write `src/features/search/searchSlice.spec.ts` — tests: initial state shape; `setSelectedOffer` updates `selectedOffer`; `clearSelectedOffer` resets to null; `setFilters` updates `sortBy` and `maxPrice`; all selectors return correct values
- [ ] 9.2 Write `src/features/search/flightApi.spec.ts` — tests: `searchFlights` builds correct URL params; `searchAirports` skips for `q.length < 2`; cache hit returns without new HTTP call (advance fake timers to 299s)
- [ ] 9.3 Write `src/features/search/hooks/useFlightSearch.spec.ts` — tests: debounce: advance 399ms → no call; advance 400ms → call made (use `vi.useFakeTimers()` + `vi.advanceTimersByTime()`)
- [ ] 9.4 Write `src/features/search/components/AirportInput.spec.tsx` — tests: no request for 1-char; dropdown shown for 2-char; `onChange` fires with IATA on selection; silent failure for 503 (no crash, no dropdown)
- [ ] 9.5 Write `src/features/search/components/SearchForm.spec.tsx` — tests: errors on empty submit; adults=0 error; adults=10 error; returnDate before departureDate error; past departureDate error; valid submit fires API call; returnDate omitted for one-way trips
- [ ] 9.6 Write `src/features/search/components/PolicyBadge.spec.tsx` — tests: spinner while loading; COMPLIANT chip; EXCEEDS POLICY chip; POLICY UNKNOWN chip on 503
- [ ] 9.7 Write `src/features/search/components/FlightCard.spec.tsx` — tests: renders airline/route/times/stops/duration/price; Select dispatches `setSelectedOffer` with correct offer; Select navigates to `/bookings/new`
- [ ] 9.8 Write `src/features/search/components/FlightResults.spec.tsx` — tests: skeletons while loading; empty state for 0 offers; error banner for 400; N cards for N offers; sorted by price; filtered by maxPrice; `aria-live="polite"` present
- [ ] 9.9 Write `src/features/search/pages/SearchPage.spec.tsx` — tests: `clearSelectedOffer` dispatched on mount; SearchForm and FlightResults rendered; unauthenticated user redirected to `/login`
- [ ] 9.10 Write `src/app/rootReducer.spec.ts` (or add to existing) — test: `store.getState().search` equals initial state after store creation
- [ ] 9.11 Write `src/features/search/index.spec.ts` — test: all required exports are present and defined
- [ ] 9.12 Write `src/api/baseQueryWithReauth.spec.ts` (or add to existing) — test: structured `console.error` called with `{ level: 'error', service: 'frontend', endpoint, status }` on non-2xx from `/inventory/flights/search`

## 10. Contract tests (Pact)

- [ ] 10.1 Install Pact as a dev dependency: `npm install --save-dev @pact-foundation/pact@12 --no-package-lock --legacy-peer-deps`
  - **AC**: GIVEN the package is installed, WHEN `@pact-foundation/pact` is imported in a test file, THEN the import SHALL succeed (no `Cannot find module` error)
  - **Artifact**: `src/features/search/__tests__/contracts/flightApi.contract.spec.ts`: "flightApi consumer — GET /inventory/flights/search matches expected schema" (fails with `Cannot find module '@pact-foundation/pact'` ImportError if the package is absent)
  - **Must fail if**: Package is absent and contract test files fail to import

- [ ] 10.2 Write `src/features/search/__tests__/contracts/flightApi.contract.spec.ts` — Pact consumer test verifying the response schema of `GET /inventory/flights/search`: `offers` is an array; each offer has `id` (string), `airline` (string), `origin` (string), `destination` (string), `departureTime` (string), `arrivalTime` (string), `price.amount` (number), `price.currency` (string), `stops` (number), `duration` (string)
  - **AC**: GIVEN the Pact mock provider returns a conformant response, WHEN the test runs, THEN the consumer contract SHALL pass AND a pact file SHALL be written to `./pacts/`
  - **Artifact**: `src/features/search/__tests__/contracts/flightApi.contract.spec.ts`: "flightApi consumer — GET /inventory/flights/search matches expected schema"
  - **Must fail if**: Any required field is removed from the FlightOffer schema in the contract

- [ ] 10.3 Write `src/features/search/__tests__/contracts/policyApi.contract.spec.ts` — Pact consumer test verifying `GET /policies/validate` response has `compliant` (boolean)
  - **AC**: GIVEN the Pact mock provider returns `{ compliant: true }`, WHEN the test runs, THEN the consumer contract SHALL pass AND a pact file SHALL be written to `./pacts/`
  - **Artifact**: `src/features/search/__tests__/contracts/policyApi.contract.spec.ts`: "policyApi consumer — GET /policies/validate returns compliant boolean"
  - **Must fail if**: `compliant` field is removed or typed as non-boolean in the contract

## 11. Verification

- [ ] 11.1 Run `npm test -- --run` in `pgt/frontend` — all tests pass with ≥80% coverage (enforced by `coverage.thresholds` in `vitest.config.ts`)
  - **AC**: WHEN `npm test -- --run` completes, THEN exit code SHALL be 0 AND coverage report SHALL show lines ≥80% for `src/features/search/**`
  - **Artifact**: CI test run output
  - **Must fail if**: Any test fails or coverage drops below 80%

- [ ] 11.2 Run `npm run build` (`tsc && vite build`) in `pgt/frontend` — zero TypeScript errors, build output in `dist/`
  - **AC**: WHEN `npm run build` completes, THEN exit code SHALL be 0 AND `dist/index.html` SHALL exist
  - **Artifact**: Build output
  - **Must fail if**: Any TypeScript error is introduced by the new files
