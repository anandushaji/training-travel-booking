import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
import { ProfilePage } from './ProfilePage';
import type { TravelerProfile, TravelerPreferences } from '../profile.types';

const mockUser = {
  id: 'traveler-1',
  email: 'alice@corp.com',
  role: 'EMPLOYEE' as const,
  exp: 9999999999,
  iat: 1000000000,
};

const mockProfile: TravelerProfile = {
  id: 'traveler-1',
  employeeId: 'EMP-001',
  email: 'alice@corp.com',
  firstName: 'Alice',
  lastName: 'Smith',
  fullName: 'Alice Smith',
  department: 'Engineering',
  jobTitle: 'Senior Engineer',
  costCenter: 'CC-ENG-001',
  approvalRequired: false,
  active: true,
};

const mockPrefs: TravelerPreferences = {
  seatPreference: 'WINDOW',
  mealPreference: 'STANDARD',
  notifications: { email: true, sms: false },
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

function renderPage() {
  const store = makeStore();
  store.dispatch(
    setCredentials({
      accessToken: 'test-token',
      refreshToken: 'test-refresh',
      expiresIn: 28800,
      user: mockUser,
    }),
  );

  render(
    <Provider store={store}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </Provider>,
  );

  return { store };
}

describe('ProfilePage', () => {
  it('REQ-PROFILE-PAGE-S01: Profile tab is active by default and ProfileForm is visible', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('profile-form')).toBeDefined();
    });

    expect(screen.getByTestId('tab-profile')).toBeDefined();
  });

  it('REQ-PROFILE-PAGE-S02: Preferences tab click shows PreferencesForm', async () => {
    renderPage();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('tab-preferences')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('tab-preferences'));

    await waitFor(() => {
      expect(screen.getByTestId('preferences-form')).toBeDefined();
    });
  });

  it('REQ-PROFILE-PAGE-S03: GDPR export link is in the DOM', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('gdpr-export-link')).toBeDefined();
    });
  });

  it('REQ-PROFILE-PAGE-S04: GDPR delete flow — calls deleteTraveler and dispatches logout', async () => {
    let deleteCallCount = 0;
    server.use(
      http.delete('http://localhost/api/travelers/:id', () => {
        deleteCallCount++;
        return new HttpResponse(null, { status: 200 });
      }),
    );

    const { store } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('delete-account-button')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('delete-account-button'));

    // Confirm dialog should open — click confirm
    await waitFor(() => {
      expect(screen.getByText(/Yes, Delete My Account/i)).toBeDefined();
    });

    fireEvent.click(screen.getByText(/Yes, Delete My Account/i));

    await waitFor(() => {
      expect(deleteCallCount).toBe(1);
      // After logout, auth state is cleared
      expect(store.getState().auth.isAuthenticated).toBe(false);
    });
  });
});
