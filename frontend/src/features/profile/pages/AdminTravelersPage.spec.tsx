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
import { profileReducer } from '../profileSlice';
import { AdminTravelersPage } from './AdminTravelersPage';
import type { TravelerListResponse } from '../profile.types';

const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@corp.com',
  role: 'ADMIN' as const,
  exp: 9999999999,
  iat: 1000000000,
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

describe('AdminTravelersPage', () => {
  it('REQ-ADMIN-PAGE-S01: renders with data-testid admin-travelers-page', async () => {
    server.use(
      http.get('http://localhost/api/travelers', () =>
        HttpResponse.json<TravelerListResponse>({
          travelers: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 20 },
        }),
      ),
    );

    const store = makeStore();
    store.dispatch(
      setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresIn: 28800,
        user: mockAdminUser,
      }),
    );

    render(
      <Provider store={store}>
        <MemoryRouter>
          <AdminTravelersPage />
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByTestId('admin-travelers-page')).toBeDefined();
    expect(screen.getByText('Traveler Administration')).toBeDefined();
  });
});
