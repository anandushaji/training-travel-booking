import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { http, HttpResponse } from 'msw';
import { ThemeProvider } from '@mui/material';
import { server } from '../../../mocks/server';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { theme } from '../../../theme/theme';
import { LoginForm } from '../components/LoginForm';

function makeStore() {
  return configureStore({
    reducer: {
      [baseApi.reducerPath]: baseApi.reducer,
      notifications: notificationsReducer,
      auth: authReducer,
    },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
}

function renderLoginForm(onSuccess?: () => void) {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <LoginForm onSuccess={onSuccess} />
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
  return store;
}

describe('LoginForm', () => {
  describe('REQ-AUTH-06-S01: Invalid email prevents submission', () => {
    it('shows inline email error and does not call API', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      renderLoginForm();

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.input(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.input(passwordInput, { target: { value: 'validpassword' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/valid email/i)).toBeDefined();
      });

      const loginCalls = fetchSpy.mock.calls.filter((args) =>
        String(args[0]).includes('/auth/login'),
      );
      expect(loginCalls.length).toBe(0);
      fetchSpy.mockRestore();
    });
  });

  describe('REQ-AUTH-06-S02: Short password prevents submission', () => {
    it('shows inline password error and does not call API', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch');
      renderLoginForm();

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.input(emailInput, { target: { value: 'valid@email.com' } });
      fireEvent.input(passwordInput, { target: { value: 'short' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/at least 8 characters/i)).toBeDefined();
      });

      const loginCalls = fetchSpy.mock.calls.filter((args) =>
        String(args[0]).includes('/auth/login'),
      );
      expect(loginCalls.length).toBe(0);
      fetchSpy.mockRestore();
    });
  });

  describe('REQ-AUTH-06-S04: API 401 dispatches error toast', () => {
    it('adds error notification and re-enables submit on 401', async () => {
      server.use(
        http.post('http://localhost/api/auth/login', () =>
          HttpResponse.json({ error: 'Unauthorized', message: 'Invalid credentials' }, { status: 401 }),
        ),
      );

      const store = renderLoginForm();

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.input(emailInput, { target: { value: 'valid@email.com' } });
      fireEvent.input(passwordInput, { target: { value: 'validpassword' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        const notifications = store.getState().notifications.queue;
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0]?.severity).toBe('error');
      });

      // Submit button should be re-enabled (not disabled/loading)
      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
    });
  });

  describe('REQ-AUTH-06-S05: Network error dispatches generic error toast', () => {
    it('shows error toast on network failure', async () => {
      server.use(
        http.post('http://localhost/api/auth/login', () => HttpResponse.error()),
      );

      const store = renderLoginForm();

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.input(emailInput, { target: { value: 'valid@email.com' } });
      fireEvent.input(passwordInput, { target: { value: 'validpassword' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        const notifications = store.getState().notifications.queue;
        expect(notifications.length).toBeGreaterThan(0);
        expect(notifications[0]?.severity).toBe('error');
      });

      await waitFor(() => {
        expect(submitBtn).not.toBeDisabled();
      });
    });
  });
});
