/**
 * T15 — FlightSearchCacheService integration tests (Testcontainers Redis).
 * Skipped when SKIP_TESTCONTAINERS=true.
 */

import Redis from 'ioredis';
import { FlightSearchCacheService, SearchParams } from './flight-search-cache.service';

const SKIP = process.env['SKIP_TESTCONTAINERS'] === 'true';

const BASE_PARAMS: SearchParams = {
  origin: 'LHR',
  destination: 'JFK',
  departureDate: '2026-07-01',
  passengers: 1,
};

describe('FlightSearchCacheService (integration — Testcontainers Redis)', () => {
  let redis: Redis;
  let cache: FlightSearchCacheService;

  beforeAll(async () => {
    if (SKIP) return;

    const { RedisContainer } = await import('@testcontainers/redis');
    const container = await new RedisContainer().start();
    redis = new Redis(container.getConnectionUrl());
    cache = new FlightSearchCacheService(redis);
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
    'should return null before set',
    runTest(async () => {
      const result = await cache.get(BASE_PARAMS);
      expect(result).toBeNull();
    }),
    120000,
  );

  it(
    'should return stored offers after set',
    runTest(async () => {
      const offers = [{ offerId: 'offer-1', price: '100' }];
      await cache.set(BASE_PARAMS, offers);

      const result = await cache.get(BASE_PARAMS);
      expect(result).toEqual(offers);
    }),
    120000,
  );

  it(
    'should produce same hash key for ISO date with and without time component',
    runTest(async () => {
      const paramsWithTime: SearchParams = { ...BASE_PARAMS, departureDate: '2026-07-01T00:00:00Z' };
      const key1 = cache.getKey(BASE_PARAMS);
      const key2 = cache.getKey(paramsWithTime);
      expect(key1).toBe(key2);
    }),
    120000,
  );

  it(
    'should return null and log warn when Redis is unavailable',
    runTest(async () => {
      const badRedis = new Redis({ port: 1, lazyConnect: true, enableOfflineQueue: false });
      const badCache = new FlightSearchCacheService(badRedis as unknown as Redis);
      const result = await badCache.get(BASE_PARAMS);
      expect(result).toBeNull();
      badRedis.disconnect();
    }),
    120000,
  );

  it(
    'should return null after TTL expires (simulated with CACHE_DEBUG_TTL=1)',
    runTest(async () => {
      process.env['CACHE_DEBUG_TTL'] = '1';
      const ttlParams: SearchParams = { ...BASE_PARAMS, passengers: 2 }; // distinct key
      const offers = [{ offerId: 'offer-ttl-test' }];

      await cache.set(ttlParams, offers);
      // Immediately available
      const before = await cache.get(ttlParams);
      expect(before).toEqual(offers);

      // Wait for TTL to expire
      await new Promise((resolve) => global.setTimeout(resolve, 1500));

      const after = await cache.get(ttlParams);
      expect(after).toBeNull();

      delete process.env['CACHE_DEBUG_TTL'];
    }),
    120000,
  );
});
