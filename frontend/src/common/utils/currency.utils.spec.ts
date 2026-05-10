import { describe, it, expect } from 'vitest';
import { formatCurrency } from './currency.utils';

describe('formatCurrency', () => {
  it('should format USD amount with symbol and thousands separator', () => {
    const result = formatCurrency(1234.5, 'USD');
    expect(result).toMatch(/1,234\.50/);
    expect(result).toMatch(/\$/);
  });

  it('should format zero correctly', () => {
    expect(formatCurrency(0, 'USD')).toMatch(/0\.00/);
  });
});
