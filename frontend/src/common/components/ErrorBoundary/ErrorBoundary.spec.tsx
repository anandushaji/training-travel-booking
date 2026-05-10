import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

// Suppress console.error during error boundary tests
const originalError = console.error;
beforeAll(() => { console.error = () => {}; });
afterAll(() => { console.error = originalError; });

function ThrowingComponent(): React.ReactElement {
  throw new Error('Test error');
}

describe('ErrorBoundary', () => {
  it('should render fallback on child throw', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeDefined();
  });

  it('should render default error UI when no fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowingComponent />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });
});
