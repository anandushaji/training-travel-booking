import { Injectable, Logger } from '@nestjs/common';
import { FlightSearchCacheService, SearchParams, FlightOffer } from '../../../infrastructure/cache/flight-search-cache.service';
import { AmadeusHttpClient } from '../../../infrastructure/amadeus/amadeus-http.client';
import { MetricsService } from '../../../infrastructure/observability/metrics.service';
import { SearchFlightsCommand } from './search-flights.command';
import { SearchFlightsResult, FlightOfferResult } from './search-flights.result';

@Injectable()
export class SearchFlightsUseCase {
  private readonly logger = new Logger(SearchFlightsUseCase.name);

  constructor(
    private readonly cache: FlightSearchCacheService,
    private readonly amadeusClient: AmadeusHttpClient,
    private readonly metrics: MetricsService,
  ) {}

  async execute(command: SearchFlightsCommand): Promise<SearchFlightsResult> {
    const params: SearchParams = {
      origin: command.origin,
      destination: command.destination,
      departureDate: command.departureDate,
      passengers: command.passengers,
      ...(command.returnDate !== undefined && { returnDate: command.returnDate }),
      ...(command.cabinClass !== undefined && { cabinClass: command.cabinClass }),
    };

    const cached = await this.cache.get(params);
    if (cached !== null) {
      this.metrics.incrementCacheHit('flight-search');
      this.logger.log('flight_search_cache_hit');
      return {
        data: cached.map((o) => ({ ...o, source: 'CACHE' as const } as FlightOfferResult)),
        meta: { count: cached.length, cachedAt: new Date().toISOString() },
      };
    }

    this.metrics.incrementCacheMiss('flight-search');
    this.logger.log('flight_search_cache_miss');

    const raw = await this.amadeusClient.searchFlights(params as unknown as Record<string, unknown>);
    const offers = this._parseOffers(raw);

    await this.cache.set(params, offers as unknown as FlightOffer[]);

    return {
      data: offers.map((o) => ({ ...o, source: 'LIVE' as const })),
      meta: { count: offers.length, cachedAt: null },
    };
  }

  private _parseOffers(raw: unknown): FlightOfferResult[] {
    if (raw === null || typeof raw !== 'object') return [];
    const data = (raw as Record<string, unknown>)['data'];
    if (!Array.isArray(data)) return [];
    return data as FlightOfferResult[];
  }
}
