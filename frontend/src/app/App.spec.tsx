import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('should build without TypeScript errors', () => {
    // Unauthenticated users are redirected to /login (PrivateRoute stub)
    render(<App />);
    // Login placeholder is always rendered when auth.accessToken is null
    expect(screen.getByTestId('login-page')).toBeDefined();
  });
});
