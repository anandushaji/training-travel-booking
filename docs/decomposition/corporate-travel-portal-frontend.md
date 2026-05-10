# Feature Decomposition: Corporate Travel Portal — Frontend

## Summary

The Corporate Travel Portal frontend is a React 18 + TypeScript SPA (port 3000) built with Material-UI v5, Redux Toolkit, and RTK Query. It communicates exclusively with the NestJS API Gateway (port 4000) over HTTPS/REST + JWT. Six bounded frontend feature areas map directly to the backend microservices: Authentication, Flight Search, Booking, Traveler Profile, Expenses, and a shared foundation layer that wires the app together. This decomposition covers all six implementation units, sequenced to unblock parallel development while respecting hard dependency constraints (auth must land before any protected feature).

## Source Documents

- `docs/ddd/DDD-Architecture.md` — Section 8.2 (Frontend folder structure), Section 6.4 (Frontend technical architecture diagram)
- `PROJECT.md` — Section 3 (repo layout: `frontend/`), Section 2 (tech stack: React 18, Redux Toolkit, MUI v5, Vite)
- `docs/contracts/openapi/` — OpenAPI specs for all six backend services (consumed via API Gateway)

---

## Sub-Modules

### [SM-FE-01] Frontend Foundation & Infrastructure

**OpenSpec Domain**: `frontend-foundation`

**Scope**: Scaffold the Vite + React 18 + TypeScript project under `pgt/frontend/`. Implements the Redux store (`store.ts`, `rootReducer.ts`), RTK Query base API client pointing at `REACT_APP_API_URL` (API Gateway), MUI v5 theme (`theme.ts`, `overrides.ts`), shared common components (Layout: Header/Sidebar/Footer; Button; Input; Card), common hooks (`useDebounce`), shared utilities (`api.utils.ts`, `date.utils.ts`, `currency.utils.ts`), React Router v6 configuration (`AppRoutes.tsx`, `PrivateRoute.tsx`, `routes.config.ts`), global TypeScript types (`global.d.ts`), and Docker build artefacts (Dockerfile, `.dockerignore`, integration with `pgt/docker-compose.yml`).

**Key Requirements Addressed**:
- DDD §8.2: Complete `travel-portal-ui/` folder structure (app/, common/, api/, routes/, theme/)
- DDD §6.4: React 18 + TypeScript + Redux Toolkit + MUI, RTK Query API client with caching & prefetch
- PROJECT.md §3: `frontend/src/features/`, `common/`, `api/`, `routes/`, `theme/`
- PROJECT.md §11: Frontend accessible at `http://localhost:3000`; Docker Compose `frontend` service with `REACT_APP_API_URL=http://api-gateway:4000`

**Contracts / Interfaces**:
- Exports: `store` (Redux), `baseApi` (RTK Query), `theme` (MUI)
- Exports: `PrivateRoute`, `AppRoutes`, `routes.config`
- Exports: `Layout`, `Button`, `Input`, `Card` components
- Exports: `useDebounce`, `api.utils`, `date.utils`, `currency.utils`
- Environment: `REACT_APP_API_URL` (default `http://localhost:4000`)
- No backend API calls in this module

**Prerequisites**: None

**Implementation Notes**: Use Vite (not CRA) — the DDD doc references `vite.config.ts` and `vite-env.d.ts`. TypeScript `strict: true`. MUI v5 `ThemeProvider` wraps the app. Redux `configureStore` with RTK Query `setupListeners`. `PrivateRoute` checks for a valid JWT in Redux store (populated by SM-FE-02); unauthenticated users are redirected to `/login`. Dockerfile uses `node:20-alpine` multi-stage build (build stage + nginx serve stage). Add `frontend` service to `pgt/docker-compose.yml` on the `travel-portal` network.

---

### [SM-FE-02] Authentication Feature

**OpenSpec Domain**: `frontend-auth`

**Scope**: Implements the Auth feature slice: `LoginForm.tsx` (email/password fields, submit handler), `LoginPage.tsx` (full-page layout), `authSlice.ts` (Redux slice: stores `accessToken`, `refreshToken`, `user` payload; actions: `setCredentials`, `logout`), `jwt.utils.ts` (decode JWT, check expiry), and RTK Query mutation endpoints for `POST /auth/login` and `POST /auth/refresh` via `baseApi`. Includes automatic token refresh on 401 responses (RTK Query `baseQuery` wrapper). Logout clears Redux state and redirects to `/login`.

