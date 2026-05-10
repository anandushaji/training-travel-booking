import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CurrencyDisplay } from './CurrencyDisplay';

describe('CurrencyDisplay', () => {
  it('should format USD amount correctly', () => {
    render(<CurrencyDisplay amount={1234.5} currency="USD" />);
    const text = screen.getByText(/1,234\.50/);
    expect(text).toBeDefined();
  });

  it('should include currency symbol', () => {
    const { container } = render(<CurrencyDisplay amount={100} currency="USD" />);
    expect(container.textContent).toMatch(/\$/);
  });
});
