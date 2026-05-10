## Context

SM-FE-06 is the final frontend feature module. The expense-service backend (SM-08) is complete and running on port 3006. It generates receipts automatically on `BookingConfirmed` events and exposes REST endpoints for receipt retrieval, PDF download, and expense reporting. The frontend has no UI for any of this — travelers cannot view their receipts and managers have no expense visibility. `BookingConfirmationPage` (SM-FE-04) shows a confirmed booking but has no receipt link.

All prior frontend modules (SM-FE-01 through SM-FE-05) are implemented and archived. Established patterns apply: RTK Query via `baseApi.injectEndpoints`, MSW handlers in `src/mocks/handlers/`, MUI via common component barrel, strict TypeScript.

## Goals / Non-Goals

**Goals:**
- Receipt list and detail view for travelers (employee-scoped by default)
- PDF download via plain anchor tag to `pdfUrl` from API response
- Expense report view for managers/admins (date-range filter, department filter)
- Receipt link on `BookingConfirmationPage` (closes the SM-FE-04 gap)
- MSW handlers, Pact contract test, barrel export, route registration
- `CONTRACTS.md` updated with `frontend ↔ expense-service` entry

**Non-Goals:**
- CSV export UI (`GET /expenses/export`) — the endpoint exists but building a download UI is deferred; plain link can be added later
- Expense approval workflow — the backend has `approvalStatus` but no approval mutation endpoints exist in the OpenAPI spec
- Expense summary/analytics dashboard — `GET /expenses/summary` is not surfaced in this module (manager expense report covers the main need)
- Binary PDF streaming in the browser — `pdfUrl` is a direct S3/object-storage URL; we use `<a href download>`

## Decisions

**1. Two RTK Query tag families: `RECEIPT` and `EXPENSE_REPORT`**

Receipts are immutable (generated once, never mutated by the frontend). Expense reports are aggregates computed server-side. Keeping them as separate tag families prevents cross-invalidation. `listReceipts` and `getReceiptById` carry `RECEIPT` tag at 86400s TTL. `getExpenseReport` and `getExpenseSummary` carry `EXPENSE_REPORT` tag at 60s TTL (date-range queries must stay fresh for manager use).

Alternative considered: single `EXPENSE` tag family — rejected because the TTL mismatch (24h vs 60s) would either over-cache report data or under-cache receipt data.

**2. No new Redux slice**

All expense/receipt state is server state owned by RTK Query. There is no meaningful local UI state that warrants a slice (no multi-step form, no optimistic updates). State key count stays at 6.

Alternative considered: `expenseSlice` for filter state (date range, department) — rejected; local component state (`useState`) is sufficient for filter inputs that drive query args.

**3. Role-conditional query params, not separate endpoints**

`ExpenseListPage` uses a single `listReceipts` endpoint. For EMPLOYEE role, it auto-injects `travelerId: auth.user.id`. For MANAGER/ADMIN, it exposes date range and department filter inputs and omits the `travelerId` constraint. This keeps the API surface small and matches how the backend handles authorization (JWT role claim controls access).

**4. `BookingConfirmationPage` modification: receipt link via `booking.receiptId`**

The booking response from `GET /bookings/:id` includes `receiptId` (set after `BookingConfirmed` is processed). The confirmation page links to `/expenses/receipts/:receiptId` when `booking.receiptId` is present. If absent (race condition — receipt not yet generated), the link is omitted and a note shown. No polling for receipt readiness — the window between confirmation and receipt generation is typically < 1s in normal flow.

**5. PDF download: `<a href={pdfUrl} download>`**

`Receipt.pdfUrl` is a pre-signed S3 URL returned by the expense-service. The browser handles the download natively. No binary streaming, no fetch+blob pattern needed. This is consistent with the decomposition implementation note.

## Risks / Trade-offs

- **`booking.receiptId` may not be in current `Booking` type** → `Booking` interface in `booking.types.ts` must be extended with optional `receiptId?: string`. This is an additive change, not breaking.
- **`pdfUrl` expiry** → S3 pre-signed URLs expire. If a traveler opens the receipt page, caches it for 24h, then clicks download — the URL may be stale. Mitigation: RTK Query cache for `getReceiptById` could be shortened, or the detail page could include a "Refresh" action. For now, 24h TTL is accepted as a known trade-off (immutable receipt, long-lived URL is the decomposition's intent).
- **MSW `GET /api/receipts/:id/download`** → Returns PDF binary. MSW handler returns a mock `Blob` or a redirect to a test URL. Test coverage for PDF download is limited to "link is present in DOM" — not actual download behaviour.

## Open Questions

_(none — all design decisions resolved above)_
