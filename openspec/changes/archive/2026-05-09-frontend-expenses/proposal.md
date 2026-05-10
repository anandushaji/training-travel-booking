## Why

The Corporate Travel Portal lacks a frontend for expense and receipt management. Travelers cannot view their generated receipts, download PDF copies, or track expense status. Managers and admins have no visibility into expense reports or department spend. The `BookingConfirmationPage` (SM-FE-04) has no receipt link despite the backend generating receipts on every `BookingConfirmed` event. This module closes that gap.

## What Changes

- Add `expense.types.ts` with TypeScript interfaces for `Receipt`, `Expense`, `ExpenseReport`, `ExpenseSummary` matching the expense-service OpenAPI schema
- Add `expenseApi.ts` RTK Query slice covering: `listReceipts`, `getReceiptById`, `getExpenseReport`, `getExpenseSummary`
- Add `ExpenseList.tsx` — paginated list of receipts with `StatusBadge` (PENDING/APPROVED/REJECTED) and PDF download links
- Add `ReceiptDetails.tsx` — receipt detail view with booking info, amount breakdown, and `<a href={pdfUrl} download>` anchor
- Add `ExpenseListPage.tsx` at `/expenses` — EMPLOYEE sees own receipts; MANAGER/ADMIN sees all with date-range filter and department filter
- Add `ReceiptPage.tsx` at `/expenses/receipts/:receiptId` — full receipt detail + PDF download
- Update `BookingConfirmationPage.tsx` to include a "View Receipt" link to `/expenses/receipts/:receiptId` using `booking.receiptId`
- Register new routes `/expenses` and `/expenses/receipts/:receiptId` in `AppRoutes.tsx` and `routes.config.ts`
- Add MSW handlers for all expense-service endpoints
- Add barrel export `src/features/expenses/index.ts`
- Add Pact V3 consumer contract test for `GET /receipts/:id`
- Update `openspec/CONTRACTS.md` with `frontend ↔ expense-service` entry

## Capabilities

### New Capabilities

- `frontend-expenses`: Receipt list, receipt detail, PDF download, expense report views, role-conditional filtering, and BookingConfirmationPage receipt link hookup

### Modified Capabilities

- `frontend-booking`: `BookingConfirmationPage` gains a "View Receipt" link (requirement addition — existing AC for confirmation page is extended)

## Impact

- **New files**: `src/features/expenses/` (types, api, components, pages, index)
- **Modified files**: `BookingConfirmationPage.tsx`, `AppRoutes.tsx`, `routes.config.ts`, `src/mocks/handlers/index.ts`, `openspec/CONTRACTS.md`
- **No new state slices** — all server state via RTK Query; no Redux slice needed for expenses
- **State key count unchanged** — still 6 slices (`api, notifications, auth, search, booking, profile`)
- **PDF download**: plain `<a href download>` anchor, no binary streaming; `pdfUrl` comes from `Receipt.pdfUrl` in the API response
- **Cache TTL**: receipts at 86400s (24h — immutable); expense reports at 60s
- **Dependencies**: expense-service running on port 3006; OpenAPI spec at `docs/contracts/openapi/openapi-expense-service.yaml`