**Key Requirements Addressed**:
- DDD §8.2: `features/auth/` — LoginForm, LoginPage, authSlice, jwt.utils
- AGENTS.md §12: JWT tokens (8-hour expiry), Bearer token on every request
- ADR-005: Zero-trust; tokens stored in Redux (memory), never in `localStorage`
- ADR-006: API Gateway issues tokens at `POST /auth/login`

**Contracts / Interfaces**:
- RTK Query: `POST /auth/login` → `{ accessToken, refreshToken, user: { id, email, role } }`
- RTK Query: `POST /auth/refresh` → `{ accessToken }`
- Redux state shape: `auth.accessToken: string | null`, `auth.user: JwtPayload | null`
- Exports: `useAuth` hook (from `common/hooks/useAuth.ts`) — wraps `authSlice` selectors
- `PrivateRoute` (SM-FE-01) reads `auth.accessToken` from this slice

**Prerequisites**: [SM-FE-01]

**Implementation Notes**: Store tokens in Redux memory only (not `localStorage`) per ADR-005 (XSS mitigation). Use `baseQueryWithReauth` pattern from RTK Query docs: on 401, attempt refresh; on second failure, dispatch `logout`. `useAuth` hook exposes `{ user, isAuthenticated, login, logout }`. Role (`EMPLOYEE` | `MANAGER` | `ADMIN`) stored in `auth.user.role` — used by protected UI elements in later modules.

---

### [SM-FE-03] Flight Search Feature

**OpenSpec Domain**: `frontend-search`

**Scope**: Implements the Search feature slice: `SearchForm.tsx` (origin, destination, departure/return dates, passenger count), `FlightResults.tsx` (list of flight offers), `FlightCard.tsx` (individual offer card with price, duration, stops, "Select" CTA), `SearchPage.tsx` (orchestrates form + results), `searchSlice.ts` (filter/sort state: by price, duration), and `flightApi.ts` (RTK Query lazy query for `GET /inventory/flights/search` with debounced auto-refresh). Displays policy compliance badge on each flight card (fetched from policy endpoint or derived from booking context).

**Key Requirements Addressed**:
- DDD §8.2: `features/search/` — SearchForm, FlightResults, FlightCard, SearchPage, flightApi, searchSlice
- DDD §6.4: Search UI module in Frontend Layer
- PROJECT.md §4: inventory-service at port 3005 via API Gateway (`/inventory`)
- ADR-008: p95 < 500ms — RTK Query caching (5 min TTL, matches inventory-service cache)

**Contracts / Interfaces**:
- RTK Query: `GET /inventory/flights/search?origin=&destination=&departureDate=&returnDate=&passengers=`
- Response: `FlightOffer[]` — `{ id, origin, destination, departureTime, arrivalTime, price: { amount, currency }, airline, stops, duration }`
- `searchSlice` state: `{ filters: { sortBy, maxPrice }, selectedOffer: FlightOffer | null }`
- Exports: `selectedOffer` selector (consumed by SM-FE-04 Booking feature)

**Prerequisites**: [SM-FE-01], [SM-FE-02]

**Implementation Notes**: RTK Query `keepUnusedDataFor: 300` (5 min cache, matches backend TTL). `useDebounce` (SM-FE-01) on form inputs to avoid rapid API calls. `FlightCard` "Select" button dispatches `searchSlice.setSelectedOffer` and navigates to `/bookings/new`. Policy compliance: call `GET /policies/validate` inline or derive from a dedicated policy endpoint — confirm with PM whether policy badge is required at search stage or only at booking confirmation.

---

### [SM-FE-04] Booking Feature

**OpenSpec Domain**: `frontend-booking`

**Scope**: Implements the Booking feature slice: `BookingForm.tsx` (confirms selected flight, shows traveler details, payment method selector), `BookingList.tsx` (paginated list of user bookings with status badges), `BookingDetails.tsx` (full booking view with status timeline, itinerary, receipt link), `BookingPage.tsx` (new booking flow: form → review → submit), `BookingConfirmationPage.tsx` (post-submit success screen with booking reference), `bookingSlice.ts` (active booking state, status polling), `useBooking.ts` hook, and `bookingApi.ts` (RTK Query: `POST /bookings`, `GET /bookings`, `GET /bookings/:id`, `DELETE /bookings/:id`). Polls booking status (saga in progress) via `GET /bookings/:id` with exponential back-off until `CONFIRMED` or `FAILED`.

