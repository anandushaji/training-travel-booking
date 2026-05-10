## Why

The Corporate Travel Portal SPA has search (SM-FE-03) and booking (SM-FE-04) implemented, but employees currently have no way to view or edit their own traveler profile or travel preferences from the frontend. SM-FE-05 delivers the full Profile feature slice, closing this gap and enabling the GDPR rights obligations (right to access and erasure) required by ADR-005.

## What Changes

- New `src/features/profile/` feature module introduced:
  - `profile.types.ts` — TypeScript interfaces for `TravelerProfile`, `TravelerPreferences`, `TravelerListResponse`
  - `travelerApi.ts` — RTK Query endpoints: `GET /travelers/:id`, `PATCH /travelers/:id`, `GET /travelers/:id/preferences`, `PUT /travelers/:id/preferences`, `DELETE /travelers/:id`; admin endpoint `GET /travelers` (list)
  - `profileSlice.ts` — Redux slice: `{ viewingTravelerId: string | null }` + selector
  - `components/ProfileForm.tsx` — Editable profile fields (department, jobTitle, costCenter, approvalRequired); read-only fields (email, employeeId, fullName, manager)
  - `components/PreferencesForm.tsx` — Seat preference, meal preference, special requests, frequent flyer numbers, notification toggles
  - `components/TravelerTable.tsx` — Admin-only paginated traveler list with search input
  - `pages/ProfilePage.tsx` — Auto-loads `auth.user.id`; renders profile + preferences tabs; GDPR export / delete actions
  - `pages/AdminTravelersPage.tsx` — Renders `TravelerTable`; guarded by `ADMIN` role
  - `index.ts` — barrel export
- `src/routes/routes.config.ts` — add `PROFILE = '/profile'` (already exists), `ADMIN_TRAVELERS = '/admin/travelers'`
- `src/routes/AppRoutes.tsx` — wire `ProfilePage` to `/profile`; wire `AdminTravelersPage` to `/admin/travelers` behind `RoleGuard`
- `src/mocks/handlers/traveler.handlers.ts` — MSW handlers for all traveler-service endpoints
- `src/mocks/handlers/index.ts` — spread `travelerHandlers`
- Pact V3 consumer contract test for `GET /travelers/:id`
- `openspec/CONTRACTS.md` — add `frontend ↔ traveler-service` entry

## Capabilities

### New Capabilities
- `frontend-profile`: Profile view and edit page, preferences management, GDPR data-access/erasure flow, and admin traveler list — all backed by `travelerApi.ts` RTK Query endpoints against `traveler-service`

### Modified Capabilities
- `frontend-auth`: No spec-level requirement change; routing constants extended (`ADMIN_TRAVELERS`) — implementation detail only, no delta spec needed

## Impact

- **Code**: New `src/features/profile/` directory (~10 files); minor updates to `AppRoutes.tsx`, `routes.config.ts`, `handlers/index.ts`
- **APIs**: `traveler-service` endpoints consumed: `GET/PATCH /travelers/:id`, `GET/PUT /travelers/:id/preferences`, `DELETE /travelers/:id`, `GET /travelers` (admin)
- **RBAC**: `AdminTravelersPage` requires `ADMIN` role; enforced via existing `RoleGuard` component
- **GDPR**: Delete flow dispatches `logout()` after successful `DELETE /travelers/:id` and navigates to `/login`
- **Cache**: Profile TTL `keepUnusedDataFor: 3600`; preferences TTL `keepUnusedDataFor: 3600`
- **No breaking changes** to existing SM-FE-01 through SM-FE-04 modules
