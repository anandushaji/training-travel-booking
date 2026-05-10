import { describe, it, expect } from 'vitest';

describe('search barrel — all required exports present', () => {
  it(
    'exports SearchPage, searchReducer, selectSelectedOffer, and useFlightSearch',
    async () => {
      const barrel = await import('./index');
      expect(barrel.SearchPage).toBeDefined();
      expect(barrel.searchReducer).toBeDefined();
      expect(barrel.selectSelectedOffer).toBeDefined();
      expect(barrel.useFlightSearch).toBeDefined();
      expect(barrel.selectFilters).toBeDefined();
      expect(barrel.setFilters).toBeDefined();
      expect(barrel.setSelectedOffer).toBeDefined();
      expect(barrel.clearSelectedOffer).toBeDefined();
      expect(barrel.flightApi).toBeDefined();
    },
    15000,
  );
});
