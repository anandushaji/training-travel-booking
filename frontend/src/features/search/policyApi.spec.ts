import { describe, it, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../mocks/server';
import { baseApi } from '../../api/baseApi';
import { policyApi } from './policyApi';
import { authReducer } from '../auth/authSlice';
import notificationsReducer from '../notifications/notificationSlice';
import { searchReducer } from './searchSlice';

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
      search: searchReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

describe('policyApi', () => {
  describe('validatePolicy query', () => {
    it('REQ-POLICY-01-S01: sends correct URL params and returns compliant flag', async () => {
      let capturedUrl: URL | null = null;
      server.use(
        http.get('http://localhost/api/policies/validate', ({ request }) => {
          capturedUrl = new URL(request.url);
          return HttpResponse.json({ compliant: true });
        }),
      );

      const store = makeStore();
      const result = await store.dispatch(
        policyApi.endpoints.validatePolicy.initiate({
          offerId: 'offer-1',
          amount: 450,
          currency: 'USD',
        }),
      );

      expect(capturedUrl).not.toBeNull();
      expect(capturedUrl!.searchParams.get('offerId')).toBe('offer-1');
      expect(capturedUrl!.searchParams.get('amount')).toBe('450');
      expect(capturedUrl!.searchParams.get('currency')).toBe('USD');
      expect((result as { data?: { compliant: boolean } }).data?.compliant).toBe(true);
    });

    it('REQ-POLICY-01-S02: returns compliant: false when policy exceeded', async () => {
      server.use(
        http.get('http://localhost/api/policies/validate', () =>
          HttpResponse.json({ compliant: false }),
        ),
      );

      const store = makeStore();
      const result = await store.dispatch(
        policyApi.endpoints.validatePolicy.initiate({
          offerId: 'offer-2',
          amount: 9999,
          currency: 'USD',
        }),
      );
      expect((result as { data?: { compliant: boolean } }).data?.compliant).toBe(false);
    });
  });
});
