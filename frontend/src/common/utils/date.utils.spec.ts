import { describe, it, expect } from 'vitest';
import { formatDate, isDateInPast, addDays } from './date.utils';

describe('date.utils', () => {
  it('should return true for past date', () => {
    expect(isDateInPast('2020-01-01T00:00:00Z')).toBe(true);
  });

  it('should return false for future date', () => {
    expect(isDateInPast('2099-01-01T00:00:00Z')).toBe(false);
  });

  it('should format date to default format', () => {
    const result = formatDate('2024-01-15T00:00:00Z');
    expect(result).toMatch(/Jan/);
  });

  it('should add days to ISO date', () => {
    const result = addDays('2024-01-01T00:00:00Z', 7);
    expect(result).toContain('2024-01-08');
  });
});
