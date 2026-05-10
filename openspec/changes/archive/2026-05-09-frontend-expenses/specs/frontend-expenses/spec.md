## ADDED Requirements

### Requirement: Expense and receipt TypeScript types
The frontend SHALL define `Receipt`, `Expense`, `ExpenseReport`, `ExpenseSummary`, `ReceiptListResponse`, `ExpenseApprovalStatus`, and `ExpenseReportParams` TypeScript interfaces in `src/features/expenses/expense.types.ts` matching the expense-service OpenAPI schema.

#### Scenario: All interfaces compile with strict TypeScript
- **GIVEN** `booking.types.ts` pattern is followed
- **WHEN** any file imports from `expense.types.ts`
- **THEN** TypeScript SHALL compile with zero errors under `exactOptionalPropertyTypes: true`

---

### Requirement: expenseApi RTK Query endpoints
The frontend SHALL expose RTK Query endpoints injected into `baseApi` from `src/features/expenses/expenseApi.ts`:
- `listReceipts` — `GET /receipts` with optional `{ bookingId?, startDate?, endDate?, page?, limit? }` params — `keepUnusedDataFor: 86400` — provides `RECEIPT` tag
- `getReceiptById` — `GET /receipts/:id` — `keepUnusedDataFor: 86400` — provides `['RECEIPT', id]` tag
- `getExpenseReport` — `GET /expenses` with required `{ startDate, endDate }` and optional `{ department?, travelerId?, groupBy? }` — `keepUnusedDataFor: 60` — provides `EXPENSE_REPORT` tag
- `getExpenseSummary` — `GET /expenses/summary` with optional `{ fiscalYear?, department? }` — `keepUnusedDataFor: 60` — provides `EXPENSE_REPORT` tag

#### Scenario: listReceipts fetches receipt list
- **GIVEN** MSW returns a `ReceiptListResponse` for `GET /api/receipts`
- **WHEN** `listReceipts({})` is dispatched
- **THEN** the returned data SHALL include a `receipts` array and `pagination` object

#### Scenario: getReceiptById fetches single receipt
- **GIVEN** MSW returns a `Receipt` for `GET /api/receipts/receipt-1`
- **WHEN** `getReceiptById('receipt-1')` is dispatched
- **THEN** the returned data SHALL include `id`, `receiptNumber`, `amount`, `currency`, `pdfUrl`

#### Scenario: getExpenseReport sends required date params
- **GIVEN** MSW accepts `GET /api/expenses` with `startDate` and `endDate` query params
- **WHEN** `getExpenseReport({ startDate: '2026-01-01', endDate: '2026-12-31' })` is dispatched
- **THEN** `GET http://localhost/api/expenses?startDate=2026-01-01&endDate=2026-12-31` SHALL have been called

#### Scenario: listReceipts uses 24h TTL
- **GIVEN** `expenseApi` is configured
- **WHEN** `listReceipts` endpoint definition is inspected
- **THEN** `keepUnusedDataFor` SHALL equal `86400`

---

### Requirement: ExpenseList component
The frontend SHALL render a paginated list of receipts with columns: receipt number, booking route (origin → destination), date, amount (currency + value), and approval status. Status SHALL use `StatusBadge` with `statusColorMap`: `PENDING=warning`, `APPROVED=success`, `REJECTED=error`. Each row SHALL include a "View" link to `/expenses/receipts/:receiptId` and a PDF download anchor (`<a href={pdfUrl} download>`).

#### Scenario: Renders receipt rows
- **GIVEN** MSW returns 3 receipts for `GET /api/receipts`
- **WHEN** `ExpenseList` is rendered with those receipts
- **THEN** 3 receipt rows SHALL be visible in the DOM

#### Scenario: Empty state for zero receipts
- **GIVEN** an empty `receipts` array is passed
- **WHEN** `ExpenseList` is rendered
- **THEN** an empty-state message SHALL be visible

#### Scenario: PDF download anchor present
- **GIVEN** a receipt has `pdfUrl: 'https://s3.test/receipt.pdf'`
- **WHEN** `ExpenseList` renders that receipt row
- **THEN** an anchor with `href='https://s3.test/receipt.pdf'` and `download` attribute SHALL be present

---

### Requirement: ReceiptDetails component
The frontend SHALL render a receipt detail view showing: receipt number, traveler name, booking route and dates, amount breakdown (baseFare, taxes, fees, total), currency, and a PDF download anchor (`<a href={pdfUrl} download>`).

#### Scenario: Renders all receipt fields
- **GIVEN** a `Receipt` object with all fields populated
- **WHEN** `ReceiptDetails` is rendered
- **THEN** receipt number, amount, and currency SHALL be visible in the DOM

#### Scenario: PDF download anchor present in detail view
- **GIVEN** `receipt.pdfUrl` is `'https://s3.test/rec.pdf'`
- **WHEN** `ReceiptDetails` renders
- **THEN** an anchor with `href='https://s3.test/rec.pdf'` and `download` attribute SHALL be in the DOM

---

