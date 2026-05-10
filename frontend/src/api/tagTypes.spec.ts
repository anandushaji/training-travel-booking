import { describe, it, expect } from 'vitest';
import { TAG_TYPES } from './tagTypes';

describe('tagTypes', () => {
  it('should export all required tag types', () => {
    expect(TAG_TYPES).toContain('BOOKING');
    expect(TAG_TYPES).toContain('TRAVELER');
    expect(TAG_TYPES).toContain('EXPENSE');
    expect(TAG_TYPES).toContain('FLIGHT');
    expect(TAG_TYPES).toContain('POLICY');
    expect(TAG_TYPES).toContain('PAYMENT_METHOD');
    expect(TAG_TYPES).toHaveLength(6);
  });
});
