import { describe, it, expect } from 'vitest';

describe('profile barrel — all required exports present', () => {
  it(
    'exports ProfilePage, AdminTravelersPage, profileReducer, setViewingTravelerId, selectViewingTravelerId, travelerApi',
    async () => {
      const barrel = await import('./index');
      expect(barrel.ProfilePage).toBeDefined();
      expect(barrel.AdminTravelersPage).toBeDefined();
      expect(barrel.profileReducer).toBeDefined();
      expect(barrel.setViewingTravelerId).toBeDefined();
      expect(barrel.selectViewingTravelerId).toBeDefined();
      expect(barrel.travelerApi).toBeDefined();
    },
    15000,
  );
});
