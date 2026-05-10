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
import { ProfileForm } from './ProfileForm';
import type { TravelerProfile } from '../profile.types';

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

function renderForm(profile = mockProfile) {
  const store = makeStore();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <ProfileForm profile={profile} />
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

describe('ProfileForm', () => {
  it('REQ-PROFILE-FORM-S01: renders editable fields and read-only fields', () => {
    renderForm();

    // Editable inputs present
    expect(screen.getByTestId('field-department')).toBeDefined();
    expect(screen.getByTestId('field-jobTitle')).toBeDefined();
    expect(screen.getByTestId('field-costCenter')).toBeDefined();

    // Read-only email field present
    const emailInput = screen.getByTestId('field-email').querySelector('input');
    expect(emailInput).not.toBeNull();
    expect(emailInput?.readOnly).toBe(true);
  });

  it('REQ-PROFILE-FORM-S02: submit calls updateTraveler with updated fields', async () => {
    let capturedBody: unknown = null;
    server.use(
      http.patch('http://localhost/api/travelers/:id', async ({ request }) => {
        capturedBody = await request.json();
        return HttpResponse.json({ ...mockProfile, department: 'Finance' });
      }),
    );

    renderForm();

    const deptInput = screen
      .getByTestId('field-department')
      .querySelector('input');
    if (deptInput) {
      fireEvent.change(deptInput, { target: { value: 'Finance' } });
    }

    fireEvent.click(screen.getByTestId('profile-submit'));

    await waitFor(() => {
      expect(capturedBody).not.toBeNull();
      expect((capturedBody as Record<string, unknown>).department).toBe('Finance');
    });
  });

  it('REQ-PROFILE-FORM-S03: loading state disables submit button', async () => {
    let resolveRequest: (() => void) | null = null;
    server.use(
      http.patch('http://localhost/api/travelers/:id', () =>
        new Promise<Response>((resolve) => {
          resolveRequest = () => resolve(HttpResponse.json(mockProfile) as unknown as Response);
        }),
      ),
    );

    renderForm();

    const deptInput = screen
      .getByTestId('field-department')
      .querySelector('input');
    if (deptInput) {
      fireEvent.change(deptInput, { target: { value: 'HR' } });
    }

    fireEvent.click(screen.getByTestId('profile-submit'));

    await waitFor(() => {
      const btn = screen.getByTestId('profile-submit') as HTMLButtonElement;
      expect(btn.disabled).toBe(true);
    });

    resolveRequest?.();
  });
});
