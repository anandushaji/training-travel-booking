import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from '../features/notifications/notificationSlice';
import { PrivateRoute } from './PrivateRoute';

// Minimal auth reducer stub — replaced by authSlice in SM-FE-02
function authReducer(
  state: { accessToken: string | null } = { accessToken: null },
): { accessToken: string | null } {
  return state;
}

function makeStore(accessToken: string | null = null) {
  return configureStore({
    reducer: { notifications: notificationsReducer, auth: authReducer },
    preloadedState: { auth: { accessToken } },
  });
}

function renderWithRouter(accessToken: string | null, initialPath = '/dashboard') {
  const store = makeStore(accessToken);
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div data-testid="login-page">Login</div>} />
          <Route element={<PrivateRoute />}>
            <Route path="/dashboard" element={<div data-testid="dashboard">Dashboard</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('PrivateRoute', () => {
  it('should redirect to /login when unauthenticated', () => {
    renderWithRouter(null);
    expect(screen.getByTestId('login-page')).toBeDefined();
    expect(screen.queryByTestId('dashboard')).toBeNull();
  });

  it('should render Outlet when authenticated', () => {
    renderWithRouter('valid-token-string');
    expect(screen.getByTestId('dashboard')).toBeDefined();
    expect(screen.queryByTestId('login-page')).toBeNull();
  });

  it('should not redirect when on /login route', () => {
    renderWithRouter(null, '/login');
    expect(screen.getByTestId('login-page')).toBeDefined();
  });
});
