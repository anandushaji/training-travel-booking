## 1. Types and API layer

- [x] 1.1 Create `src/features/profile/profile.types.ts` — define `TravelerProfile`, `TravelerPreferences`, `FrequentFlyerNumber`, `LoyaltyProgram`, `NotificationPreferences`, `UpdateTravelerRequest`, `TravelerListResponse` interfaces matching the `traveler-service` OpenAPI schema
  - **AC**: TypeScript compiles with zero errors under `exactOptionalPropertyTypes: true` for any file importing these interfaces
  - **Artifact**: `src/features/profile/profile.types.spec.ts`: "profile.types — all exported interfaces satisfy expected shape"
  - **Must fail if**: Required field removed, wrong type used, or optional field not typed `T | undefined`

- [x] 1.2 Create `src/features/profile/travelerApi.ts` — inject `getTravelerById` (GET /travelers/:id, `keepUnusedDataFor:3600`, provides `TRAVELER` tag), `updateTraveler` (PATCH /travelers/:id, invalidates `TRAVELER` tag), `deleteTraveler` (DELETE /travelers/:id, invalidates `TRAVELER` tag), `getTravelerPreferences` (GET /travelers/:id/preferences, `keepUnusedDataFor:3600`), `updateTravelerPreferences` (PUT /travelers/:id/preferences, invalidates `TRAVELER` tag), `listTravelers` (GET /travelers, `keepUnusedDataFor:60`) into `baseApi`
  - **AC** (getTravelerById): GIVEN MSW returns 200, WHEN dispatched, THEN `GET /api/travelers/:id` SHALL have been called
  - **AC** (updateTraveler): WHEN `updateTraveler({ id, department:'Finance' })` dispatched, THEN `PATCH /api/travelers/:id` SHALL have been called with correct body
  - **AC** (deleteTraveler): WHEN `deleteTraveler(id)` dispatched, THEN `DELETE /api/travelers/:id` SHALL have been called
  - **AC** (updateTravelerPreferences): WHEN dispatched with `{ id, seatPreference:'WINDOW' }`, THEN `PUT /api/travelers/:id/preferences` SHALL have been called
  - **Artifact**: `src/features/profile/travelerApi.spec.ts`: "getTravelerById" | "updateTraveler" | "deleteTraveler" | "updateTravelerPreferences"
  - **Must fail if**: URL wrong, body mis-serialised, or wrong HTTP method used

## 2. Redux slice

- [x] 2.1 Create `src/features/profile/profileSlice.ts` — initial state `{ viewingTravelerId: null }`; action `setViewingTravelerId`; selector `selectViewingTravelerId`
  - **AC**: WHEN `setViewingTravelerId('uuid')` dispatched, THEN `selectViewingTravelerId` SHALL return `'uuid'`
  - **Artifact**: `src/features/profile/profileSlice.spec.ts`: "setViewingTravelerId"
  - **Must fail if**: State not updated or selector reads wrong key

- [x] 2.2 Register `profile: profileReducer` in `src/app/rootReducer.ts` and add assertion to `src/app/rootReducer.spec.ts` that `state.profile` equals `{ viewingTravelerId: null }`
  - **AC**: GIVEN store created, THEN `state.profile` SHALL equal `{ viewingTravelerId: null }`
  - **Artifact**: `src/app/rootReducer.spec.ts` — add booking-style assertion for profile initial state
  - **Must fail if**: `profile` key absent from state

## 3. MSW handlers

- [x] 3.1 Create `src/mocks/handlers/traveler.handlers.ts` — handlers for `GET /api/travelers`, `GET /api/travelers/:id`, `PATCH /api/travelers/:id` (200), `DELETE /api/travelers/:id` (200), `GET /api/travelers/:id/preferences`, `PUT /api/travelers/:id/preferences` (200)
  - **AC**: WHEN `GET /api/travelers/:id` is intercepted, THEN response SHALL be 200 with valid `TravelerProfile` fields
  - **Artifact**: handler file (tested implicitly by component specs)
  - **Must fail if**: Wrong status code or missing required response fields

- [x] 3.2 Update `src/mocks/handlers/index.ts` — spread `travelerHandlers` into the handlers array
  - **AC**: GIVEN index imported, WHEN `handlers` array inspected, THEN traveler handler entries SHALL be present
  - **Artifact**: `src/mocks/handlers/index.spec.ts` — add assertion for travelerHandlers presence
  - **Must fail if**: `travelerHandlers` spread absent

## 4. Components

- [x] 4.1 Create `src/features/profile/components/ProfileForm.tsx` — editable fields (department, jobTitle, costCenter, approvalRequired checkbox); read-only display for email, employeeId, fullName, manager; submit calls `updateTraveler`; loading state disables submit button; success/error `Alert`
  - **AC** (editable vs read-only): WHEN rendered, THEN department input SHALL be editable AND email field SHALL be read-only
  - **AC** (submit): WHEN user changes department and submits, THEN `updateTraveler` SHALL be called with updated fields
  - **AC** (loading): WHEN mutation in flight, THEN submit button SHALL be disabled
  - **Artifact**: `src/features/profile/components/ProfileForm.spec.tsx`: "ProfileForm — renders editable fields" | "ProfileForm — submit calls updateTraveler" | "ProfileForm — loading state"
  - **Must fail if**: Read-only field editable, wrong API called, or submit enabled while saving

