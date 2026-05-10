# Tasks: Frontend Foundation & Infrastructure (SM-FE-01)

> Every Acceptance Criterion below is paired with a named executable verification
> artifact per `docs/workflow/acceptance-criteria.md`. Each artifact has a
> "Must fail if" note describing the THEN mutation it would detect.

## Implementation Checklist

> **Execution order note**: T00 and T00b must execute AFTER T01 creates the Vite scaffold
> (T01 generates the initial `package.json`; T00 installs additional packages into it).
> Execution sequence: **T01 → T00 → T00b → T02 → T03 → ...**

- [x] T01: Initialise Vite + React 18 + TypeScript 5 project scaffold
- [x] T00: Install all npm dependencies (production + development)
- [x] T00b: Set up MSW v2, test runner, and test infrastructure
- [x] T02: Configure Redux Toolkit store and RTK Query `baseApi`
- [x] T03: Implement MUI v5 corporate theme
- [x] T04: Implement Layout components (`Header`, `Sidebar`, `Footer`, `PageContainer`)
- [x] T05: Implement Action components (`Button`, `IconButton`, `LoadingButton`)
- [x] T06: Implement Form primitive components (`FormField`, `TextInput`, `SelectInput`, `DatePickerInput`, `NumberInput`)
- [x] T07: Implement Data Display components (`DataTable`, `StatusBadge`, `CurrencyDisplay`, `Card`, `ClickableCard`)
- [x] T08: Implement Feedback components (`Alert`, `GlobalSnackbar`, `Modal`, `ConfirmDialog`)
- [x] T09: Implement Loading & Empty state components (`Spinner`, `Skeleton`, `LoadingOverlay`, `EmptyState`, `ErrorBoundary`)
- [x] T10: Implement common component barrel export and common hooks/utilities
- [x] T11: Implement React Router v6 configuration and `PrivateRoute`
- [x] T12: Implement `baseQueryWithTimeout` (Timeouts pattern)
- [x] T13: Implement `baseQueryWithRetry` (Retries with Backoff pattern)
- [x] T14: Wire cache settings and tag registry (Cache-aside + Cache Invalidation patterns)
- [x] T15: Implement Dockerfile (multi-stage) and Docker Compose integration
- [x] T16: Implement observability instrumentation (metrics + structured logging)

---

## Task Details

### T00: Install all npm dependencies (production + development)

**Files affected**:
- `pgt/frontend/package.json`

**Description**: After the Vite scaffold is created (T01), install all npm packages required
by the entire SM-FE-01 implementation. Run with `--no-package-lock --legacy-peer-deps` per
PROJECT.md §2 convention.

**Production dependencies** (exact versions):
```
npm install --no-package-lock --legacy-peer-deps \
  @mui/material@5 \
  @mui/icons-material@5 \
  @mui/lab@5 \
  @mui/x-date-pickers@6 \
  @emotion/react@11 \
  @emotion/styled@11 \
  @reduxjs/toolkit@2 \
  react-redux@9 \
  react-router-dom@6 \
  react-hook-form@7 \
  zod@3
```

**Development dependencies** (exact versions):
```
npm install --no-package-lock --legacy-peer-deps --save-dev \
  @testing-library/react@14 \
  @testing-library/user-event@14 \
  @testing-library/jest-dom@6 \
  msw@2 \
  vitest@1 \
  @vitest/ui@1 \
  jsdom@24 \
  @types/react@18 \
  @types/react-dom@18
```

> **Note on test runner**: This project uses **Vitest** (not Jest) because Vite's native
> transform pipeline makes Vitest ~10× faster and eliminates `babel-jest` configuration.
> If the project was previously committed to Jest 29.x (PROJECT.md §2), this represents a
> deliberate switch; update PROJECT.md §2 after this task. The `vitest` package replaces
> `jest`, `ts-jest`, and `jest-environment-jsdom`. `@testing-library/*` packages are
> identical for both runners.

**Acceptance criteria**:
- AC-01: `npm ls --depth=0` (from `pgt/frontend/`) lists all production packages above
  without `UNMET DEPENDENCY` warnings.
- AC-02: `npm ls --depth=0` lists all dev packages above without `UNMET DEPENDENCY` warnings.

**Verification artifacts**:
- AC-01 → CI step: `npm ls --depth=0` exits 0 in the GitHub Actions `install` job
  - Must fail if: any listed production package is missing from `package.json`
- AC-02 → CI step: same `npm ls --depth=0` output checked for dev dependencies
  - Must fail if: any listed dev package is absent

---

### T00b: Set up MSW v2, test runner, and test infrastructure

**Files affected**:
- `pgt/frontend/vitest.config.ts`
- `pgt/frontend/src/setupTests.ts`
- `pgt/frontend/src/mocks/server.ts`
- `pgt/frontend/src/mocks/handlers.ts`
- `pgt/frontend/src/mocks/browser.ts`

**Description**: Configure Vitest and MSW v2 so that all `*.spec.ts(x)` unit tests can run
via `npm test` and `npm run test:coverage` without manual setup. This task is a **hard
prerequisite for T12, T13, T14** (which use MSW mocks to simulate API responses).

`vitest.config.ts`:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
```

`src/setupTests.ts`:
```typescript
import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

`src/mocks/server.ts`:
```typescript
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
export const server = setupServer(...handlers);
```

`src/mocks/handlers.ts`:
```typescript
import { http, HttpResponse } from 'msw';
// Feature test files add handlers via server.use(...) in their describe blocks.
export const handlers: ReturnType<typeof http.get>[] = [];
```

