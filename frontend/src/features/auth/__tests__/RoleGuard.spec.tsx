import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { authReducer, setCredentials } from '../authSlice';
import { RoleGuard } from '../components/RoleGuard';
import type { UserRole } from '../auth.types';

function makeStore(role: UserRole | null = null) {
  const store = configureStore({ reducer: { auth: authReducer } });
  if (role) {
    store.dispatch(
      setCredentials({
        accessToken: 'test-at',
        refreshToken: 'test-rt',
        expiresIn: 28800,
        user: { id: 'u1', email: 'test@corp.com', role, exp: 9999999999, iat: 1 },
      }),
    );
  }
  return store;
}

function renderGuard(role: UserRole | null, requiredRole: UserRole) {
  const store = makeStore(role);
  render(
    <Provider store={store}>
      <RoleGuard requiredRole={requiredRole}>
        <div>secret</div>
      </RoleGuard>
    </Provider>,
  );
}

describe('RoleGuard', () => {
  describe('REQ-AUTH-07-S01: ADMIN can see MANAGER-gated content', () => {
    it('renders children when user role rank >= required role rank', () => {
      renderGuard('ADMIN', 'MANAGER');
      expect(screen.getByText('secret')).toBeDefined();
    });
  });

  describe('REQ-AUTH-07-S02: EMPLOYEE cannot see MANAGER-gated content', () => {
    it('does not render children when user role rank < required role rank', () => {
      renderGuard('EMPLOYEE', 'MANAGER');
      expect(screen.queryByText('secret')).toBeNull();
    });
  });

  describe('REQ-AUTH-07-S03: Unauthenticated user sees no guarded content', () => {
    it('renders null when auth.user is null', () => {
      renderGuard(null, 'EMPLOYEE');
      expect(screen.queryByText('secret')).toBeNull();
    });
  });

  describe('role hierarchy', () => {
    it('EMPLOYEE can see EMPLOYEE-gated content', () => {
      renderGuard('EMPLOYEE', 'EMPLOYEE');
      expect(screen.getByText('secret')).toBeDefined();
    });

    it('MANAGER can see MANAGER-gated content', () => {
      renderGuard('MANAGER', 'MANAGER');
      expect(screen.getByText('secret')).toBeDefined();
    });

    it('MANAGER can see EMPLOYEE-gated content', () => {
      renderGuard('MANAGER', 'EMPLOYEE');
      expect(screen.getByText('secret')).toBeDefined();
    });

    it('EMPLOYEE cannot see ADMIN-gated content', () => {
      renderGuard('EMPLOYEE', 'ADMIN');
      expect(screen.queryByText('secret')).toBeNull();
    });

    it('MANAGER cannot see ADMIN-gated content', () => {
      renderGuard('MANAGER', 'ADMIN');
      expect(screen.queryByText('secret')).toBeNull();
    });

    it('ADMIN can see ADMIN-gated content', () => {
      renderGuard('ADMIN', 'ADMIN');
      expect(screen.getByText('secret')).toBeDefined();
    });
  });
});
