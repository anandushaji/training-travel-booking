## ADDED Requirements

### Requirement: Traveler profile types
The frontend SHALL define `TravelerProfile`, `TravelerPreferences`, `UpdateTravelerRequest`, and `TravelerListResponse` TypeScript interfaces matching the `traveler-service` OpenAPI schema.

#### Scenario: All interfaces compile with strict TypeScript
- **GIVEN** `booking.types.ts` pattern is followed
- **WHEN** any file imports from `profile.types.ts`
- **THEN** TypeScript SHALL compile with zero errors under `exactOptionalPropertyTypes: true`

---

### Requirement: Traveler API — profile CRUD
The frontend SHALL expose RTK Query endpoints: `getTravelerById` (`GET /travelers/:id`, `keepUnusedDataFor: 3600`, provides `TRAVELER` tag), `updateTraveler` (`PATCH /travelers/:id`, invalidates `TRAVELER` tag), `deleteTraveler` (`DELETE /travelers/:id`, invalidates `TRAVELER` tag), and `listTravelers` (`GET /travelers`, admin, `keepUnusedDataFor: 60`).

#### Scenario: getTravelerById fetches own profile
- **GIVEN** MSW returns a `Traveler` object for `GET /api/travelers/:id`
- **WHEN** `getTravelerById(auth.user.id)` is dispatched
- **THEN** the returned data SHALL match the Traveler schema

#### Scenario: updateTraveler sends PATCH body
- **GIVEN** MSW accepts `PATCH /api/travelers/:id`
- **WHEN** `updateTraveler({ id, department: 'Finance' })` is dispatched
- **THEN** `PATCH http://localhost/api/travelers/:id` SHALL have been called with `{ department: 'Finance' }`

#### Scenario: deleteTraveler hits correct endpoint
- **GIVEN** MSW accepts `DELETE /api/travelers/:id`
- **WHEN** `deleteTraveler(id)` is dispatched
- **THEN** `DELETE http://localhost/api/travelers/:id` SHALL have been called

---

### Requirement: Traveler API — preferences CRUD
The frontend SHALL expose RTK Query endpoints: `getTravelerPreferences` (`GET /travelers/:id/preferences`, `keepUnusedDataFor: 3600`) and `updateTravelerPreferences` (`PUT /travelers/:id/preferences`, invalidates `TRAVELER` tag).

#### Scenario: getTravelerPreferences fetches preferences
- **GIVEN** MSW returns `TravelerPreferences` for `GET /api/travelers/:id/preferences`
- **WHEN** `getTravelerPreferences(auth.user.id)` is dispatched
- **THEN** returned data SHALL include `seatPreference` and `mealPreference`

#### Scenario: updateTravelerPreferences sends PUT body
- **GIVEN** MSW accepts `PUT /api/travelers/:id/preferences`
- **WHEN** `updateTravelerPreferences({ id, seatPreference: 'WINDOW' })` is dispatched
- **THEN** `PUT http://localhost/api/travelers/:id/preferences` SHALL have been called

---

### Requirement: Profile Redux slice
The frontend SHALL maintain a `profileSlice` with initial state `{ viewingTravelerId: null }` and action `setViewingTravelerId`, with selector `selectViewingTravelerId`.

#### Scenario: setViewingTravelerId updates state
- **GIVEN** initial state has `viewingTravelerId: null`
- **WHEN** `setViewingTravelerId('traveler-uuid')` is dispatched
- **THEN** `selectViewingTravelerId` SHALL return `'traveler-uuid'`

---

### Requirement: Profile Redux slice registered in root reducer
The `profileReducer` SHALL be registered under the `profile` key in `rootReducer`.

#### Scenario: Store initialises with profile slice
- **GIVEN** store is created via `configureStore`
- **WHEN** `store.getState()` is called
- **THEN** `state.profile` SHALL equal `{ viewingTravelerId: null }`

---

### Requirement: MSW handlers for traveler-service endpoints
The frontend test infrastructure SHALL include MSW handlers for `GET /api/travelers`, `GET /api/travelers/:id`, `PATCH /api/travelers/:id`, `DELETE /api/travelers/:id`, `GET /api/travelers/:id/preferences`, and `PUT /api/travelers/:id/preferences`.

#### Scenario: GET /api/travelers/:id handler returns mocked Traveler
- **GIVEN** `travelerHandlers` is spread into `handlers`
- **WHEN** `GET /api/travelers/traveler-test-1` is intercepted by MSW
- **THEN** response SHALL be 200 with a valid `Traveler` object

#### Scenario: handlers index includes travelerHandlers
- **GIVEN** `src/mocks/handlers/index.ts` is imported
- **WHEN** the `handlers` export is inspected
- **THEN** it SHALL include the traveler handler entries

---

### Requirement: ProfileForm component
The frontend SHALL render an editable profile form showing editable fields (department, jobTitle, costCenter, approvalRequired) and read-only fields (email, employeeId, fullName, manager). Submitting SHALL call `updateTraveler`. While saving, the submit button SHALL be disabled and show a loading state.

#### Scenario: Renders editable and read-only fields
- **GIVEN** Redux has a `TravelerProfile` for the logged-in user
- **WHEN** `ProfileForm` is rendered
- **THEN** the `department` input SHALL be editable AND the `email` field SHALL be read-only

#### Scenario: Submit calls updateTraveler with changed fields
- **GIVEN** the user changes `department` to `'Marketing'`
- **WHEN** the user submits the form
- **THEN** `updateTraveler` SHALL be called with `{ department: 'Marketing' }`

#### Scenario: Loading state during save
- **GIVEN** `updateTraveler` mutation is in flight
- **WHEN** the form is submitting
- **THEN** the submit button SHALL be disabled

