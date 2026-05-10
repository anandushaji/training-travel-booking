/**
 * T15 — SearchFlightsUseCase integration tests
 * (Testcontainers Redis; Amadeus mocked via jest).
 * Skipped when SKIP_TESTCONTAINERS=true.
 */

import Redis from 'ioredis';
import { FlightSearchCacheService } from '../../../infrastructure/cache/flight-search-cache.service';
import { SearchFlightsUseCase } from './search-flights.use-case';
import type { AmadeusHttpClient } from '../../../infrastructure/amadeus/amadeus-http.client';
import type { MetricsService } from '../../../infrastructure/observability/metrics.service';

const SKIP = process.env['SKIP_TESTCONTAINERS'] === 'true';

const AMADEUS_SEARCH_RESPONSE = {
  data: [
    { offerId: 'offer-1', price: '250.00', airline: 'BA' },
    { offerId: 'offer-2', price: '310.00', airline: 'AA' },
  ],
};

const SEARCH_COMMAND = {
  origin: 'LHR',
  destination: 'JFK',
  departureDate: '2026-07-01',
  passengers: 1,
};

describe('SearchFlightsUseCase (integration — Testcontainers Redis)', () => {
  let redis: Redis;
  let cache: FlightSearchCacheService;
  let useCase: SearchFlightsUseCase;
  let mockAmadeus: jest.Mocked<Pick<AmadeusHttpClient, 'searchFlights'>>;
  let mockMetrics: jest.Mocked<Pick<MetricsService, 'incrementCacheHit' | 'incrementCacheMiss'>>;

  beforeAll(async () => {
    if (SKIP) return;

    const { RedisContainer } = await import('@testcontainers/redis');
    const container = await new RedisContainer().start();
    redis = new Redis(container.getConnectionUrl());
    cache = new FlightSearchCacheService(redis);

    mockAmadeus = { searchFlights: jest.fn().mockResolvedValue(AMADEUS_SEARCH_RESPONSE) };
    mockMetrics = {
      incrementCacheHit: jest.fn(),
      incrementCacheMiss: jest.fn(),
    };

    useCase = new SearchFlightsUseCase(
      cache,
      mockAmadeus as unknown as AmadeusHttpClient,
      mockMetrics as unknown as MetricsService,
    );
  }, 120000);

  afterAll(async () => {
    if (SKIP) return;
    if (redis) redis.disconnect();
  });

  const runTest = (fn: () => Promise<void>) => async () => {
    if (SKIP) {
      console.log('Skipping: SKIP_TESTCONTAINERS=true');
      return;
    }
    await fn();
  };

  it(
    'should call Amadeus, store in cache, and return LIVE source on first call',
    runTest(async () => {
      const result = await useCase.execute(SEARCH_COMMAND);

      expect(result.data.length).toBe(2);
      expect(result.data[0]!.source).toBe('LIVE');
      expect(mockAmadeus.searchFlights).toHaveBeenCalledTimes(1);
      expect(mockMetrics.incrementCacheMiss).toHaveBeenCalledWith('flight-search');
    }),
    120000,
  );

  it(
    'should return cached offers and not call Amadeus on second call',
    runTest(async () => {
      // Second call with same params — cache should be populated from first call
      const result = await useCase.execute(SEARCH_COMMAND);

      expect(result.data.length).toBe(2);
      expect(result.data[0]!.source).toBe('CACHE');
      // Amadeus still called only once (from first test)
      expect(mockAmadeus.searchFlights).toHaveBeenCalledTimes(1);
      expect(mockMetrics.incrementCacheHit).toHaveBeenCalledWith('flight-search');
    }),
    120000,
  );
});