`src/mocks/browser.ts` (for future Storybook / dev server mocking):
```typescript
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';
export const worker = setupWorker(...handlers);
```

**Acceptance criteria**:
- AC-01: `npm test` (with no test files yet present beyond a trivial smoke test) exits 0.
- AC-02: `npm run test:coverage` exits 0 and prints a coverage table.
- AC-03: A test that calls `server.use(http.get('/test', () => HttpResponse.json({})))` can
  intercept `fetch('/test')` and receive the mocked response.

**Verification artifacts**:
- AC-01 → `src/mocks/server.spec.ts::should set up MSW server without errors` (layer: unit — import `server`, assert it is defined)
  - Must fail if: `src/setupTests.ts` is missing or MSW is not installed
- AC-02 → CI step: `npm run test:coverage` exits non-zero if any threshold < 80%
  - Must fail if: `vitest.config.ts` coverage thresholds are removed
- AC-03 → `src/mocks/server.spec.ts::should intercept fetch via MSW handler` (layer: unit)
  - Must fail if: `setupServer` is not wired via `setupTests.ts`

---

### T01: Initialise Vite + React 18 + TypeScript 5 project scaffold

**Files affected**:
- `pgt/frontend/package.json`
- `pgt/frontend/vite.config.ts`
- `pgt/frontend/tsconfig.json`
- `pgt/frontend/.eslintrc.cjs`
- `pgt/frontend/.prettierrc`
- `pgt/frontend/src/index.tsx`
- `pgt/frontend/src/app/App.tsx`
- `pgt/frontend/public/index.html`
- `pgt/frontend/.dockerignore`
- `pgt/frontend/.env.example`

**Description**: Bootstrap the project with `npm create vite@latest frontend -- --template react-ts`.
Configure `tsconfig.json` with `"strict": true`, `"exactOptionalPropertyTypes": true` (matching
`tsconfig.base.json` from the monorepo). Configure ESLint with `@typescript-eslint/recommended`
and Prettier with 2-space indent, single quotes, trailing commas per PROJECT.md §9. Add scripts:
`dev`, `build`, `preview`, `test`, `test:coverage`, `lint`, `type-check`. Target Node.js 20 LTS.

Create `pgt/frontend/.env.example` with:
```
REACT_APP_API_URL=http://localhost:4000
```

**Test runner**: Use **Vitest** (configured in T00b). Update `package.json` `test` script to
`vitest run` and `test:coverage` to `vitest run --coverage`. Do NOT configure Jest — see T00
for rationale.

**Acceptance criteria**:
- AC-01: `npm run build` completes with zero TypeScript errors and zero ESLint errors.
- AC-02: The Vite dev server starts on port 3000 — verified transitively by T15 AC-02 (Docker
  container `curl http://localhost:3000` returns 200), which exercises the same built output.
  No separate manual or integration test is required at this task; T15 is the authoritative
  verification.
- AC-03: `npm run type-check` exits with code 0 on a clean project.

**Verification artifacts**:
- AC-01 → `src/app/App.spec.tsx::should build without TypeScript errors` (layer: unit — runs tsc in test setup)
  - Must fail if: a TypeScript error is introduced (e.g., wrong prop type) and the build check is removed
- AC-02 → Transitively verified by `tests/docker/frontend.health.spec.ts::should serve HTML on port 3000` (T15 AC-02, layer: integration)
  - Must fail if: Vite port is changed or the `dev` / build pipeline breaks
- AC-03 → CI step: `npm run type-check` in GitHub Actions — exits non-zero on type error
  - Must fail if: `strict: true` is removed from `tsconfig.json`

---

### T02: Configure Redux Toolkit store and RTK Query `baseApi`

**Files affected**:
- `pgt/frontend/src/app/store.ts`
- `pgt/frontend/src/app/rootReducer.ts`
- `pgt/frontend/src/api/baseApi.ts`
- `pgt/frontend/src/api/tagTypes.ts`
- `pgt/frontend/src/features/notifications/notificationSlice.ts`

**Description**: Create the Redux store using `configureStore` with `setupListeners`. Define
`TAG_TYPES` constant array in `tagTypes.ts`. Create `baseApi` with `reducerPath: 'api'`,
`tagTypes: TAG_TYPES`, `keepUnusedDataFor: 60`, and an empty `endpoints`. Add `notificationSlice`
with `addNotification` and `removeNotification` actions, and a queue of `{ id, message, severity }`.
Wire both reducers into `rootReducer.ts`.

**Acceptance criteria**:
- AC-01: The store contains `api` (RTK Query cache) and `notifications` slices and no others at
  foundation level.
- AC-02: `baseApi.injectEndpoints` successfully extends the API with a new query endpoint.
- AC-03: `TAG_TYPES` array contains exactly `['BOOKING', 'TRAVELER', 'EXPENSE', 'FLIGHT', 'POLICY', 'PAYMENT_METHOD']`.
- AC-04: `notificationSlice.addNotification` appends a notification to the queue; `removeNotification`
  removes it by id.

**Verification artifacts**:
- AC-01 → `src/app/store.spec.ts::should initialise with api and notifications slices` (layer: unit)
  - Must fail if: a feature slice is prematurely added to the root reducer
- AC-02 → `src/api/baseApi.spec.ts::should allow feature slice to inject endpoints` (layer: unit)
  - Must fail if: `injectEndpoints` is removed from `baseApi` config
- AC-03 → `src/api/tagTypes.spec.ts::should export all required tag types` (layer: unit)
  - Must fail if: any tag type (e.g., `'EXPENSE'`) is removed from `TAG_TYPES`
