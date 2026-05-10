import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer } from '../../search/searchSlice';
import { bookingReducer } from '../../booking/bookingSlice';
import { profileReducer } from '../../profile/profileSlice';
import { ReceiptPage } from '../pages/ReceiptPage';
import type { Receipt } from '../expense.types';

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
      search: searchReducer,
      booking: bookingReducer,
      profile: profileReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

function renderPage(receiptId: string) {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[`/expenses/receipts/${receiptId}`]}>
        <Routes>
          <Route path="/expenses/receipts/:receiptId" element={<ReceiptPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('ReceiptPage', () => {
  it('REQ-EXPENSES-06-S01: renders receipt details on success', async () => {
    server.use(
      http.get('http://localhost/api/receipts/:id', () =>
        HttpResponse.json<Receipt>(mockReceipt),
      ),
    );

    renderPage('receipt-1');

    await waitFor(() => {
      expect(screen.getByTestId('receipt-page')).toBeInTheDocument();
      expect(screen.getByTestId('receipt-details')).toBeInTheDocument();
    });
  });

  it('REQ-EXPENSES-06-S02: shows error alert on 404', async () => {
    server.use(
      http.get('http://localhost/api/receipts/:id', () =>
        new HttpResponse(null, { status: 404 }),
      ),
    );

    renderPage('bad-id');

    await waitFor(() => {
      expect(screen.getByTestId('receipt-page')).toBeInTheDocument();
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