---

### Requirement: PreferencesForm component
The frontend SHALL render an editable preferences form with seat preference select, meal preference select, special requests text input, frequent flyer list (read-only display), and notification toggles. Submitting SHALL call `updateTravelerPreferences`.

#### Scenario: Renders all preference fields
- **GIVEN** `TravelerPreferences` data is loaded
- **WHEN** `PreferencesForm` is rendered
- **THEN** seat preference and meal preference controls SHALL be visible

#### Scenario: Submit sends updated preferences
- **GIVEN** user changes seat preference to `'AISLE'`
- **WHEN** the user submits
- **THEN** `updateTravelerPreferences` SHALL be called with `seatPreference: 'AISLE'`

---

### Requirement: TravelerTable component — admin only
The frontend SHALL render a paginated table of travelers with columns: name, email, department, jobTitle, status (active/inactive). Includes a search input that debounces and calls `listTravelers` with `?q=`. Visible only to ADMIN role users.

#### Scenario: Renders traveler rows
- **GIVEN** MSW returns 3 travelers for `GET /api/travelers`
- **WHEN** `TravelerTable` is rendered with ADMIN user
- **THEN** 3 traveler rows SHALL be visible in the DOM

#### Scenario: Empty state for zero results
- **GIVEN** MSW returns 0 travelers
- **WHEN** `TravelerTable` is rendered
- **THEN** empty-state message SHALL be visible

---

### Requirement: ProfilePage — tabs layout
The `ProfilePage` at `/profile` SHALL load the logged-in traveler's profile and preferences, display them in two tabs ("Profile" and "Preferences"), and provide GDPR export and delete actions. Auto-loads `auth.user.id` as `travelerId`.

#### Scenario: Renders Profile tab by default
- **GIVEN** user navigates to `/profile`
- **WHEN** `ProfilePage` mounts
- **THEN** "Profile" tab SHALL be active and `ProfileForm` SHALL be visible

#### Scenario: Switching to Preferences tab renders PreferencesForm
- **GIVEN** `ProfilePage` is mounted with Profile tab active
- **WHEN** user clicks the "Preferences" tab
- **THEN** `PreferencesForm` SHALL be visible

#### Scenario: GDPR export link displayed
- **GIVEN** profile data is loaded
- **WHEN** `ProfilePage` renders
- **THEN** a GDPR data export link/button SHALL be present in the DOM

#### Scenario: GDPR delete flow — confirmation then logout
- **GIVEN** user is on `ProfilePage`
- **WHEN** user clicks "Delete My Account" and confirms in the `ConfirmDialog`
- **THEN** `deleteTraveler` SHALL be called AND on success `logout()` SHALL be dispatched AND the route SHALL navigate to `/login`

---

### Requirement: AdminTravelersPage — ADMIN role guard
The `AdminTravelersPage` at `/admin/travelers` SHALL render `TravelerTable` and be accessible only to users with `role === 'ADMIN'`. Non-admin access SHALL be blocked by `RoleGuard`.

#### Scenario: Admin sees traveler list
- **GIVEN** authenticated user has role `ADMIN`
- **WHEN** user navigates to `/admin/travelers`
- **THEN** `TravelerTable` SHALL be rendered

#### Scenario: Non-admin cannot access admin page
- **GIVEN** authenticated user has role `EMPLOYEE`
- **WHEN** user navigates to `/admin/travelers`
- **THEN** `RoleGuard` SHALL block rendering (show forbidden UI or redirect)

---

### Requirement: Route registration
`AppRoutes.tsx` SHALL register `/profile` → `ProfilePage` (replacing the placeholder) and `/admin/travelers` → `AdminTravelersPage` wrapped in `RoleGuard minRole="ADMIN"`. Route constants SHALL be defined in `routes.config.ts`.

#### Scenario: /profile renders ProfilePage
- **GIVEN** authenticated user navigates to `/profile`
- **WHEN** router resolves the path
- **THEN** `ProfilePage` SHALL render (data-testid `"profile-page"`)

#### Scenario: /admin/travelers renders AdminTravelersPage for ADMIN
- **GIVEN** authenticated ADMIN user navigates to `/admin/travelers`
- **WHEN** router resolves the path
- **THEN** `AdminTravelersPage` SHALL render (data-testid `"admin-travelers-page"`)

---

### Requirement: Booking barrel export
`src/features/profile/index.ts` SHALL export all public symbols: `ProfilePage`, `AdminTravelersPage`, `profileReducer`, `setViewingTravelerId`, `selectViewingTravelerId`, `travelerApi`.

#### Scenario: All exports present
- **GIVEN** `import * as barrel from './index'`
- **WHEN** the barrel module is loaded
- **THEN** all listed symbols SHALL be defined

---

### Requirement: Pact V3 consumer contract — GET /travelers/:id
The frontend SHALL have a Pact V3 consumer contract test for `GET /travelers/:id` returning 200 with a `Traveler` schema.

#### Scenario: GET /travelers/:id returns Traveler with required fields
- **GIVEN** Pact mock server is configured with the traveler-service interaction
- **WHEN** `GET /travelers/:id` is called via fetch
- **THEN** response SHALL be 200 AND body SHALL include `id`, `email`, `firstName`, `lastName`, `department`

---

### Requirement: CONTRACTS.md — traveler-service entry
`openspec/CONTRACTS.md` SHALL contain an entry for the `frontend ↔ traveler-service` Pact V3 consumer contract.

#### Scenario: CONTRACTS.md includes the entry
- **GIVEN** the file is read
- **WHEN** searching for `traveler-service`
- **THEN** an entry referencing `pacts/frontend-traveler-service.json` SHALL be present
