import { baseApi } from '../../api/baseApi';
import type { SearchParams, FlightSearchResponse, AirportOption } from './search.types';

export const flightApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    searchFlights: build.query<FlightSearchResponse, SearchParams>({
      query: (params) => ({
        url: '/inventory/flights/search',
        params: {
          origin: params.origin,
          destination: params.destination,
          departureDate: params.departureDate,
          passengers: params.adults,
          ...(params.returnDate !== undefined ? { returnDate: params.returnDate } : {}),
          ...(params.cabinClass !== undefined ? { cabinClass: params.cabinClass } : {}),
          ...(params.nonStop !== undefined ? { nonStop: params.nonStop } : {}),
        },
      }),
      keepUnusedDataFor: 300,
    }),
    searchAirports: build.query<AirportOption[], { q: string }>({
      query: ({ q }) => ({
        url: '/inventory/airports/search',
        params: { q },
      }),
      keepUnusedDataFor: 600,
    }),
  }),
  overrideExisting: false,
});

export const { useLazySearchFlightsQuery, useSearchAirportsQuery } = flightApi;
