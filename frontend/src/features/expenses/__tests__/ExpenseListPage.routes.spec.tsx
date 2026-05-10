import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer, setCredentials } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer } from '../../search/searchSlice';
import { bookingReducer } from '../../booking/bookingSlice';
import { profileReducer } from '../../profile/profileSlice';
import { ExpenseListPage } from '../pages/ExpenseListPage';
import { ReceiptPage } from '../pages/ReceiptPage';
import type { ReceiptListResponse, Receipt } from '../expense.types';

const emptyReceipts: ReceiptListResponse = {
  receipts: [],
  pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 20 },
};

const mockReceipt: Receipt = {
  id: 'receipt-1',
  receiptNumber: 'RCP-2026-001',
  bookingId: 'booking-1',
  amount: 450.00,
  currency: 'USD',
  pdfUrl: 'https://s3.test/receipts/RCP-2026-001.pdf',
};

function makeStore() {
  const store = configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
      search: searchReducer,
      booking: bookingReducer,
      profile: profileReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
  store.dispatch(
    setCredentials({
      accessToken: 'test-token',
      refreshToken: 'refresh-token',
      expiresIn: 28800,
      user: { id: 'traveler-1', email: 'alice@corp.com', role: 'EMPLOYEE' as const, exp: 9999999999, iat: 1000000000 },
    }),
  );
  return store;
}

describe('Expense routes', () => {
  it('REQ-EXPENSES-07-S01: /expenses renders ExpenseListPage', async () => {
    server.use(
      http.get('http://localhost/api/receipts', () =>
        HttpResponse.json<ReceiptListResponse>(emptyReceipts),
      ),
    );

    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/expenses']}>
          <Routes>
            <Route path="/expenses" element={<ExpenseListPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('expense-list-page')).toBeInTheDocument();
    });
  });

  it('REQ-EXPENSES-07-S02: /expenses/receipts/:id renders ReceiptPage', async () => {
    server.use(
      http.get('http://localhost/api/receipts/:id', () =>
        HttpResponse.json<Receipt>(mockReceipt),
      ),
    );

    render(
      <Provider store={makeStore()}>
        <MemoryRouter initialEntries={['/expenses/receipts/receipt-1']}>
          <Routes>
            <Route path="/expenses/receipts/:receiptId" element={<ReceiptPage />} />
          </Routes>
        </MemoryRouter>
      </Provider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId('receipt-page')).toBeInTheDocument();
    });
  });
});
