import { http, HttpResponse } from 'msw';
import type { FlightOffer, FlightSearchResponse, AirportOption } from '../../features/search/search.types';

export const mockFlightOffer: FlightOffer = {
  id: 'offer-test-1',
  airline: 'American Airlines',
  origin: 'JFK',
  destination: 'LAX',
  departureTime: '2026-06-01T10:00:00Z',
  arrivalTime: '2026-06-01T15:30:00Z',
  price: { amount: 450, currency: 'USD' },
  stops: 0,
  duration: '5h 30m',
};

export const inventoryHandlers = [
  http.get('http://localhost/api/inventory/flights/search', () =>
    HttpResponse.json<FlightSearchResponse>({
      offers: [mockFlightOffer],
      meta: { count: 1, cached: false, searchId: 'test-search-id' },
    }),
  ),
  http.get('http://localhost/api/inventory/airports/search', () =>
    HttpResponse.json<AirportOption[]>([
      { iata: 'JFK', name: 'John F. Kennedy International', city: 'New York' },
    ]),
  ),
];