**Key Requirements Addressed**:
- DDD §8.2: `features/booking/` — full component, page, hook, API, slice, and types structure
- DDD §6.4: Booking UI module; calls booking-service via API Gateway
- PROJECT.md §4: booking-service Saga pattern — UI must handle async confirmation
- ADR-003: Choreography-based saga — booking goes through policy → inventory → payment async; UI polls

**Contracts / Interfaces**:
- RTK Query: `POST /bookings` body: `{ flightOfferId, travelerId, paymentMethodId }`
- RTK Query: `GET /bookings?page=&limit=` → `{ data: Booking[], total, page }`
- RTK Query: `GET /bookings/:id` → `Booking` with `status: PENDING | CONFIRMED | CANCELLED | FAILED`
- RTK Query: `DELETE /bookings/:id` (cancellation)
- Reads `searchSlice.selectedOffer` (SM-FE-03) to pre-fill BookingForm
- Reads `auth.user.id` (SM-FE-02) as `travelerId`

**Prerequisites**: [SM-FE-01], [SM-FE-02], [SM-FE-03]

**Implementation Notes**: Saga polling: `useBooking` hook polls `GET /bookings/:id` every 2s (max 30s) while status is `PENDING`. After 30s without `CONFIRMED`, display a "processing" message and stop polling (user can refresh). `BookingConfirmationPage` shows booking reference number and links to expense receipt (SM-FE-06). Payment method selection in `BookingForm` calls `GET /payments/methods` (SM-FE-05 depends on this endpoint too — consider a shared `paymentApi.ts`).

---

### [SM-FE-05] Traveler Profile Feature

**OpenSpec Domain**: `frontend-profile`

**Scope**: Implements the Profile feature slice: traveler profile view and edit (`ProfilePage.tsx`, profile form component), preferences management (`PreferencesPage.tsx`), and `travelerApi.ts` (RTK Query: `GET /travelers/:id`, `PATCH /travelers/:id`, `GET /travelers/:id/preferences`, `PUT /travelers/:id/preferences`). Includes GDPR data export (`GET /travelers/:id/export`) and account deletion flow (`DELETE /travelers/:id`) with confirmation dialog. Admin view (`GET /admin/travelers`) rendered only for `ADMIN` role.

**Key Requirements Addressed**:
- DDD §8.2: `features/profile/` — components, pages, api
- AGENTS.md §12: GDPR right to access, erasure, portability
- PROJECT.md §4: traveler-service owns employee profiles and preferences
- ADR-005: RBAC — admin-only routes guarded by role check

**Contracts / Interfaces**:
- RTK Query: `GET /travelers/:id` → `TravelerProfile`
- RTK Query: `PATCH /travelers/:id` body: `Partial<TravelerProfile>`
- RTK Query: `GET /travelers/:id/preferences` → `TravelerPreferences`
- RTK Query: `PUT /travelers/:id/preferences` body: `TravelerPreferences`
- RTK Query: `DELETE /travelers/:id` (GDPR erasure)
- Admin only: `GET /admin/travelers?page=&limit=`

**Prerequisites**: [SM-FE-01], [SM-FE-02]

**Implementation Notes**: `ProfilePage` auto-loads `auth.user.id` to fetch own profile. GDPR delete flow: confirmation dialog → `DELETE /travelers/:id` → dispatch `logout` and redirect to `/login`. Admin traveler list visible only when `auth.user.role === 'ADMIN'`; use a role guard HOC or inline conditional. Cache TTL: 1h (matches backend; set `keepUnusedDataFor: 3600` in RTK Query).

---

### [SM-FE-06] Expenses Feature

**OpenSpec Domain**: `frontend-expenses`

**Scope**: Implements the Expenses feature slice: expense/receipt list (`ExpenseListPage.tsx`, `ExpenseList.tsx`), receipt detail view (`ReceiptPage.tsx`, `ReceiptDetails.tsx`) with PDF download link, expense status indicators (PENDING/APPROVED/REJECTED), and `expenseApi.ts` (RTK Query: `GET /expenses`, `GET /expenses/:id`, `GET /expenses/:receiptId/receipt` → PDF download URL). Renders a link to the generated PDF receipt from `BookingConfirmationPage` (SM-FE-04).