- AC-04 → `src/features/notifications/notificationSlice.spec.ts::should add and remove notifications` (layer: unit)
  - Must fail if: `addNotification` does not append to the queue

---

### T03: Implement MUI v5 corporate theme

**Files affected**:
- `pgt/frontend/src/theme/theme.ts`
- `pgt/frontend/src/theme/overrides.ts`
- `pgt/frontend/src/app/App.tsx` (wrap with `ThemeProvider`)

**Description**: Create a MUI v5 theme using `createTheme` with a corporate primary colour
(e.g., `#1E3A5F` navy), secondary colour, error/warning/success tokens, Inter/Roboto font stack,
and component overrides for `MuiButton` (border-radius 4px), `MuiTextField`, `MuiCard`, and
`MuiTableCell`. Export the `theme` object. Wrap `App.tsx` with `<ThemeProvider theme={theme}>
<CssBaseline />{children}</ThemeProvider>`.

**Acceptance criteria**:
- AC-01: A rendered `Button` component's background colour matches `theme.palette.primary.main`.
- AC-02: `theme.components.MuiButton.styleOverrides.root.borderRadius` equals `4`.

**Verification artifacts**:
- AC-01 → `src/theme/theme.spec.ts::should apply primary colour to Button` (layer: unit — RTL render + computed style)
  - Must fail if: `ThemeProvider` is removed from `App.tsx` or primary colour is unset
- AC-02 → `src/theme/theme.spec.ts::should have 4px border radius override on MuiButton` (layer: unit)
  - Must fail if: `MuiButton.styleOverrides` is removed from `overrides.ts`

---

### T04: Implement Layout components

**Files affected**:
- `pgt/frontend/src/common/components/Layout/Header.tsx`
- `pgt/frontend/src/common/components/Layout/Sidebar.tsx`
- `pgt/frontend/src/common/components/Layout/Footer.tsx`
- `pgt/frontend/src/common/components/Layout/PageContainer.tsx`
- `pgt/frontend/src/common/components/Layout/Header.spec.tsx`
- `pgt/frontend/src/common/components/Layout/Sidebar.spec.tsx`
- `pgt/frontend/src/common/components/Layout/PageContainer.spec.tsx`

**Description**:
- `PageContainer`: renders `title` in an MUI `Typography` h1, optional `actions` in a flex row, and `children`.
- `Header`: renders app name ("Corporate Travel"), user avatar placeholder, and a menu toggle button that calls `onMenuToggle`. Auth integration (user name, logout) is added by SM-FE-02.
- `Sidebar`: collapsible MUI `Drawer` with `navItems: { label, path, icon }[]` rendered as `ListItem` + `ListItemButton`.
- `Footer`: static copyright text.

**Acceptance criteria**:
- AC-01: `PageContainer` renders `title` prop in an `<h1>` element.
- AC-02: `Header` calls `onMenuToggle` when the menu icon button is clicked.
- AC-03: `Sidebar` renders a `ListItemButton` for each item in `navItems`.

**Verification artifacts**:
- AC-01 → `src/common/components/Layout/PageContainer.spec.tsx::should render title in h1` (layer: unit)
  - Must fail if: title is rendered in `h2` or omitted
- AC-02 → `src/common/components/Layout/Header.spec.tsx::should call onMenuToggle on click` (layer: unit)
  - Must fail if: the menu button's `onClick` is removed
- AC-03 → `src/common/components/Layout/Sidebar.spec.tsx::should render a nav item for each navItems entry` (layer: unit)
  - Must fail if: `navItems` is not iterated

---

### T05: Implement Action components

**Files affected**:
- `pgt/frontend/src/common/components/Button/Button.tsx`
- `pgt/frontend/src/common/components/Button/Button.spec.tsx`
- `pgt/frontend/src/common/components/Button/IconButton.tsx`
- `pgt/frontend/src/common/components/Button/LoadingButton.tsx`
- `pgt/frontend/src/common/components/Button/LoadingButton.spec.tsx`

**Description**:
- `Button`: wraps MUI `Button`. Accepts `variant: 'primary' | 'secondary' | 'danger' | 'ghost'`.
  Maps: primary → `contained+primary`, secondary → `outlined+primary`, danger → `contained+error`,
  ghost → `text`. Passes through all other MUI ButtonProps.
- `IconButton`: wraps MUI `IconButton` with a required `tooltip` prop (MUI `Tooltip` wrapper) for
  accessibility.
- `LoadingButton`: wraps MUI `LoadingButton` (`@mui/lab`). When `loading=true`, button is disabled
  and shows a `CircularProgress` spinner; label is hidden.

**Acceptance criteria**:
- AC-01: `Button variant="primary"` renders MUI `Button` with `variant="contained"` and `color="primary"`.
- AC-02: `Button variant="danger"` renders MUI `Button` with `color="error"`.
- AC-03: `Button variant="ghost"` renders MUI `Button` with `variant="text"`.
- AC-04: `LoadingButton loading={true}` is disabled and shows a spinner; the label text is not visible.
- AC-05: `IconButton` renders a `Tooltip` wrapping the icon button.

**Verification artifacts**:
- AC-01 → `src/common/components/Button/Button.spec.tsx::should render contained primary for variant primary` (layer: unit)
  - Must fail if: variant mapping for `"primary"` is changed
- AC-02 → `src/common/components/Button/Button.spec.tsx::should render error colour for variant danger` (layer: unit)
  - Must fail if: `"danger"` maps to `color="primary"` instead of `"error"`