- [x] 4.2 Create `src/features/profile/components/PreferencesForm.tsx` — seat preference `SelectInput`, meal preference `SelectInput`, special requests `TextInput`, frequent flyer read-only list, notification toggles (email, SMS checkboxes); submit calls `updateTravelerPreferences`; loading state
  - **AC** (renders fields): WHEN rendered, THEN seat and meal preference controls SHALL be visible
  - **AC** (submit): WHEN seat preference changed to 'AISLE' and submitted, THEN `updateTravelerPreferences` SHALL be called with `seatPreference:'AISLE'`
  - **Artifact**: `src/features/profile/components/PreferencesForm.spec.tsx`: "PreferencesForm — renders fields" | "PreferencesForm — submit calls updateTravelerPreferences"
  - **Must fail if**: Wrong API called, or required fields not displayed

- [x] 4.3 Create `src/features/profile/components/TravelerTable.tsx` — calls `listTravelers({ page, limit: 20 })`; renders table rows (name, email, department, jobTitle, active status badge); search input (debounced, sets `?q=` param); empty state; pagination controls; skeleton while loading
  - **AC** (renders rows): WHEN MSW returns 3 travelers, THEN 3 rows SHALL be in the DOM
  - **AC** (empty state): WHEN MSW returns 0 travelers, THEN empty-state SHALL be visible
  - **Artifact**: `src/features/profile/components/TravelerTable.spec.tsx`: "TravelerTable — renders rows" | "TravelerTable — empty state"
  - **Must fail if**: Rows not rendered or empty state absent

## 5. Pages

- [x] 5.1 Create `src/features/profile/pages/ProfilePage.tsx` — auto-loads `auth.user.id` as `travelerId`; fetches profile + preferences; renders MUI `Tabs` with "Profile" tab (`ProfileForm`) and "Preferences" tab (`PreferencesForm`); GDPR export link (`data-testid="gdpr-export-link"`); "Delete My Account" button that opens `ConfirmDialog`; on confirm calls `deleteTraveler`, on success dispatches `logout()` and navigates to `/login`
  - **AC** (Profile tab default): WHEN mounted, THEN "Profile" tab SHALL be active and `ProfileForm` SHALL be visible
  - **AC** (tab switch): WHEN "Preferences" tab clicked, THEN `PreferencesForm` SHALL be visible
  - **AC** (GDPR export link): WHEN rendered, THEN `data-testid="gdpr-export-link"` SHALL be in the DOM
  - **AC** (GDPR delete): WHEN "Delete My Account" confirmed, THEN `deleteTraveler` SHALL be called AND `logout()` SHALL be dispatched AND route SHALL navigate to `/login`
  - **Artifact**: `src/features/profile/pages/ProfilePage.spec.tsx`: "ProfilePage — default tab" | "ProfilePage — tab switch" | "ProfilePage — GDPR export link" | "ProfilePage — GDPR delete flow"
  - **Must fail if**: Wrong tab default, delete flow skips logout, or route not navigated

- [x] 5.2 Create `src/features/profile/pages/AdminTravelersPage.tsx` — renders `TravelerTable`; page title "Traveler Administration"; `data-testid="admin-travelers-page"`
  - **AC**: WHEN rendered with ADMIN user, THEN `data-testid="admin-travelers-page"` SHALL be in the DOM
  - **Artifact**: `src/features/profile/pages/AdminTravelersPage.spec.tsx`: "AdminTravelersPage — renders"
  - **Must fail if**: Page does not render for ADMIN

## 6. Routing

- [x] 6.1 Update `src/routes/routes.config.ts` and `src/routes/AppRoutes.tsx` — replace placeholder `ProfilePage` stub with real `ProfilePage` from `features/profile`; add `/admin/travelers` route wrapped in `<RoleGuard minRole="ADMIN">` rendering `AdminTravelersPage`
  - **AC** (`/profile`): WHEN router navigates to `/profile`, THEN `ProfilePage` (data-testid `"profile-page"`) SHALL render
  - **AC** (`/admin/travelers` — ADMIN): WHEN ADMIN user navigates to `/admin/travelers`, THEN `AdminTravelersPage` SHALL render
  - **AC** (`/admin/travelers` — non-admin): WHEN EMPLOYEE user navigates to `/admin/travelers`, THEN `RoleGuard` SHALL block rendering
  - **Artifact**: `src/routes/AppRoutes.spec.tsx` — add route resolution tests for `/profile` and `/admin/travelers`
  - **Must fail if**: Placeholder still used, admin route unguarded, or wrong component rendered

## 7. Barrel export

- [x] 7.1 Create `src/features/profile/index.ts`
  - **AC**: `import * as barrel from './index'` results in all listed symbols being defined
  - **Artifact**: `src/features/profile/index.spec.ts`: "profile barrel — all required exports present"
  - **Must fail if**: Any listed export is missing

## 8. Contract test

- [x] 8.1 Create `src/features/profile/__tests__/contracts/travelerApi.contract.spec.ts`
  - **AC**: Pact file written to `pacts/frontend-traveler-service.json` containing the interaction
  - **Artifact**: the spec file itself
  - **Must fail if**: Pact file not written or response shape deviates from OpenAPI

- [x] 8.2 Update `openspec/CONTRACTS.md`
  - **AC**: File contains an entry referencing `pacts/frontend-traveler-service.json` with consumer `frontend` and provider `traveler-service`
  - **Artifact**: `openspec/CONTRACTS.md` inspection
  - **Must fail if**: Entry missing or consumer/provider names incorrect
