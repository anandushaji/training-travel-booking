import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { baseApi } from '../api/baseApi';
import { authReducer, setCredentials } from '../features/auth/authSlice';
import notificationsReducer from '../features/notifications/notificationSlice';
import { searchReducer } from '../features/search/searchSlice';
import { bookingReducer } from '../features/booking/bookingSlice';
import { profileReducer } from '../features/profile/profileSlice';
import { AppRoutes } from './AppRoutes';

const employeeUser = {
  id: 'traveler-1',
  email: 'alice@corp.com',
  role: 'EMPLOYEE' as const,
  exp: 9999999999,
  iat: 1000000000,
};

const adminUser = {
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

function renderAt(path: string, user?: typeof employeeUser) {
  const store = makeStore();
  if (user) {
    store.dispatch(
      setCredentials({
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        expiresIn: 28800,
        user,
      }),
    );
  }
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

describe('AppRoutes', () => {
  it('REQ-ROUTE-PROFILE-S01: /profile renders ProfilePage', async () => {
    renderAt('/profile', employeeUser);
    await waitFor(() => {
      expect(screen.getByTestId('profile-page')).toBeDefined();
    });
  });

  it('REQ-ROUTE-ADMIN-S01: /admin/travelers renders AdminTravelersPage for ADMIN user', async () => {
    renderAt('/admin/travelers', adminUser);
    await waitFor(() => {
      expect(screen.getByTestId('admin-travelers-page')).toBeDefined();
    });
  });

  it('REQ-ROUTE-ADMIN-S02: /admin/travelers renders nothing (RoleGuard blocks) for EMPLOYEE user', async () => {
    renderAt('/admin/travelers', employeeUser);
    await waitFor(() => {
      expect(screen.queryByTestId('admin-travelers-page')).toBeNull();
    });
  });
});