- AC-03 → `src/common/components/Button/Button.spec.tsx::should render text variant for ghost` (layer: unit)
  - Must fail if: `"ghost"` variant maps to `"contained"`
- AC-04 → `src/common/components/Button/LoadingButton.spec.tsx::should be disabled with spinner when loading is true` (layer: unit)
  - Must fail if: `loading` prop is not forwarded to MUI `LoadingButton`
- AC-05 → `src/common/components/Button/Button.spec.tsx::should wrap IconButton in a Tooltip` (layer: unit)
  - Must fail if: `Tooltip` wrapper is removed from `IconButton`

---

### T06: Implement Form primitive components

**Files affected**:
- `pgt/frontend/src/common/components/Form/FormField.tsx`
- `pgt/frontend/src/common/components/Form/FormField.spec.tsx`
- `pgt/frontend/src/common/components/Form/TextInput.tsx`
- `pgt/frontend/src/common/components/Form/SelectInput.tsx`
- `pgt/frontend/src/common/components/Form/DatePickerInput.tsx`
- `pgt/frontend/src/common/components/Form/NumberInput.tsx`

**Description**:
- `FormField`: renders a container div with `label` (MUI `FormLabel`), `children` slot, and optional
  `error` string (MUI `FormHelperText` in error colour). `required` adds an asterisk.
- `TextInput`: MUI `TextField` (outlined variant). Forwards `name`, `label`, `error`, `helperText`,
  `value`, `onChange`, and remaining `TextFieldProps`.
- `SelectInput`: MUI `Select` inside MUI `FormControl`. `options` prop of `{ value: string, label: string }[]`.
- `DatePickerInput`: MUI X `DatePicker` wrapped in MUI `TextField`. Outputs ISO 8601 string.
- `NumberInput`: `TextInput` with `inputProps={{ inputMode: 'numeric', pattern: '[0-9]*' }}` and
  `type="number"`.

**Acceptance criteria**:
- AC-01: `FormField` with `error="Invalid email"` renders the error text and applies error styling.
- AC-02: `SelectInput` renders one `MenuItem` per entry in `options`.
- AC-03: `DatePickerInput` calls `onChange` with an ISO 8601 string when a date is selected.

**Verification artifacts**:
- AC-01 → `src/common/components/Form/FormField.spec.tsx::should display error message when error prop is set` (layer: unit)
  - Must fail if: `FormHelperText` is not rendered when `error` is provided
- AC-02 → `src/common/components/Form/SelectInput.spec.tsx::should render one MenuItem per option` (layer: unit)
  - Must fail if: `options` array is not iterated in `SelectInput`
- AC-03 → `src/common/components/Form/DatePickerInput.spec.tsx::should call onChange with ISO string` (layer: unit — fire date change event, assert ISO string format)
  - Must fail if: onChange receives a non-ISO format (e.g., `Date` object directly)

---

### T07: Implement Data Display components

**Files affected**:
- `pgt/frontend/src/common/components/DataDisplay/DataTable.tsx`
- `pgt/frontend/src/common/components/DataDisplay/DataTable.spec.tsx`
- `pgt/frontend/src/common/components/DataDisplay/StatusBadge.tsx`
- `pgt/frontend/src/common/components/DataDisplay/StatusBadge.spec.tsx`
- `pgt/frontend/src/common/components/DataDisplay/CurrencyDisplay.tsx`
- `pgt/frontend/src/common/components/DataDisplay/CurrencyDisplay.spec.tsx`
- `pgt/frontend/src/common/components/DataDisplay/Card.tsx`
- `pgt/frontend/src/common/components/DataDisplay/ClickableCard.tsx`

**Description**:
- `DataTable`: MUI `Table` with `TableHead` (column headers with sort icons), `TableBody` (rows from `rows`
  prop), and MUI `TablePagination`. `columns: { key, label, sortable?, render? }[]`. `onSort(key, direction)`
  callback. `loading` shows `Skeleton` rows.
- `StatusBadge`: MUI `Chip` with `label={status}` and `color` derived from `statusColorMap[status]`.
- `CurrencyDisplay`: renders `currency.utils.formatCurrency(amount, currency)` in a `Typography` span.
- `Card`: thin wrapper over MUI `Card` with consistent `padding: 16px` and `elevation: 1` defaults.
- `ClickableCard`: `Card` with `onClick` prop and `selected` state (adds a 2px primary border when selected).

**Acceptance criteria**:
- AC-01: `DataTable` with 10 rows renders exactly 10 `TableRow` elements in the `TableBody`.
- AC-02: `DataTable` with `loading={true}` renders `Skeleton` rows instead of data rows.
- AC-03: Clicking a sortable column header calls `onSort` with the column key and `"asc"` (or `"desc"`
  if already sorted ascending).
- AC-04: `StatusBadge status="CONFIRMED" statusColorMap={{ CONFIRMED: 'success' }}` renders a Chip
  with `color="success"`.
- AC-05: `CurrencyDisplay amount={1234.5} currency="USD"` renders the text `"USD 1,234.50"`.

**Verification artifacts**:
- AC-01 → `src/common/components/DataDisplay/DataTable.spec.tsx::should render correct number of rows` (layer: unit)
  - Must fail if: rows are duplicated or `rows.slice` is applied incorrectly
- AC-02 → `src/common/components/DataDisplay/DataTable.spec.tsx::should render Skeleton rows when loading` (layer: unit)
  - Must fail if: `loading` prop does not trigger skeleton rendering
