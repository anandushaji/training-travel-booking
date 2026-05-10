import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { http, HttpResponse } from 'msw';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../../auth/authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { searchReducer } from '../searchSlice';
import { PolicyBadge, _resetPolicyCounterForTesting } from './PolicyBadge';

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

function renderBadge(offerId = 'offer-1', amount = 450, currency = 'USD') {
  const store = makeStore();
  render(
    <Provider store={store}>
      <PolicyBadge offerId={offerId} amount={amount} currency={currency} />
    </Provider>,
  );
  return store;
}

describe('PolicyBadge', () => {
  beforeEach(() => {
    _resetPolicyCounterForTesting();
  });

  it('REQ-POLICY-BADGE-S01: shows loading spinner while validating', async () => {
    // Delay the policy response
    server.use(
      http.get('http://localhost/api/policies/validate', async () => {
        await new Promise((r) => setTimeout(r, 200));
        return HttpResponse.json({ compliant: true });
      }),
    );

    renderBadge();
    // Spinner should be visible immediately
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('REQ-POLICY-BADGE-S02: shows COMPLIANT chip when policy is met', async () => {
    // Default handler returns { compliant: true }
    renderBadge();
    await waitFor(() => {
      expect(screen.getByText('COMPLIANT')).toBeDefined();
    });
  });

  it('REQ-POLICY-BADGE-S03: shows EXCEEDS POLICY chip when policy is exceeded', async () => {
    server.use(
      http.get('http://localhost/api/policies/validate', () =>
        HttpResponse.json({ compliant: false }),
      ),
    );

    renderBadge();
    await waitFor(() => {
      expect(screen.getByText('EXCEEDS POLICY')).toBeDefined();
    });
  });

  it('REQ-POLICY-BADGE-S04: shows POLICY UNKNOWN chip on API error (503)', async () => {
    server.use(
      http.get('http://localhost/api/policies/validate', () =>
        HttpResponse.json({ error: 'Service Unavailable' }, { status: 503 }),
      ),
    );

    renderBadge();
    // 503 triggers retries with backoff (up to ~1.5s); allow extra time
    await waitFor(
      () => {
        expect(screen.getByText('POLICY UNKNOWN')).toBeDefined();
      },
      { timeout: 10000 },
    );
  });
});
