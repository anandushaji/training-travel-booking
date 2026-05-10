## Context

SM-FE-01 through SM-FE-04 (Foundation, Auth, Search, Booking) are implemented and archived. The `profile` placeholder page at `/profile` currently renders a blank stub. This design covers the full Profile feature slice (`frontend-profile`): traveler profile view/edit, travel preferences management, GDPR data access/erasure, and an admin traveler list.

**Current state:**
- `/profile` → placeholder `<div>Profile</div>` in `AppRoutes.tsx`
- `/admin/travelers` route does not exist
- `traveler-service` is running and healthy; OpenAPI spec at `docs/contracts/openapi/openapi-traveler-service.yaml`
- `auth.user.id` (JWT sub claim) is the `travelerId` for the logged-in user
- Existing `RoleGuard` component available for role-based route protection

**Constraints:**
- TypeScript 5.x strict mode (`exactOptionalPropertyTypes: true`)
- All MUI usage via `src/common/components/` barrel — no raw MUI primitives in feature code
- RTK Query injected into `baseApi` (same pattern as `bookingApi`, `flightApi`)
- Cache TTL: profile + preferences = 3600s (1 h, matching backend cache per decomposition)
- GDPR delete: `DELETE /travelers/:id` → dispatch `logout()` → navigate to `/login`

## Goals / Non-Goals

**Goals:**
- Profile view/edit for the logged-in traveler (department, jobTitle, costCenter, approvalRequired editable; email, employeeId, fullName, manager read-only)
- Travel preferences view/edit (seat, meal, special requests, frequent flyer, notifications)
- GDPR data export link (`GET /travelers/:id/export` — display download link only; actual PDF handled by backend)
- GDPR account deletion with confirmation dialog (role-limited: own account only)
- Admin traveler list with search and pagination (ADMIN role only, guarded by `RoleGuard`)
- MSW handlers for all consumed endpoints
- Pact V3 consumer contract for `GET /travelers/:id`

**Non-Goals:**
- Creating or soft-deleting other users' accounts by non-admin (backend enforces)
- HR sync trigger UI (admin-only backend operation, out of scope for this sprint)
- Inline avatar / photo upload
- Manager assignment UI

## Decisions

### D1 — Profile and Preferences as tabs on a single `ProfilePage`
Profile info and preferences are always co-located from the user's perspective. A `Tabs` component (MUI) within `ProfilePage` avoids two separate routes and keeps the navigation surface minimal.

**Alternative considered:** Separate `/profile` and `/profile/preferences` routes. Rejected — adds routing complexity with no user benefit; the traveler views and edits both on one screen.

### D2 — `travelerApi.ts` injects into `baseApi` (same pattern as `bookingApi`)
Keeps the single RTK Query cache and avoids a separate store path. `keepUnusedDataFor: 3600` for both `getTravelerById` and `getTravelerPreferences`.

**Alternative considered:** Standalone `createApi` for traveler. Rejected — conflicts with tag invalidation and global middleware setup.

### D3 — `profileSlice` holds only `viewingTravelerId`
The logged-in traveler's data lives in RTK Query cache (fetched by `auth.user.id`). The slice is needed only for the admin "viewing someone else's profile" flow in a future sprint. For now it stores `null` and is the foundation for that capability.

### D4 — GDPR delete: confirmation dialog → `DELETE` → `logout()` → `/login`
`ConfirmDialog` (already in common components) renders a modal asking the user to confirm. On confirm, `deleteTraveler` mutation is dispatched; on success, `logout()` action is dispatched and `navigate('/login')` is called. No undo possible.

**Risk:** If the `DELETE` succeeds but `logout()` fails (e.g., network error during refresh), the user remains logged in with an invalid account. Mitigation: always dispatch `logout()` client-side regardless of `DELETE` response, trusting the backend cascade.

### D5 — Admin traveler list at `/admin/travelers` guarded by `RoleGuard` with `minRole="ADMIN"`
`RoleGuard` already accepts `minRole`; wrapping `AdminTravelersPage` in `<RoleGuard minRole="ADMIN">` is consistent with the auth pattern from SM-FE-02. Non-admins receive a 403 UI.

**Pattern Selection Log:**
- Cache-aside: yes — `keepUnusedDataFor: 3600` on profile and preferences; stale-while-revalidate on `PATCH`/`PUT` via tag invalidation
- CQRS: implicit — RTK Query `Query` vs `Mutation` separation
- Idempotency: `PUT /preferences` is idempotent by design (full replacement)

## Risks / Trade-offs

- **Stale profile data** → profile fetched once per hour. If another session updates the profile, the current session won't see changes until TTL expires or a manual refetch. Acceptable for this use case; users rarely update their own profile concurrently.
- **GDPR delete race** → user deletes account and immediately tries to navigate. Mitigation: disable all UI actions after `deleteTraveler` is dispatched.
- **Admin list scalability** → `GET /travelers` returns max 100 per page. For large orgs the list may paginate many times. Accepted as MVP; server-side search via `?q=` param mitigates most cases.
- **`exactOptionalPropertyTypes`** → optional fields in `TravelerPreferences` (e.g., `frequentFlyerNumbers`) must be typed `T | undefined` explicitly. Must be careful in `PreferencesForm` spread.
