import { SearchFlightsUseCase } from './search-flights.use-case';
import { FlightSearchCacheService } from '../../../infrastructure/cache/flight-search-cache.service';
import { AmadeusHttpClient } from '../../../infrastructure/amadeus/amadeus-http.client';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';

const mockCache = (): jest.Mocked<FlightSearchCacheService> =>
  ({
    get: jest.fn(),
    set: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<FlightSearchCacheService>);

const mockAmadeus = (): jest.Mocked<AmadeusHttpClient> =>
  ({
    searchFlights: jest.fn(),
  } as unknown as jest.Mocked<AmadeusHttpClient>);

const mockMetrics = (): jest.Mocked<MetricsService> =>
  ({
    incrementCacheHit: jest.fn(),
    incrementCacheMiss: jest.fn(),
  } as unknown as jest.Mocked<MetricsService>);

const COMMAND = {
  origin: 'LHR',
  destination: 'JFK',
  departureDate: '2026-07-01',
  passengers: 1,
};

const OFFER = {
  offerId: 'offer-1',
  carrier: 'BA',
  flightNumber: 'BA117',
  origin: 'LHR',
  destination: 'JFK',
  departureAt: '2026-07-01T10:00:00Z',
  arrivalAt: '2026-07-01T13:00:00Z',
  cabinClass: 'ECONOMY',
  price: { amount: '500.00', currency: 'GBP' },
  seatsAvailable: 10,
};

describe('SearchFlightsUseCase', () => {
  let useCase: SearchFlightsUseCase;
  let cache: jest.Mocked<FlightSearchCacheService>;
  let amadeus: jest.Mocked<AmadeusHttpClient>;
  let metrics: jest.Mocked<MetricsService>;

  beforeEach(() => {
    cache = mockCache();
    amadeus = mockAmadeus();
    metrics = mockMetrics();
    useCase = new SearchFlightsUseCase(cache, amadeus, metrics);
  });

  it('should return cached offers and not call Amadeus on cache hit', async () => {
    cache.get.mockResolvedValue([OFFER]);

    const result = await useCase.execute(COMMAND);

    expect(result.data[0]?.source).toBe('CACHE');
    expect(result.meta.count).toBe(1);
    expect(amadeus.searchFlights).not.toHaveBeenCalled();
    expect(metrics.incrementCacheHit).toHaveBeenCalledWith('flight-search');
    expect(metrics.incrementCacheMiss).not.toHaveBeenCalled();
  });

  it('should call Amadeus, populate cache, and return LIVE source on cache miss', async () => {
    cache.get.mockResolvedValue(null);
    amadeus.searchFlights.mockResolvedValue({ data: [OFFER] });

    const result = await useCase.execute(COMMAND);

    expect(result.data[0]?.source).toBe('LIVE');
    expect(result.meta.count).toBe(1);
    expect(amadeus.searchFlights).toHaveBeenCalled();
    expect(cache.set).toHaveBeenCalled();
    expect(metrics.incrementCacheMiss).toHaveBeenCalledWith('flight-search');
  });

  it('should propagate Amadeus error when cache is empty and Amadeus fails', async () => {
    cache.get.mockResolvedValue(null);
    amadeus.searchFlights.mockRejectedValue(new Error('Amadeus down'));

    await expect(useCase.execute(COMMAND)).rejects.toThrow('Amadeus down');
    expect(cache.set).not.toHaveBeenCalled();
  });

  it('should include returnDate and cabinClass in params when provided', async () => {
    cache.get.mockResolvedValue(null);
    amadeus.searchFlights.mockResolvedValue({ data: [OFFER] });

    const result = await useCase.execute({
      ...COMMAND,
      returnDate: '2026-07-14',
      cabinClass: 'BUSINESS',
    });

    expect(result.data[0]?.source).toBe('LIVE');
    expect(amadeus.searchFlights).toHaveBeenCalledWith(
      expect.objectContaining({ returnDate: '2026-07-14', cabinClass: 'BUSINESS' }),
    );
  });

  it('should return empty data when Amadeus returns null (non-object)', async () => {
    cache.get.mockResolvedValue(null);
    amadeus.searchFlights.mockResolvedValue(null);

    const result = await useCase.execute(COMMAND);
    expect(result.data).toEqual([]);
    expect(result.meta.count).toBe(0);
  });

  it('should return empty data when Amadeus response data is not an array', async () => {
    cache.get.mockResolvedValue(null);
    amadeus.searchFlights.mockResolvedValue({ data: 'not-an-array' });

    const result = await useCase.execute(COMMAND);
    expect(result.data).toEqual([]);
  });
});
