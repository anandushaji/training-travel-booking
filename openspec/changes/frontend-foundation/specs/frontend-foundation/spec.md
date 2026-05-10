# Delta for frontend-foundation — Frontend Foundation & Infrastructure (SM-FE-01)

## ADDED Requirements

---

### Requirement: Project Scaffold

The system SHALL provide a Vite 5 + React 18 + TypeScript 5 SPA project under
`pgt/frontend/` with `strict: true` TypeScript configuration, ESLint, and Prettier
configured to match PROJECT.md §9 naming and formatting conventions.

#### Scenario: Successful production build
- GIVEN the `pgt/frontend/` project is checked out with dependencies installed
- WHEN `npm run build` is executed
- THEN the `dist/` directory is produced with no TypeScript errors and no ESLint errors

#### Scenario: Development server starts
- GIVEN `pgt/frontend/` dependencies are installed
- WHEN `npm run dev` is executed
- THEN the Vite dev server starts on port 3000 and serves the app at `http://localhost:3000`

---

### Requirement: Redux Store & RTK Query Base API

The system SHALL provide a Redux Toolkit store with an RTK Query `baseApi` instance
pre-configured with global `keepUnusedDataFor`, the full tag-type registry, and an
empty endpoint set that feature slices extend via `baseApi.injectEndpoints`.

#### Scenario: Store initialises with RTK Query cache reducer
- GIVEN the React app mounts
- WHEN the Redux store is created
- THEN the store contains the `api` slice (RTK Query reducer) and the `notifications` slice
- AND no other slices are present in the foundation store

#### Scenario: Feature slice injects endpoints
- GIVEN `baseApi` is initialised
- WHEN a feature module calls `baseApi.injectEndpoints({ endpoints: (build) => ({ ... }) })`
- THEN the injected query is available and can be invoked via the generated hook

---

### Requirement: Reusable Common Component Library

The system SHALL export all common UI components from `src/common/components/index.ts`
as the single import point for any feature module, ensuring no feature module imports
directly from MUI primitives.

#### Scenario: Component barrel export resolves all components
- GIVEN `src/common/components/index.ts` is imported in a test
- WHEN each named export is destructured
- THEN all 25+ components (`Button`, `LoadingButton`, `IconButton`, `TextInput`,
  `SelectInput`, `DatePickerInput`, `NumberInput`, `FormField`, `Card`, `ClickableCard`,
  `DataTable`, `StatusBadge`, `CurrencyDisplay`, `Alert`, `GlobalSnackbar`, `Modal`,
  `ConfirmDialog`, `Spinner`, `Skeleton`, `LoadingOverlay`, `EmptyState`, `ErrorBoundary`,
  `Header`, `Sidebar`, `Footer`, `PageContainer`) are defined and not `undefined`

#### Scenario: Button renders all variants
- GIVEN the `Button` component is rendered with `variant="primary"`
- WHEN the component mounts
- THEN it renders an MUI `Button` with the primary colour from the corporate theme
- AND it is accessible (role="button", focusable via keyboard)

#### Scenario: Button variant "primary" (default)
- GIVEN `<Button variant="primary">Submit</Button>` is rendered
- WHEN inspected
- THEN the MUI `variant` is `"contained"` and colour is `"primary"`

#### Scenario: Button variant "secondary"
- GIVEN `<Button variant="secondary">Cancel</Button>` is rendered
- WHEN inspected
- THEN the MUI `variant` is `"outlined"` and colour is `"primary"`

#### Scenario: Button variant "danger"
- GIVEN `<Button variant="danger">Delete</Button>` is rendered
- WHEN inspected
- THEN the MUI `variant` is `"contained"` and colour is `"error"`

#### Scenario: Button variant "ghost"
- GIVEN `<Button variant="ghost">More</Button>` is rendered
- WHEN inspected
- THEN the MUI `variant` is `"text"`

#### Scenario: LoadingButton shows spinner during async operation
- GIVEN `<LoadingButton loading={true}>Save</LoadingButton>` is rendered
- WHEN the component mounts
- THEN the button is disabled and a spinner is visible
- AND the button label text is not visible (replaced by spinner)

#### Scenario: FormField displays validation error
- GIVEN `<FormField label="Email" error="Invalid email format">...</FormField>` is rendered
- WHEN the component mounts
- THEN the error message "Invalid email format" is displayed below the field
- AND the field label is styled in error colour

#### Scenario: DataTable renders paginated rows
- GIVEN `<DataTable columns={cols} rows={rows} pagination={{ page: 1, total: 50, limit: 10 }} />` is rendered
- WHEN the component mounts
- THEN 10 rows are displayed
- AND pagination controls show "1–10 of 50"

#### Scenario: DataTable with zero rows renders EmptyState
- GIVEN `<DataTable columns={cols} rows={[]} pagination={{ page: 1, total: 0, limit: 10 }} />` is rendered
- WHEN the component mounts
- THEN no `TableRow` elements are present in the `TableBody`
- AND an `EmptyState` component is rendered in place of the table body