- AC-03 → `src/common/components/DataDisplay/DataTable.spec.tsx::should call onSort with column key and direction on header click` (layer: unit)
  - Must fail if: `onSort` is not called or receives wrong direction
- AC-04 → `src/common/components/DataDisplay/StatusBadge.spec.tsx::should render Chip with mapped colour` (layer: unit)
  - Must fail if: `statusColorMap` is not applied to the Chip's `color` prop
- AC-05 → `src/common/components/DataDisplay/CurrencyDisplay.spec.tsx::should format USD amount correctly` (layer: unit)
  - Must fail if: `formatCurrency` returns raw number without currency symbol

---

### T08: Implement Feedback components

**Files affected**:
- `pgt/frontend/src/common/components/Feedback/Alert.tsx`
- `pgt/frontend/src/common/components/Feedback/GlobalSnackbar.tsx`
- `pgt/frontend/src/common/components/Feedback/GlobalSnackbar.spec.tsx`
- `pgt/frontend/src/common/components/Feedback/Modal.tsx`
- `pgt/frontend/src/common/components/Feedback/ConfirmDialog.tsx`
- `pgt/frontend/src/common/components/Feedback/ConfirmDialog.spec.tsx`
- `pgt/frontend/src/app/App.tsx` (wire `<GlobalSnackbar />` at app root)

**Description**:
- `Alert`: thin wrapper over MUI `Alert` with `severity`, `message`, optional `onClose`.
- `GlobalSnackbar`: connected to `notificationSlice`. Reads the first notification from the queue,
  renders an MUI `Snackbar` + `Alert` for 4 seconds, then dispatches `removeNotification`.
- `Modal`: MUI `Dialog` with `title` in `DialogTitle`, `children` in `DialogContent`, optional
  `actions` in `DialogActions`. Accessible: `aria-labelledby`, `aria-describedby`.
- `ConfirmDialog`: wraps `Modal`. Renders `message` + "Cancel" / custom `confirmLabel` buttons.
  "Confirm" calls `onConfirm`; "Cancel" and backdrop click call `onClose`. Does NOT call `onConfirm`
  on close.
- **`App.tsx` wiring**: Add `<GlobalSnackbar />` as a sibling to `<ThemeProvider>` children, at
  the app root level (after `<AppRoutes />`), so it renders globally regardless of the current route.

**Acceptance criteria**:
- AC-01: `GlobalSnackbar` renders a `Snackbar` when `notificationSlice` has an item in the queue.
- AC-02: `ConfirmDialog` calls `onConfirm` exactly once when the confirm button is clicked.
- AC-03: `ConfirmDialog` does NOT call `onConfirm` when Cancel is clicked.
- AC-04: `Modal` is accessible — has `role="dialog"` and `aria-labelledby` pointing to the title.

**Verification artifacts**:
- AC-01 → `src/common/components/Feedback/GlobalSnackbar.spec.tsx::should render Snackbar when notification is queued` (layer: unit — provide Redux store with notification)
  - Must fail if: `GlobalSnackbar` does not subscribe to `notificationSlice` state
- AC-02 → `src/common/components/Feedback/ConfirmDialog.spec.tsx::should call onConfirm once on confirm click` (layer: unit)
  - Must fail if: `onConfirm` is called zero or more than once per click
- AC-03 → `src/common/components/Feedback/ConfirmDialog.spec.tsx::should not call onConfirm on cancel click` (layer: unit)
  - Must fail if: cancel button handler calls `onConfirm`
- AC-04 → `src/common/components/Feedback/Modal.spec.tsx::should be accessible with role dialog and aria-labelledby` (layer: unit — RTL accessibility queries)
  - Must fail if: `role="dialog"` or `aria-labelledby` is removed from the Dialog

---

### T09: Implement Loading & Empty state components

**Files affected**:
- `pgt/frontend/src/common/components/Loading/Spinner.tsx`
- `pgt/frontend/src/common/components/Loading/Skeleton.tsx`
- `pgt/frontend/src/common/components/Loading/LoadingOverlay.tsx`
- `pgt/frontend/src/common/components/Loading/LoadingOverlay.spec.tsx`
- `pgt/frontend/src/common/components/Empty/EmptyState.tsx`
- `pgt/frontend/src/common/components/Empty/EmptyState.spec.tsx`
- `pgt/frontend/src/common/components/ErrorBoundary/ErrorBoundary.tsx`
- `pgt/frontend/src/common/components/ErrorBoundary/ErrorBoundary.spec.tsx`

**Description**:
- `Spinner`: centred MUI `CircularProgress` with configurable `size` and `color`.
- `Skeleton`: wraps MUI `Skeleton`. Accepts `variant`, `width`, `height`, `count` (renders N
  skeletons when `count > 1`).
- `LoadingOverlay`: wraps `children` in a `position: relative` container; when `loading=true`,
  renders a semi-transparent white overlay with a centred `Spinner`.
- `EmptyState`: renders a centred column layout with optional `icon`, `title` (bold), `description`,
  and optional `action` node.
- `ErrorBoundary`: React class-based error boundary (hooks cannot be error boundaries). Catches
  errors in `componentDidCatch`; renders `fallback` prop if provided, otherwise a generic
  "Something went wrong" message with a retry button.

**Acceptance criteria**:
- AC-01: `LoadingOverlay loading={true}` renders the overlay and the `Spinner`; `children` are still
  in the DOM but obscured.
- AC-02: `EmptyState` with `action` prop renders the action node.
- AC-03: `ErrorBoundary` renders the fallback UI when a child component throws.
- AC-04: `Skeleton count={3}` renders exactly 3 MUI Skeleton elements.

