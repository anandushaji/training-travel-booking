## 1. Types

- [x] 1.1 Create `src/features/expenses/expense.types.ts` with `Receipt`, `Expense`, `ExpenseReport`, `ExpenseSummary`, `ReceiptListResponse`, `ExpenseApprovalStatus`, and `ExpenseReportParams` interfaces matching the expense-service OpenAPI schema
- [x] 1.2 Extend `src/features/booking/booking.types.ts` `Booking` interface with optional `receiptId?: string` field

## 2. RTK Query API

- [x] 2.1 Create `src/features/expenses/expenseApi.ts` injecting into `baseApi` with endpoints: `listReceipts` (GET /receipts, TTL 86400, RECEIPT tag), `getReceiptById` (GET /receipts/:id, TTL 86400, ['RECEIPT', id] tag), `getExpenseReport` (GET /expenses, TTL 60, EXPENSE_REPORT tag), `getExpenseSummary` (GET /expenses/summary, TTL 60, EXPENSE_REPORT tag)

## 3. MSW Handlers

- [x] 3.1 Create `src/mocks/handlers/expense.handlers.ts` with handlers for: `GET /api/receipts`, `GET /api/receipts/:id`, `GET /api/receipts/:id/download`, `GET /api/expenses`, `GET /api/expenses/summary`
- [x] 3.2 Spread `expenseHandlers` into `handlers` array in `src/mocks/handlers/index.ts`

## 4. Components

- [x] 4.1 Create `src/features/expenses/components/ExpenseList.tsx` — paginated receipt list with receipt number, route, date, amount, `StatusBadge` (PENDING=warning, APPROVED=success, REJECTED=error), "View" link to `/expenses/receipts/:id`, and `<a href={pdfUrl} download>` PDF anchor
- [x] 4.2 Create `src/features/expenses/components/ReceiptDetails.tsx` — receipt detail view showing receipt number, traveler name, booking route and dates, amount breakdown (baseFare, taxes, fees, total), currency, and `<a href={pdfUrl} download>` PDF anchor

## 5. Pages

- [x] 5.1 Create `src/features/expenses/pages/ExpenseListPage.tsx` — role-conditional: EMPLOYEE auto-filters by `auth.user.id`; MANAGER/ADMIN shows date-range and department filter inputs; renders `ExpenseList`; shows skeleton while loading; shows `Alert` on error; `data-testid="expense-list-page"`
- [x] 5.2 Create `src/features/expenses/pages/ReceiptPage.tsx` — loads receipt via `getReceiptById(receiptId)` from route param; renders `ReceiptDetails`; shows skeleton while loading; shows `Alert` on error or 404; `data-testid="receipt-page"`
- [x] 5.3 Update `src/features/booking/pages/BookingConfirmationPage.tsx` — add "View Receipt" link to `/expenses/receipts/:receiptId` when `booking.receiptId` is present; omit silently when absent

## 6. Routes

- [x] 6.1 Add `EXPENSES = '/expenses'` and `RECEIPT_DETAIL = '/expenses/receipts/:receiptId'` constants to `src/routes/routes.config.ts`
- [x] 6.2 Register `/expenses` → `ExpenseListPage` and `/expenses/receipts/:receiptId` → `ReceiptPage` in `src/routes/AppRoutes.tsx`

## 7. Barrel Export

- [x] 7.1 Create `src/features/expenses/index.ts` exporting `ExpenseListPage`, `ReceiptPage`, `expenseApi`

## 8. Tests

- [x] 8.1 Create `src/features/expenses/__tests__/expense.types.spec.ts` — TypeScript compilation test asserting `Receipt`, `Expense`, `ExpenseReport`, `ExpenseSummary` compile under `exactOptionalPropertyTypes: true`
- [x] 8.2 Create `src/features/expenses/__tests__/expenseApi.spec.ts` — RTK Query endpoint tests: `listReceipts` returns receipt list, `getReceiptById` returns receipt, `getExpenseReport` sends date params, `listReceipts` TTL equals 86400
- [x] 8.3 Create `src/features/expenses/__tests__/ExpenseList.spec.tsx` — renders 3 receipt rows, renders empty state for zero receipts, PDF download anchor present
- [x] 8.4 Create `src/features/expenses/__tests__/ReceiptDetails.spec.tsx` — renders all receipt fields, PDF download anchor present
- [x] 8.5 Create `src/features/expenses/__tests__/ExpenseListPage.spec.tsx` — EMPLOYEE auto-filters by travelerId, ADMIN shows filter inputs, skeleton shown while loading
- [x] 8.6 Create `src/features/expenses/__tests__/ReceiptPage.spec.tsx` — renders receipt details on success, shows error alert on 404
- [x] 8.7 Update `src/features/booking/__tests__/BookingConfirmationPage.spec.tsx` — add tests: receipt link shown when `receiptId` present, receipt link absent when `receiptId` missing
- [x] 8.8 Update `src/features/booking/__tests__/booking.types.spec.ts` (or create) — assert `Booking` interface allows optional `receiptId`
- [x] 8.9 Create `src/features/expenses/__tests__/ExpenseListPage.routes.spec.tsx` — `/expenses` renders `ExpenseListPage`, `/expenses/receipts/:id` renders `ReceiptPage`
- [x] 8.10 Verify `src/mocks/handlers/index.ts` includes `expenseHandlers` (handler index test)

## 9. Pact Contract & CONTRACTS.md

- [x] 9.1 Create `src/features/expenses/__tests__/expenseApi.contract.spec.ts` — Pact V3 consumer contract test for `GET /receipts/:id` returning 200 with `Receipt` schema including `id`, `receiptNumber`, `bookingId`, `amount`, `currency`, `pdfUrl`; writes to `pacts/frontend-expense-service.json`
- [x] 9.2 Update `openspec/CONTRACTS.md` — add `frontend ↔ expense-service` Pact V3 consumer contract entry referencing `pacts/frontend-expense-service.json`