#### Scenario: DataTable triggers sort callback
- GIVEN a `DataTable` with `onSort` prop is rendered
- WHEN a column header is clicked
- THEN `onSort` is called with the column key and new direction (`asc` | `desc`)

#### Scenario: StatusBadge maps status to colour
- GIVEN `<StatusBadge status="CONFIRMED" statusColorMap={{ CONFIRMED: 'success' }} />` is rendered
- WHEN the component mounts
- THEN an MUI Chip with `color="success"` is displayed

#### Scenario: StatusBadge renders unknown status with default colour
- GIVEN `<StatusBadge status="UNKNOWN_STATUS" statusColorMap={{ CONFIRMED: 'success' }} />` is rendered
- WHEN the component mounts
- THEN an MUI Chip is displayed with the `default` MUI colour (no error thrown, no blank render)

#### Scenario: CurrencyDisplay formats amount
- GIVEN `<CurrencyDisplay amount={1234.5} currency="USD" />` is rendered
- WHEN the component mounts
- THEN the displayed text is "USD 1,234.50" (or locale-equivalent)

#### Scenario: DatePickerInput rejects date before minDate
- GIVEN `<DatePickerInput name="departure" label="Departure" minDate="2026-06-01" onChange={fn} />` is rendered
- WHEN the user selects the date 2026-05-15 (before `minDate`)
- THEN `onChange` is NOT called with the selected value
- AND the input displays an error state indicating the date is before the minimum allowed date

#### Scenario: ConfirmDialog blocks action until confirmed
- GIVEN `<ConfirmDialog open={true} onConfirm={fn} title="Delete?" message="Are you sure?" />` is rendered
- WHEN the user clicks "Confirm"
- THEN `onConfirm` is called exactly once

#### Scenario: ConfirmDialog cancels without side effect
- GIVEN the ConfirmDialog is open
- WHEN the user clicks "Cancel" or presses Escape
- THEN `onConfirm` is NOT called
- AND `onClose` is called

#### Scenario: EmptyState renders with action
- GIVEN `<EmptyState title="No bookings" action={<Button>Book now</Button>} />` is rendered
- WHEN the component mounts
- THEN the title and action button are visible

#### Scenario: ErrorBoundary catches render error
- GIVEN an `ErrorBoundary` wraps a component that throws during render
- WHEN the child component throws
- THEN the `ErrorBoundary` catches the error and renders the fallback UI
- AND the rest of the app continues to function

#### Scenario: GlobalSnackbar displays notification from Redux
- GIVEN a notification is dispatched via `notificationSlice.addNotification`
- WHEN the Redux state updates
- THEN the `GlobalSnackbar` displays the message with the correct severity

---

### Requirement: MUI v5 Corporate Theme

The system SHALL apply a single MUI v5 `ThemeProvider` at the app root with a custom
corporate theme, ensuring all MUI primitives (and the common component wrappers) use
consistent colours, typography, and spacing.

#### Scenario: Theme is applied to all components
- GIVEN the app renders under `ThemeProvider` with the corporate theme
- WHEN a `Button` component with `variant="primary"` is rendered
- THEN its background colour matches `theme.palette.primary.main`

#### Scenario: Theme overrides MUI defaults
- GIVEN the corporate theme defines `MuiButton.styleOverrides.root`
- WHEN any `Button` renders
- THEN the override styles are applied (e.g., `borderRadius: 4px`)

---

### Requirement: React Router v6 Configuration

The system SHALL provide a React Router v6 `AppRoutes` component and a `PrivateRoute`
guard that redirects unauthenticated users to `/login`.

#### Scenario: Unauthenticated access to protected route redirects to login
- GIVEN `auth.accessToken` is `null` in the Redux store
- WHEN the user navigates to any protected route (e.g., `/`)
- THEN the router redirects to `/login`
- AND the original URL is preserved in `location.state.from`

#### Scenario: Authenticated access renders protected route
- GIVEN `auth.accessToken` is a non-null string in the Redux store
- WHEN the user navigates to a protected route
- THEN the protected route component is rendered

#### Scenario: Login route is accessible without authentication
- GIVEN `auth.accessToken` is `null`
- WHEN the user navigates to `/login`
- THEN the login route renders (no redirect loop)

---

### Requirement: API Request Timeout   [Timeouts]

The system SHALL abort any outgoing API request that does not complete within 10 seconds
and SHALL return a timeout error to the calling RTK Query hook.

#### Scenario: Request completes within timeout
- GIVEN the API Gateway responds within 10 seconds
- WHEN an RTK Query hook triggers a fetch
- THEN the response data is returned normally

#### Scenario: Request exceeds timeout
- GIVEN the API Gateway does not respond within 10 seconds
- WHEN the `AbortController` fires
- THEN the request is aborted
- AND the RTK Query hook receives `{ error: { status: 'FETCH_ERROR', error: 'AbortError' } }`
- AND `frontend_api_requests_total` is incremented with `status_code=TIMEOUT`

