import { describe, it, expect } from 'vitest';
import { store } from './store';

describe('store', () => {
  it('should initialise with api, notifications, auth, search, booking, and profile slices', () => {
    const state = store.getState();
    expect(state).toHaveProperty('api');
    expect(state).toHaveProperty('notifications');
    expect(state).toHaveProperty('auth');
    expect(state).toHaveProperty('search');
    expect(state).toHaveProperty('booking');
    expect(state).toHaveProperty('profile');
    const keys = Object.keys(state);
    expect(keys).toHaveLength(6);
  });
});
