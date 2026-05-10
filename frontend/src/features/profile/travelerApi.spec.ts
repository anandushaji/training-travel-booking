import { describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { baseApi } from '../../api/baseApi';
import { travelerApi } from './travelerApi';
import { authReducer } from '../auth/authSlice';
import notificationsReducer from '../notifications/notificationSlice';
import { profileReducer } from './profileSlice';
import type { TravelerProfile, TravelerPreferences } from './profile.types';

const mockTraveler: TravelerProfile = {
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

describe('travelerApi', () => {
  describe('getTravelerById', () => {
    it('REQ-PROFILE-01-S01: sends GET /api/travelers/:id', async () => {
      let capturedUrl: string | null = null;
      server.use(
        http.get('http://localhost/api/travelers/:id', ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json<TravelerProfile>(mockTraveler);
        }),
      );

      const store = makeStore();
      await store.dispatch(
        travelerApi.endpoints.getTravelerById.initiate('traveler-1'),
      );

      expect(capturedUrl).toContain('/api/travelers/traveler-1');
    });
  });

  describe('updateTraveler', () => {
    it('REQ-PROFILE-02-S01: sends PATCH /api/travelers/:id with body', async () => {
      let capturedMethod: string | null = null;
      let capturedBody: unknown = null;
      server.use(
        http.patch('http://localhost/api/travelers/:id', async ({ request }) => {
          capturedMethod = request.method;
          capturedBody = await request.json();
          return HttpResponse.json<TravelerProfile>({
            ...mockTraveler,
            department: 'Finance',
          });
        }),
      );

      const store = makeStore();
      await store.dispatch(
        travelerApi.endpoints.updateTraveler.initiate({
          id: 'traveler-1',
          department: 'Finance',
        }),
      );

      expect(capturedMethod).toBe('PATCH');
      expect((capturedBody as Record<string, unknown>).department).toBe('Finance');
    });
  });

  describe('deleteTraveler', () => {
    it('REQ-PROFILE-03-S01: sends DELETE /api/travelers/:id', async () => {
      let capturedMethod: string | null = null;
      server.use(
        http.delete('http://localhost/api/travelers/:id', ({ request }) => {
          capturedMethod = request.method;
          return new HttpResponse(null, { status: 200 });
        }),
      );

      const store = makeStore();
      await store.dispatch(
        travelerApi.endpoints.deleteTraveler.initiate('traveler-1'),
      );

      expect(capturedMethod).toBe('DELETE');
    });
  });

  describe('updateTravelerPreferences', () => {
    it('REQ-PROFILE-04-S01: sends PUT /api/travelers/:id/preferences', async () => {
      let capturedMethod: string | null = null;
      let capturedBody: unknown = null;
      server.use(
        http.put('http://localhost/api/travelers/:id/preferences', async ({ request }) => {
          capturedMethod = request.method;
          capturedBody = await request.json();
          return HttpResponse.json<TravelerPreferences>({
            ...mockPrefs,
            seatPreference: 'AISLE',
          });
        }),
      );

      const store = makeStore();
      await store.dispatch(
        travelerApi.endpoints.updateTravelerPreferences.initiate({
          id: 'traveler-1',
          seatPreference: 'AISLE',
        }),
      );

      expect(capturedMethod).toBe('PUT');
      expect((capturedBody as Record<string, unknown>).seatPreference).toBe('AISLE');
    });
  });
});