---

### Requirement: Transient Failure Retry   [Retries with Backoff]

The system SHALL retry **GET requests** that fail with retryable HTTP status codes (408, 500,
502, 503, 504) up to 3 times, with exponential back-off (base 200ms, max 5s, ±30% jitter)
before returning the final error. Non-GET requests (POST, PATCH, PUT, DELETE) SHALL NOT be
retried by default; they SHALL be returned immediately on failure to prevent duplicate
side-effects. Mutations MAY opt in to retry via `extraOptions.allowRetry = true` only after
SM-FE-02 establishes Idempotency-Key header infrastructure.

#### Scenario: GET transient failure followed by success
- GIVEN the first two GET attempts return HTTP 503
- AND the third GET attempt returns HTTP 200
- WHEN the RTK Query hook fires a GET request
- THEN the hook receives the successful response data after 2 retries
- AND `frontend_api_retry_total` is incremented twice (attempt=1, attempt=2)

#### Scenario: All GET retries exhausted
- GIVEN all 4 GET attempts (1 initial + 3 retries) return HTTP 503
- WHEN the RTK Query hook fires a GET request
- THEN the hook receives the error after the 4th attempt
- AND `frontend_api_retry_total` is incremented 3 times

#### Scenario: Non-retryable failure — no retry
- GIVEN the API returns HTTP 400
- WHEN the RTK Query hook fires
- THEN the error is returned immediately without retry
- AND `frontend_api_retry_total` is NOT incremented

#### Scenario: POST request is not retried on transient failure
- GIVEN the API returns HTTP 503 for a POST request
- WHEN `baseQueryWithRetry` processes the POST response
- THEN the error is returned immediately without any retry
- AND `frontend_api_retry_total` is NOT incremented

#### Scenario: Timeout is not retried
- GIVEN the request is aborted due to the 10s timeout
- WHEN `baseQueryWithRetry` receives `AbortError`
- THEN no retry is attempted
- AND the timeout error is returned immediately

---

### Requirement: API Response Cache   [Cache-aside]

The system SHALL cache API responses in the RTK Query in-memory normalised store with a
global default TTL of 60 seconds, evicting unused cache entries after the TTL expires.

#### Scenario: Cache hit avoids network request
- GIVEN a query was fetched successfully and the data is within TTL
- WHEN the same query hook is mounted in a second component
- THEN no new network request is made
- AND `frontend_cache_hit_total` is incremented

#### Scenario: Cache miss triggers fetch
- GIVEN no cached entry exists for a query (first mount or TTL expired)
- WHEN the query hook is mounted
- THEN a network request is made
- AND `frontend_cache_miss_total` is incremented

#### Scenario: Cache entry expires after TTL
- GIVEN a query was fetched and the global 60s TTL has elapsed with no subscribers
- WHEN the query hook is mounted again
- THEN RTK Query triggers a new network request

---

### Requirement: Tag-Based Cache Invalidation   [Cache Invalidation]

The system SHALL provide a pre-registered tag-type registry (`TAG_TYPES`) in `baseApi`
so that all feature slices use consistent, collision-free tag names when declaring
`providesTags` and `invalidatesTags`.

#### Scenario: Tag types are pre-registered in baseApi
- GIVEN `baseApi` is initialised
- WHEN the `tagTypes` array is inspected
- THEN it contains: `['BOOKING', 'TRAVELER', 'EXPENSE', 'FLIGHT', 'POLICY', 'PAYMENT_METHOD']`

#### Scenario: Mutation with invalidatesTags evicts cached query
- GIVEN a query provides `[{ type: 'BOOKING', id: '123' }]`
- AND the query result is in cache
- WHEN a mutation invalidates `[{ type: 'BOOKING', id: '123' }]`
- THEN RTK Query evicts the cached query entry
- AND the next mount of the query hook triggers a fresh network fetch

---

### Requirement: Docker Integration

The system SHALL provide a multi-stage Dockerfile (Vite build → Nginx Alpine serve) and
integrate the `frontend` service into `pgt/docker-compose.yml` on the `travel-portal`
network, accessible at host port 3000.

#### Scenario: Docker image builds successfully
- GIVEN the `pgt/frontend/Dockerfile` exists
- WHEN `docker build -t frontend .` is run from `pgt/` context
- THEN the image builds with no errors

#### Scenario: Container serves app on port 3000
- GIVEN the `frontend` container is running
- WHEN `curl http://localhost:3000` is executed from the host
- THEN HTTP 200 is returned with an HTML document containing `<div id="root">`

#### Scenario: Runtime env injection resolves API URL
- GIVEN the container is started with `REACT_APP_API_URL=http://api-gateway:4000`
- WHEN `http://localhost:3000/env-config.js` is fetched
- THEN `window.__ENV__.API_URL` equals `"http://api-gateway:4000"`

---

## MODIFIED Requirements

None — this is a greenfield module with no existing source-of-truth spec.

## REMOVED Requirements

None.
