import { describe, it, expectTypeOf } from 'vitest';
import type {
  FlightOffer,
  SearchParams,
  AirportOption,
  SearchState,
  PolicyValidationResult,
  FlightSearchResponse,
  SearchFilters,
} from './search.types';

describe('search.types — all exported interfaces satisfy expected shape', () => {
  it('FlightOffer has all required fields with correct types', () => {
    const offer: FlightOffer = {
      id: 'offer-1',
      airline: 'American Airlines',
      origin: 'JFK',
      destination: 'LAX',
      departureTime: '2026-06-01T10:00:00Z',
      arrivalTime: '2026-06-01T15:30:00Z',
      price: { amount: 450, currency: 'USD' },
      stops: 0,
      duration: '5h 30m',
    };
    expectTypeOf(offer).toMatchTypeOf<FlightOffer>();
    expectTypeOf(offer.id).toBeString();
    expectTypeOf(offer.price.amount).toBeNumber();
    expectTypeOf(offer.stops).toBeNumber();
  });

  it('SearchParams has required fields and optional fields', () => {
    const minParams: SearchParams = {
      origin: 'JFK',
      destination: 'LAX',
      departureDate: '2026-06-01',
      adults: 1,
    };
    expectTypeOf(minParams).toMatchTypeOf<SearchParams>();

    const fullParams: SearchParams = {
      origin: 'JFK',
      destination: 'LAX',
      departureDate: '2026-06-01',
      returnDate: '2026-06-15',
      adults: 2,
      cabinClass: 'BUSINESS',
      nonStop: true,
    };
    expectTypeOf(fullParams).toMatchTypeOf<SearchParams>();
  });

  it('AirportOption has iata, name, city string fields', () => {
    const airport: AirportOption = {
      iata: 'JFK',
      name: 'John F. Kennedy International',
      city: 'New York',
    };
    expectTypeOf(airport).toMatchTypeOf<AirportOption>();
    expectTypeOf(airport.iata).toBeString();
  });

  it('SearchState has filters and nullable selectedOffer', () => {
    const state: SearchState = {
      filters: { sortBy: 'price', maxPrice: null },
      selectedOffer: null,
    };
    expectTypeOf(state).toMatchTypeOf<SearchState>();
    expectTypeOf(state.filters).toMatchTypeOf<SearchFilters>();
  });

  it('PolicyValidationResult has compliant boolean', () => {
    const result: PolicyValidationResult = { compliant: true };
    expectTypeOf(result).toMatchTypeOf<PolicyValidationResult>();
    expectTypeOf(result.compliant).toBeBoolean();
  });

  it('FlightSearchResponse has offers array and meta', () => {
    const response: FlightSearchResponse = {
      offers: [],
      meta: { count: 0, cached: false, searchId: 'test' },
    };
    expectTypeOf(response).toMatchTypeOf<FlightSearchResponse>();
    expectTypeOf(response.offers).toMatchTypeOf<FlightOffer[]>();
  });
});
