import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer, setCredentials } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer } from '../../search/searchSlice';
import { bookingReducer } from '../../booking/bookingSlice';
import { profileReducer } from '../../profile/profileSlice';
import { ExpenseListPage } from '../pages/ExpenseListPage';
import type { ReceiptListResponse } from '../expense.types';

function makeStore(role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' = 'EMPLOYEE') {
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
      user: { id: 'traveler-1', email: 'alice@corp.com', role, exp: 9999999999, iat: 1000000000 },
    }),
  );
  return store;
}

function renderPage(role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN' = 'EMPLOYEE') {
  return render(
    <Provider store={makeStore(role)}>
      <MemoryRouter>
        <ExpenseListPage />
      </MemoryRouter>
    </Provider>,
  );
}

const emptyResponse: ReceiptListResponse = {
  receipts: [],
  pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 20 },
};

describe('ExpenseListPage', () => {
  it('REQ-EXPENSES-05-S01: employee auto-filters by travelerId', async () => {
    let capturedUrl: string | null = null;
    server.use(
      http.get('http://localhost/api/receipts', ({ request }) => {
        capturedUrl = request.url;
        return HttpResponse.json<ReceiptListResponse>(emptyResponse);
      }),
    );

    renderPage('EMPLOYEE');

    await waitFor(() => {
      expect(capturedUrl).toContain('travelerId=traveler-1');
    });
  });

  it('REQ-EXPENSES-05-S02: admin sees date/department filter inputs', async () => {
    server.use(
      http.get('http://localhost/api/receipts', () =>
        HttpResponse.json<ReceiptListResponse>(emptyResponse),
      ),
    );

    renderPage('ADMIN');

    await waitFor(() => {
      expect(screen.getByTestId('filter-start-date')).toBeInTheDocument();
      expect(screen.getByTestId('filter-end-date')).toBeInTheDocument();
    });
  });

  it('REQ-EXPENSES-05-S03: shows skeleton while loading', () => {
    server.use(
      http.get('http://localhost/api/receipts', async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json<ReceiptListResponse>(emptyResponse);
      }),
    );

    renderPage('EMPLOYEE');
    expect(screen.getByTestId('expense-list-page')).toBeInTheDocument();
  });
});
