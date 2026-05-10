import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { server } from '../../../mocks/server';
import { http, HttpResponse } from 'msw';
import { baseApi } from '../../../api/baseApi';
import { authReducer } from '../authSlice';
import notificationsReducer from '../../notifications/notificationSlice';
import { theme } from '../../../theme/theme';
import { LoginPage } from '../pages/LoginPage';

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

function renderLoginPage(fromPath = '/') {
  const store = makeStore();
  render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter
          initialEntries={[{ pathname: '/login', state: { from: fromPath } }]}
        >
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<div data-testid="destination-page">Destination</div>} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>,
  );
  return store;
}

describe('LoginPage', () => {
  it('renders the Corporate Travel Portal heading', () => {
    renderLoginPage();
    expect(screen.getByText('Corporate Travel Portal')).toBeDefined();
  });

  describe('REQ-AUTH-06-S03: Navigates to from location after successful login', () => {
    it('navigates to the originally requested route after login', async () => {
      // Override MSW to return a successful login
      server.use(
        http.post('http://localhost/api/auth/login', () =>
          HttpResponse.json({
            accessToken: 'test-at',
            refreshToken: 'test-rt',
            expiresIn: 28800,
            user: { id: 'u1', email: 'a@b.com', role: 'EMPLOYEE', exp: 9999999999, iat: 1 },
          }),
        ),
      );

      const store = renderLoginPage('/bookings');

      const emailInput = screen.getByPlaceholderText('you@company.com');
      const passwordInput = screen.getByPlaceholderText('••••••••');
      const submitBtn = screen.getByRole('button', { name: /sign in/i });

      fireEvent.input(emailInput, { target: { value: 'a@b.com' } });
      fireEvent.input(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitBtn);

      // After successful login, navigated away from /login
      await waitFor(() => {
        expect(screen.queryByText('Corporate Travel Portal')).toBeNull();
        expect(screen.getByTestId('destination-page')).toBeDefined();
      });

      expect(store.getState().auth.isAuthenticated).toBe(true);
    });
  });
});