**Verification artifacts**:
- AC-01 → `src/common/components/Loading/LoadingOverlay.spec.tsx::should show overlay and spinner when loading` (layer: unit)
  - Must fail if: overlay `div` is not rendered when `loading=true`
- AC-02 → `src/common/components/Empty/EmptyState.spec.tsx::should render action node when provided` (layer: unit)
  - Must fail if: `action` prop is not rendered
- AC-03 → `src/common/components/ErrorBoundary/ErrorBoundary.spec.tsx::should render fallback on child throw` (layer: unit — render a throwing component inside boundary)
  - Must fail if: `componentDidCatch` does not set error state triggering fallback
- AC-04 → `src/common/components/Loading/Skeleton.spec.tsx::should render count number of Skeleton elements` (layer: unit)
  - Must fail if: `count` prop is ignored and only one Skeleton renders

---

### T10: Implement common component barrel export, hooks, and utilities

**Files affected**:
- `pgt/frontend/src/common/components/index.ts`
- `pgt/frontend/src/common/hooks/useDebounce.ts`
- `pgt/frontend/src/common/hooks/useDebounce.spec.ts`
- `pgt/frontend/src/common/utils/currency.utils.ts`
- `pgt/frontend/src/common/utils/currency.utils.spec.ts`
- `pgt/frontend/src/common/utils/date.utils.ts`
- `pgt/frontend/src/common/utils/date.utils.spec.ts`
- `pgt/frontend/src/common/utils/api.utils.ts`
- `pgt/frontend/src/common/utils/api.utils.spec.ts`

**Description**:
- `index.ts`: re-exports all components listed in the spec. No feature-specific components.
- `useDebounce`: debounces value changes by `delayMs`. Uses `useEffect` + `setTimeout`.
- `currency.utils.ts`: `formatCurrency(amount, currency, locale?)` → `Intl.NumberFormat` formatted string with currency symbol.
- `date.utils.ts`: `formatDate(iso, format?)`, `isDateInPast(iso)`, `addDays(iso, days)`.
- `api.utils.ts`: `extractCorrelationId(headers)` reads `x-correlation-id` header; `buildQueryString(params)` serialises to `?key=value` omitting `undefined`/`null`.

**Acceptance criteria**:
- AC-01: All 25+ components are exported from `src/common/components/index.ts` and are not `undefined`.
- AC-02: `useDebounce("test", 300)` returns the debounced value after 300ms delay, not immediately.
- AC-03: `formatCurrency(1234.5, "USD")` returns a string containing `"1,234.50"` and `"USD"`.
- AC-04: `buildQueryString({ page: 1, limit: undefined })` returns `"?page=1"` (omits undefined).
- AC-05: `isDateInPast("2020-01-01T00:00:00Z")` returns `true`.

**Verification artifacts**:
- AC-01 → `src/common/components/index.spec.ts::should export all required components` (layer: unit)
  - Must fail if: any component is missing from the barrel export
- AC-02 → `src/common/hooks/useDebounce.spec.ts::should return debounced value after delay` (layer: unit — jest fake timers)
  - Must fail if: `useDebounce` returns value immediately without delay
- AC-03 → `src/common/utils/currency.utils.spec.ts::should format USD amount with symbol and thousands separator` (layer: unit)
  - Must fail if: `Intl.NumberFormat` is not used or currency symbol is omitted
- AC-04 → `src/common/utils/api.utils.spec.ts::should omit undefined values from query string` (layer: unit)
  - Must fail if: undefined values are included as `"undefined"` in the query string
- AC-05 → `src/common/utils/date.utils.spec.ts::should return true for past date` (layer: unit)
  - Must fail if: comparison uses local timezone incorrectly

---

### T11: Implement React Router v6 configuration and PrivateRoute

**Files affected**:
- `pgt/frontend/src/routes/routes.config.ts`
- `pgt/frontend/src/routes/AppRoutes.tsx`
- `pgt/frontend/src/routes/PrivateRoute.tsx`
- `pgt/frontend/src/routes/PrivateRoute.spec.tsx`

**Description**:
- `routes.config.ts`: exports `ROUTES` constant with paths: `/` (dashboard), `/login`, `/search`,
  `/bookings`, `/bookings/:id`, `/profile`, `/expenses`. Protected vs public marked per route.
- `AppRoutes.tsx`: uses `<Routes>` + `<Route>`. Protected routes wrapped in `PrivateRoute`.
  Public route: `/login` renders a placeholder `<LoginPage />` (stub, replaced in SM-FE-02).
  Protected routes render placeholder components until feature modules are delivered.
- `PrivateRoute.tsx`: reads `auth.accessToken` from Redux store. If `null`, renders
  `<Navigate to="/login" state={{ from: location }} replace />`. Otherwise renders `<Outlet />`.

**Acceptance criteria**:
- AC-01: `PrivateRoute` redirects to `/login` when `auth.accessToken` is `null` in the store.
- AC-02: `PrivateRoute` renders `<Outlet />` when `auth.accessToken` is a non-null string.
- AC-03: `/login` route is accessible without authentication (no redirect loop).

**Verification artifacts**:
- AC-01 → `src/routes/PrivateRoute.spec.tsx::should redirect to /login when unauthenticated` (layer: unit — RTL + MemoryRouter with store providing null token)
  - Must fail if: `PrivateRoute` renders children when `accessToken` is null