### Requirement: ExpenseListPage — role-conditional receipt list
The `ExpenseListPage` at `/expenses` SHALL:
- For EMPLOYEE role: automatically filter by `travelerId: auth.user.id` and display the traveler's own receipts
- For MANAGER/ADMIN role: display date-range filter inputs (`startDate`, `endDate`) and an optional department filter; allow querying all receipts
- Render `ExpenseList` with the query result
- Show loading skeleton while fetching; show `Alert` on error

#### Scenario: Employee sees own receipts
- **GIVEN** authenticated user has role `EMPLOYEE` and MSW returns receipts filtered by their traveler ID
- **WHEN** `ExpenseListPage` mounts
- **THEN** `listReceipts` SHALL be called with `travelerId` matching `auth.user.id`

#### Scenario: Admin sees filter inputs
- **GIVEN** authenticated user has role `ADMIN`
- **WHEN** `ExpenseListPage` renders
- **THEN** `startDate` and `endDate` filter inputs SHALL be visible

#### Scenario: Loading skeleton shown while fetching
- **GIVEN** `listReceipts` is in flight
- **WHEN** `ExpenseListPage` renders
- **THEN** a loading skeleton SHALL be visible

---

### Requirement: ReceiptPage — receipt detail
The `ReceiptPage` at `/expenses/receipts/:receiptId` SHALL load a single receipt via `getReceiptById` and render `ReceiptDetails`. Shows loading skeleton while fetching. Shows `Alert` on error or 404.

#### Scenario: Renders receipt details
- **GIVEN** MSW returns a `Receipt` for `GET /api/receipts/receipt-1`
- **WHEN** `ReceiptPage` is rendered at `/expenses/receipts/receipt-1`
- **THEN** `ReceiptDetails` SHALL be visible with the receipt data

#### Scenario: Shows error on 404
- **GIVEN** MSW returns 404 for `GET /api/receipts/bad-id`
- **WHEN** `ReceiptPage` is rendered at `/expenses/receipts/bad-id`
- **THEN** an error `Alert` SHALL be visible

---

### Requirement: MSW handlers for expense-service endpoints
The frontend test infrastructure SHALL include MSW handlers for `GET /api/receipts`, `GET /api/receipts/:id`, `GET /api/receipts/:id/download`, `GET /api/expenses`, and `GET /api/expenses/summary` in `src/mocks/handlers/expense.handlers.ts`, spread into `handlers` in `src/mocks/handlers/index.ts`.

#### Scenario: GET /api/receipts/:id handler returns mocked Receipt
- **GIVEN** `expenseHandlers` is spread into `handlers`
- **WHEN** `GET /api/receipts/receipt-test-1` is intercepted by MSW
- **THEN** response SHALL be 200 with a valid `Receipt` object including `pdfUrl`

#### Scenario: handlers index includes expenseHandlers
- **GIVEN** `src/mocks/handlers/index.ts` is imported
- **WHEN** the `handlers` export is inspected
- **THEN** it SHALL include the expense handler entries

---

### Requirement: Route registration
`AppRoutes.tsx` SHALL register `/expenses` → `ExpenseListPage` and `/expenses/receipts/:receiptId` → `ReceiptPage`. Route constants SHALL be defined in `routes.config.ts` as `EXPENSES` and `RECEIPT_DETAIL`.

#### Scenario: /expenses renders ExpenseListPage
- **GIVEN** authenticated user navigates to `/expenses`
- **WHEN** router resolves the path
- **THEN** `ExpenseListPage` SHALL render (data-testid `"expense-list-page"`)

#### Scenario: /expenses/receipts/:id renders ReceiptPage
- **GIVEN** authenticated user navigates to `/expenses/receipts/receipt-1`
- **WHEN** router resolves the path
- **THEN** `ReceiptPage` SHALL render (data-testid `"receipt-page"`)

---

### Requirement: Expenses barrel export
`src/features/expenses/index.ts` SHALL export all public symbols: `ExpenseListPage`, `ReceiptPage`, `expenseApi`.

#### Scenario: All exports present
- **GIVEN** `import * as barrel from './index'`
- **WHEN** the barrel module is loaded
- **THEN** `ExpenseListPage`, `ReceiptPage`, and `expenseApi` SHALL be defined

---

### Requirement: Pact V3 consumer contract — GET /receipts/:id
The frontend SHALL have a Pact V3 consumer contract test for `GET /receipts/:id` returning 200 with a `Receipt` schema in `src/features/expenses/__tests__/expenseApi.contract.spec.ts`.

#### Scenario: GET /receipts/:id returns Receipt with required fields
- **GIVEN** Pact mock server is configured with the expense-service interaction
- **WHEN** `GET /receipts/:id` is called via fetch
- **THEN** response SHALL be 200 AND body SHALL include `id`, `receiptNumber`, `bookingId`, `amount`, `currency`, `pdfUrl`

---

### Requirement: CONTRACTS.md — expense-service entry
`openspec/CONTRACTS.md` SHALL contain an entry for the `frontend ↔ expense-service` Pact V3 consumer contract.

#### Scenario: CONTRACTS.md includes the expense-service entry
- **GIVEN** the file is read
- **WHEN** searching for `expense-service`
- **THEN** an entry referencing `pacts/frontend-expense-service.json` SHALL be present
