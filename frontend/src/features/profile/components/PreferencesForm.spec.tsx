import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { profileReducer } from '../profileSlice';
import { PreferencesForm } from './PreferencesForm';
import type { TravelerPreferences } from '../profile.types';

const mockPrefs: TravelerPreferences = {
  seatPreference: 'WINDOW',
  mealPreference: 'STANDARD',
  specialRequests: '',
  frequentFlyerNumbers: [],
  loyaltyPrograms: [],
  notifications: { email: true, sms: false },
};

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
      profile: profileReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

function renderForm(prefs = mockPrefs) {
  const store = makeStore();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <PreferencesForm travelerId="traveler-1" preferences={prefs} />
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

describe('PreferencesForm', () => {
  it('REQ-PREFS-FORM-S01: renders seat and meal preference controls', () => {
    renderForm();
    expect(screen.getByTestId('field-seatPreference')).toBeDefined();
    expect(screen.getByTestId('field-mealPreference')).toBeDefined();
  });

  it('REQ-PREFS-FORM-S02: submit calls updateTravelerPreferences', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.put('http://localhost/api/travelers/:id/preferences', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...mockPrefs, seatPreference: 'AISLE' });
      }),
    );

    renderForm();

    fireEvent.click(screen.getByTestId('prefs-submit'));

    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
    });
  });
});