- AC-02 → `src/routes/PrivateRoute.spec.tsx::should render Outlet when authenticated` (layer: unit — store with valid token string)
  - Must fail if: authenticated users are redirected to login
- AC-03 → `src/routes/PrivateRoute.spec.tsx::should not redirect when on /login route` (layer: unit)
  - Must fail if: `/login` is accidentally wrapped in `PrivateRoute`

---

### T12: Implement `baseQueryWithTimeout` (Timeouts pattern)

**Files affected**:
- `pgt/frontend/src/api/baseQueryWithTimeout.ts`
- `pgt/frontend/src/api/baseQueryWithTimeout.spec.ts`

**Description**: Implements `baseQueryWithTimeout` as described in `design.md` §Resilience.
Uses `AbortController` with a 10s timeout. Exported constant `REQUEST_TIMEOUT_MS = 10_000`.
The `AbortController` signal is merged with any existing signal in `extraOptions`.

**Acceptance criteria**:
- AC-01: A request that resolves within 10s returns the result normally.
- AC-02: A request that takes longer than 10s is aborted; the result is
  `{ error: { status: 'FETCH_ERROR', error: 'AbortError' } }`.
- AC-03: `REQUEST_TIMEOUT_MS` is exported and equals `10000`.

**Verification artifacts**:
- AC-01 → `src/api/baseQueryWithTimeout.spec.ts::should return result when request completes within timeout` (layer: unit — MSW mock responding in 1ms)
  - Must fail if: `AbortController` fires before the request resolves
- AC-02 → `src/api/baseQueryWithTimeout.spec.ts::should abort request after 10 seconds` (layer: unit — jest fake timers + MSW mock that never responds)
  - Must fail if: `AbortController.abort()` is not called after `REQUEST_TIMEOUT_MS`
- AC-03 → `src/api/baseQueryWithTimeout.spec.ts::REQUEST_TIMEOUT_MS should equal 10000` (layer: unit)
  - Must fail if: the constant is changed to a different value

---

### T13: Implement `baseQueryWithRetry` (Retries with Backoff pattern)

**Files affected**:
- `pgt/frontend/src/api/baseQueryWithRetry.ts`
- `pgt/frontend/src/api/baseQueryWithRetry.spec.ts`

**Description**: Implements `baseQueryWithRetry` as described in `design.md` §Resilience.
Constants: `MAX_RETRIES = 3`, `BASE_DELAY_MS = 200`, `MAX_DELAY_MS = 5000`,
`TOTAL_DEADLINE_MS = 30_000`, `RETRYABLE_STATUSES = [408, 500, 502, 503, 504]`,
`SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS']`.

**Retry scope**: Only `SAFE_METHODS` are retried by default. POST, PATCH, PUT, DELETE return
immediately on any error to prevent duplicate side-effects (e.g., duplicate bookings or
double-charges). Callers may set `extraOptions.allowRetry = true` to opt a mutation into
retry — this option is reserved for SM-FE-02+ mutations that attach an Idempotency-Key header.

Does NOT retry on `AbortError` or non-retryable codes (400, 401, 403, 404, 422).

**Acceptance criteria**:
- AC-01: On first GET 503 then GET 200, returns successful result after 1 retry.
- AC-02: On 4 consecutive GET 503 responses, returns the final error after 3 retries.
- AC-03: On HTTP 400 (any method), returns error immediately with zero retries.
- AC-04: On `AbortError` (any method), returns error immediately with zero retries.
- AC-05: On POST 503, returns error immediately with zero retries (no retry for non-GET).

**Verification artifacts**:
- AC-01 → `src/api/baseQueryWithRetry.spec.ts::should succeed after one retry on GET 503` (layer: unit — mock baseQuery returning 503 once then 200 for GET)
  - Must fail if: retry logic is not implemented
