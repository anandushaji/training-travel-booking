import { describe, it, expect } from 'vitest';
import { handlers } from './index';
import { travelerHandlers } from './traveler.handlers';

describe('handlers/index — travelerHandlers included', () => {
  it('REQ-PROFILE-MSW-S01: handlers array contains all traveler handler entries', () => {
    // Each travelerHandler entry should be present in the combined handlers array
    expect(handlers.length).toBeGreaterThanOrEqual(travelerHandlers.length);
    // Verify traveler handlers are spread in by checking handler count grows
    const handlersWithoutTraveler = handlers.filter(
      (h) => !travelerHandlers.includes(h),
    );
    expect(handlersWithoutTraveler.length).toBe(handlers.length - travelerHandlers.length);
  });
});
