import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { profileReducer } from '../profileSlice';
import { TravelerTable } from './TravelerTable';
import type { TravelerListResponse, TravelerProfile } from '../profile.types';

const mockTraveler: TravelerProfile = {
  id: 'traveler-1',
  employeeId: 'EMP-001',
  email: 'alice@corp.com',
  firstName: 'Alice',
  lastName: 'Smith',
  fullName: 'Alice Smith',
  department: 'Engineering',
  jobTitle: 'Senior Engineer',
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

function renderTable() {
  const store = makeStore();
  render(
    <Provider store={store}>
      <MemoryRouter>
        <TravelerTable />
      </MemoryRouter>
    </Provider>,
  );
  return { store };
}

describe('TravelerTable', () => {
  it('REQ-TRAVELER-TABLE-S01: renders rows when MSW returns travelers', async () => {
    server.use(
      http.get('http://localhost/api/travelers', () =>
        HttpResponse.json<TravelerListResponse>({
          travelers: [
            mockTraveler,
            { ...mockTraveler, id: 'traveler-2', email: 'bob@corp.com', fullName: 'Bob Jones' },
            { ...mockTraveler, id: 'traveler-3', email: 'carol@corp.com', fullName: 'Carol Lee' },
          ],
          pagination: { currentPage: 1, totalPages: 1, totalItems: 3, limit: 20 },
        }),
      ),
    );

    renderTable();

    await waitFor(() => {
      expect(screen.getByText('Alice Smith')).toBeDefined();
      expect(screen.getByText('Bob Jones')).toBeDefined();
      expect(screen.getByText('Carol Lee')).toBeDefined();
    });
  });

  it('REQ-TRAVELER-TABLE-S02: shows empty state when no travelers returned', async () => {
    server.use(
      http.get('http://localhost/api/travelers', () =>
        HttpResponse.json<TravelerListResponse>({
          travelers: [],
          pagination: { currentPage: 1, totalPages: 0, totalItems: 0, limit: 20 },
        }),
      ),
    );

    renderTable();

    await waitFor(() => {
      expect(screen.getByTestId('traveler-empty')).toBeDefined();
    });
  });
});