- AC-02 → `src/api/baseQueryWithRetry.spec.ts::should return error after MAX_RETRIES exhausted on GET` (layer: unit — mock GET always 503)
  - Must fail if: retries exceed `MAX_RETRIES` (loop doesn't terminate)
- AC-03 → `src/api/baseQueryWithRetry.spec.ts::should not retry on 400` (layer: unit — mock returns 400)
  - Must fail if: 400 is added to `RETRYABLE_STATUSES`
- AC-04 → `src/api/baseQueryWithRetry.spec.ts::should not retry on AbortError` (layer: unit — mock returns AbortError)
  - Must fail if: AbortError check is removed from retry guard
- AC-05 → `src/api/baseQueryWithRetry.spec.ts::should not retry POST on 503` (layer: unit — mock POST returns 503)
  - Must fail if: SAFE_METHODS check is removed and POST is retried

---

### T14: Wire cache settings and tag registry (Cache-aside + Cache Invalidation)

**Files affected**:
- `pgt/frontend/src/api/baseApi.ts` (update `keepUnusedDataFor: 60`, verify `tagTypes`)
- `pgt/frontend/src/api/tagTypes.ts` (finalise registry)
- `pgt/frontend/src/api/baseApi.spec.ts` (add cache + tag tests)

**Description**: Confirm `baseApi` is configured with `keepUnusedDataFor: 60` (global default).
Verify `TAG_TYPES` contains all six types. Add integration test for tag-based invalidation:
inject two endpoints (a query with `providesTags` and a mutation with `invalidatesTags`),
run the query, fire the mutation, assert the query result is evicted from cache.

**Acceptance criteria**:
- AC-01: `baseApi.keepUnusedDataFor` equals `60`.
- AC-02: `baseApi.tagTypes` contains all six tag types.
- AC-03: After a mutation invalidates `[{ type: 'BOOKING', id: '1' }]`, the cached result of a
  query providing that tag is evicted (next mount triggers a new fetch).

**Verification artifacts**:
- AC-01 → `src/api/baseApi.spec.ts::should have keepUnusedDataFor of 60 seconds` (layer: unit)
  - Must fail if: `keepUnusedDataFor` is set to a different value
- AC-02 → `src/api/tagTypes.spec.ts::should contain all required tag types` (layer: unit)
  - Must fail if: a tag type is missing from the registry
- AC-03 → `src/api/baseApi.spec.ts::should evict cache entry after mutation invalidates tag` (layer: integration — MSW + renderHook)
  - Must fail if: `invalidatesTags` does not trigger cache eviction

---

### T15: Implement Dockerfile (multi-stage) and Docker Compose integration

**Files affected**:
- `pgt/frontend/Dockerfile`
- `pgt/frontend/nginx.conf`
- `pgt/frontend/docker-entrypoint.sh`
- `pgt/docker-compose.yml` (add `frontend` service)
- `pgt/frontend/.dockerignore`

**Description**:
- `Dockerfile`: Stage 1 — `node:20-alpine` builder: copies `package.json`, runs `npm install --no-package-lock --legacy-peer-deps`, copies source, runs `npm run build` → `dist/`.
  Stage 2 — `nginx:stable-alpine`: copies `dist/` to `/usr/share/nginx/html/`, copies `nginx.conf`.
  `docker-entrypoint.sh` generates `env-config.js` from env vars before starting Nginx.
- `nginx.conf`: serves SPA with `try_files $uri /index.html` fallback; sets CSP header.
- `docker-compose.yml`: add `frontend` service — image build from `pgt/` context, Dockerfile
  `pgt/frontend/Dockerfile`, port `3000:80`, env `REACT_APP_API_URL=http://api-gateway:4000`,
  network `travel-portal`, `depends_on: [api-gateway]`.

**Acceptance criteria**:
- AC-01: `docker build -t frontend .` (from `pgt/` context) succeeds with no errors.
- AC-02: `curl http://localhost:3000` returns HTTP 200 with `<div id="root">` in the response body.
- AC-03: `curl http://localhost:3000/env-config.js` returns JS containing `window.__ENV__` with
  the configured `REACT_APP_API_URL`.
- AC-04: `curl http://localhost:3000/non-existent-route` returns HTTP 200 (SPA fallback to `index.html`).

**Verification artifacts**:
- AC-01 → CI step: `docker build -t travel-portal/frontend .` — exits non-zero on build failure
  - Must fail if: Dockerfile has a syntax error or `npm run build` fails
- AC-02 → `tests/docker/frontend.health.spec.ts::should serve HTML on port 3000` (layer: integration — spin up container, curl)
  - Must fail if: Nginx is not configured to serve `dist/`
- AC-03 → `tests/docker/frontend.health.spec.ts::should serve env-config.js with API URL` (layer: integration)
  - Must fail if: `docker-entrypoint.sh` does not generate `env-config.js`
- AC-04 → `tests/docker/frontend.health.spec.ts::should fallback to index.html for unknown routes` (layer: integration)
  - Must fail if: `try_files` directive is missing from `nginx.conf`

---

### T16: Implement observability instrumentation

**Files affected**:
- `pgt/frontend/src/api/metrics.ts`
- `pgt/frontend/src/api/baseQueryWithRetry.ts` (add metric emissions)
- `pgt/frontend/src/api/baseQueryWithTimeout.ts` (add metric emissions)
- `pgt/frontend/src/api/metrics.spec.ts`

**Description**: Implement a lightweight `metrics.ts` module that maintains in-memory counters and
histograms (`frontend_api_requests_total`, `frontend_api_retry_total`,
`frontend_api_request_duration_ms`, `frontend_cache_hit_total`, `frontend_cache_miss_total`).
In production (when `window.__ENV__.METRICS_ENDPOINT` is set), flush counters every 30s via
`POST` to the metrics endpoint. In development, write to `console.debug`. Add emissions to
`baseQueryWithRetry` (retry counter per attempt) and `baseQueryWithTimeout` (duration + requests
total). RTK Query `onCacheEntryAdded` middleware pattern instruments cache hit/miss.
Also add structured logging helper that emits JSON to console with the required fields from
PROJECT.md §8.

**Acceptance criteria**:
- AC-01: `frontend_api_retry_total` is incremented once per retry attempt.
- AC-02: `frontend_api_requests_total` is incremented once per completed request (after all retries).
- AC-03: `frontend_api_request_duration_ms` is recorded for each request.
- AC-04: The structured logger produces JSON with `timestamp`, `level`, `service: "frontend"`,
  `correlationId`, `message`, and `context` fields.

**Verification artifacts**:
- AC-01 → `src/api/metrics.spec.ts::should increment retry counter on each retry attempt` (layer: unit — mock baseQueryWithRetry, spy on metrics)
  - Must fail if: retry metric emission is removed from `baseQueryWithRetry`
- AC-02 → `src/api/metrics.spec.ts::should increment requests total once per call` (layer: unit)
  - Must fail if: the final-result metric emission is removed
- AC-03 → `src/api/metrics.spec.ts::should record duration for each request` (layer: unit — `performance.now()` mock)
  - Must fail if: duration measurement start/end is removed
- AC-04 → `src/api/logger.spec.ts::should emit JSON log with all required fields` (layer: unit — spy on console.debug)
  - Must fail if: any required field (`correlationId`, `service`, `timestamp`) is removed from the log payload