**Key Requirements Addressed**:
- DDD §8.2: `features/expenses/` — components, pages, api
- PROJECT.md §4: expense-service owns receipts and expense records; event-driven (receipt generated on `BookingConfirmed`)
- PROJECT.md §12 (`expense-service`): receipts are immutable after generation; cache TTL 24h

**Contracts / Interfaces**:
- RTK Query: `GET /expenses?travelerId=&page=&limit=` → `{ data: Expense[], total, page }`
- RTK Query: `GET /expenses/:id` → `Expense` with `status`, `receipt: { id, pdfUrl }`
- RTK Query: `GET /expenses/receipts/:receiptId` → `Receipt` with `pdfUrl`
- Reads booking reference from `bookingSlice` (SM-FE-04) to link to receipt
- PDF download: anchor tag to `pdfUrl` (served by expense-service or object storage)

**Prerequisites**: [SM-FE-01], [SM-FE-02], [SM-FE-04]

**Implementation Notes**: Receipts are immutable — set `keepUnusedDataFor: 86400` (24h) in RTK Query. PDF download uses a plain `<a href={pdfUrl} download>` tag; no binary streaming in the browser. `ExpenseListPage` filters by `auth.user.id`. Manager/Admin view can see all team expenses — implement role-conditional query params. Status badge colours: PENDING=orange, APPROVED=green, REJECTED=red (MUI Chip).

---

## Dependency Order (Suggested Implementation Sequence)

| Wave | Sub-Modules | Rationale |
|---|---|---|
| Wave 1 | SM-FE-01 (Foundation) | No prerequisites; unblocks everything |
| Wave 2 | SM-FE-02 (Auth) | Requires store + base API from SM-FE-01; unblocks all features |
| Wave 3 | SM-FE-03 (Search), SM-FE-05 (Profile) | Both depend only on SM-FE-01 + SM-FE-02; can be parallelised |
| Wave 4 | SM-FE-04 (Booking) | Requires SM-FE-03 (selected flight) |
| Wave 5 | SM-FE-06 (Expenses) | Requires SM-FE-04 (booking reference → receipt link) |

---

## Cross-Cutting Concerns

### Authentication
Every RTK Query `baseQuery` call must attach `Authorization: Bearer <accessToken>` from Redux state. The `baseQueryWithReauth` wrapper (SM-FE-02) handles 401 retry. All feature pages are wrapped in `PrivateRoute` (SM-FE-01) except `/login`.

### Error Handling
Global error boundary at `App.tsx` level. RTK Query `isError`/`error` states surfaced via MUI `Alert` snackbar (global `notificationSlice` in foundation). API error shape from PROJECT.md §9: `{ error, message, details, correlationId, timestamp }`.

### Correlation ID
API Gateway generates `X-Correlation-ID`; RTK Query `baseQuery` logs it from response headers into Redux `notificationSlice` for display in error messages.

### Accessibility
MUI v5 components are WCAG 2.1 AA compliant by default. Custom components must include ARIA labels. Tab navigation must work throughout.

### Internationalisation
Not in scope for v1 (English only). All strings should use string constants (not inline literals) so i18n can be added later.

### Testing (ADR-010)
- **Unit tests** (70%): React Testing Library for components; test slice reducers and RTK Query hooks with `setupServer` (MSW).
- **Integration tests** (20%): Playwright or Cypress component tests hitting MSW-mocked API.
- **E2E tests** (10%): Playwright full-flow tests covering login → search → book → view receipt.
- **Coverage target**: 80% per ADR-008.

### Build & Docker
- Vite production build (`npm run build` → `dist/`).
- Nginx-based Docker image serving `dist/` on port 80; mapped to host port 3000.
- `REACT_APP_API_URL` injected at build time via Vite `define` or at runtime via `window.__ENV__` (prefer runtime injection for environment portability).

---

## Recommended Next Step

Run the `spec-generator` skill, passing this decomposition and the original requirement documents. Start with **Wave 1 — SM-FE-01 (Frontend Foundation & Infrastructure)** to unblock all downstream feature work.
