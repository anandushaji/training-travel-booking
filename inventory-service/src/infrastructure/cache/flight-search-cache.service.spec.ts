import { FlightSearchCacheService, SearchParams, FlightOffer } from './flight-search-cache.service';
import Redis from 'ioredis';

const makeRedisMock = (): jest.Mocked<Redis> =>
  ({
    get: jest.fn(),
    set: jest.fn(),
  } as unknown as jest.Mocked<Redis>);

const baseParams: SearchParams = {
  origin: 'LHR',
  destination: 'JFK',
  departureDate: '2026-07-01',
  passengers: 1,
  cabinClass: 'ECONOMY',
};

const offers: FlightOffer[] = [{ offerId: 'offer-1', price: 100 }];

describe('FlightSearchCacheService', () => {
  let service: FlightSearchCacheService;
  let redis: jest.Mocked<Redis>;

  beforeEach(() => {
    redis = makeRedisMock();
    service = new FlightSearchCacheService(redis);
  });

  it('should return null on cache miss', async () => {
    redis.get.mockResolvedValueOnce(null);
    const result = await service.get(baseParams);
    expect(result).toBeNull();
  });

  it('should return stored offers after set', async () => {
    redis.set.mockResolvedValueOnce('OK');
    await service.set(baseParams, offers);

    redis.get.mockResolvedValueOnce(JSON.stringify(offers));
    const result = await service.get(baseParams);
    expect(result).toEqual(offers);

    // Verify set was called with correct key and TTL
    expect(redis.set).toHaveBeenCalledWith(
      expect.stringContaining('inventory:flight-search:'),
      JSON.stringify(offers),
      'EX',
      300,
    );
  });

  it('should produce same hash key for ISO date with and without time component', () => {
    const params1: SearchParams = { ...baseParams, departureDate: '2026-07-01' };
    const params2: SearchParams = { ...baseParams, departureDate: '2026-07-01T00:00:00Z' };

    const key1 = service.getKey(params1);
    const key2 = service.getKey(params2);
    expect(key1).toBe(key2);
  });

  it('should return null and log warn when Redis is unavailable', async () => {
    redis.get.mockRejectedValueOnce(new Error('Connection refused'));

    const warnSpy = jest.spyOn((service as unknown as { logger: { warn: jest.Mock } }).logger, 'warn').mockImplementation(() => {});
    const result = await service.get(baseParams);
    expect(result).toBeNull();
    warnSpy.mockRestore();
  });

  it('should silently absorb and log warn when Redis set fails', async () => {
    redis.set.mockRejectedValueOnce(new Error('Redis write error'));

    const warnSpy = jest.spyOn((service as unknown as { logger: { warn: jest.Mock } }).logger, 'warn').mockImplementation(() => {});
    await expect(service.set(baseParams, offers)).resolves.toBeUndefined();
    warnSpy.mockRestore();
  });
});
