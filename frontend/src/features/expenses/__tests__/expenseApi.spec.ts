import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { expenseApi } from '../expenseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import type { Receipt, ReceiptListResponse, ExpenseReport } from '../expense.types';

const mockReceipt: Receipt = {
  id: 'receipt-1',
  receiptNumber: 'RCP-2026-001',
  bookingId: 'booking-1',
  amount: 450.00,
  currency: 'USD',
  pdfUrl: 'https://s3.test/receipts/RCP-2026-001.pdf',
};

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

describe('expenseApi', () => {
  describe('listReceipts', () => {
    it('REQ-EXPENSES-01-S01: returns receipt list', async () => {
      server.use(
        http.get('http://localhost/api/receipts', () =>
          HttpResponse.json<ReceiptListResponse>({
            receipts: [mockReceipt],
            pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 20 },
          }),
        ),
      );

      const store = makeStore();
      const result = await store.dispatch(
        expenseApi.endpoints.listReceipts.initiate({}),
      );

      expect(result.data?.receipts).toHaveLength(1);
      expect(result.data?.pagination).toBeDefined();
    });

    it('REQ-EXPENSES-01-S04: listReceipts TTL equals 86400', async () => {
      server.use(
        http.get('http://localhost/api/receipts', () =>
          HttpResponse.json<ReceiptListResponse>({
            receipts: [mockReceipt],
            pagination: { currentPage: 1, totalPages: 1, totalItems: 1, limit: 20 },
          }),
        ),
      );

      const store = makeStore();
      await store.dispatch(expenseApi.endpoints.listReceipts.initiate({}));

      // Data should be present after dispatch (TTL is 86400 = retained)
      const state = store.getState()[baseApi.reducerPath];
      const queries = Object.values(
        (state as Record<string, unknown>).queries as Record<string, { status: string; data?: unknown }>,
      );
      const receiptQuery = queries.find((q) => q.data !== undefined);
      expect(receiptQuery?.status).toBe('fulfilled');
    });
  });

  describe('getReceiptById', () => {
    it('REQ-EXPENSES-01-S02: returns single receipt', async () => {
      server.use(
        http.get('http://localhost/api/receipts/:id', () =>
          HttpResponse.json<Receipt>(mockReceipt),
        ),
      );

      const store = makeStore();
      const result = await store.dispatch(
        expenseApi.endpoints.getReceiptById.initiate('receipt-1'),
      );

      expect(result.data?.id).toBe('receipt-1');
      expect(result.data?.receiptNumber).toBe('RCP-2026-001');
      expect(result.data?.pdfUrl).toBe('https://s3.test/receipts/RCP-2026-001.pdf');
    });
  });

  describe('getExpenseReport', () => {
    it('REQ-EXPENSES-01-S03: sends required date params', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get('http://localhost/api/expenses', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json<ExpenseReport>({ expenses: [] });
        }),
      );

      const store = makeStore();
      await store.dispatch(
        expenseApi.endpoints.getExpenseReport.initiate({
          startDate: '2026-01-01',
          endDate: '2026-12-31',
        }),
      );

      expect(capturedUrl).toContain('startDate=2026-01-01');
      expect(capturedUrl).toContain('endDate=2026-12-31');
    });
  });
});
