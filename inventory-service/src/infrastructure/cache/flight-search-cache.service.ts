import { Injectable, Inject, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import Redis from 'ioredis';

export const REDIS_CLIENT = 'REDIS_CLIENT';

export interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass?: string;
}

export interface FlightOffer {
  offerId: string;
  [key: string]: unknown;
}

const KEY_PREFIX = 'inventory:flight-search:';
const TTL_SECONDS = 300;

function resolveTtl(): number {
  const override = process.env['CACHE_DEBUG_TTL'];
  return override ? parseInt(override, 10) : TTL_SECONDS;
}

function normaliseDate(dateStr: string): string {
  // Normalise ISO8601 or YYYY-MM-DD to YYYY-MM-DD
  if (dateStr.length > 10) {
    return dateStr.substring(0, 10);
  }
  return dateStr;
}

function canonicalKey(params: SearchParams): string {
  const normalised: Record<string, unknown> = {
    cabinClass: params.cabinClass ?? '',
    departureDate: normaliseDate(params.departureDate),
    destination: params.destination,
    origin: params.origin,
    passengers: params.passengers,
    returnDate: params.returnDate !== undefined ? normaliseDate(params.returnDate) : '',
  };

  // Sort keys and stringify
  const sorted = Object.fromEntries(
    Object.entries(normalised).sort(([a], [b]) => a.localeCompare(b)),
  );

  const hash = crypto.createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
  return `${KEY_PREFIX}${hash}`;
}

@Injectable()
export class FlightSearchCacheService {
  private readonly logger = new Logger(FlightSearchCacheService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get(params: SearchParams): Promise<FlightOffer[] | null> {
    const key = canonicalKey(params);
    try {
      const raw = await this.redis.get(key);
      if (!raw) return null;
      return JSON.parse(raw) as FlightOffer[];
    } catch (err) {
      this.logger.warn('Redis get failed for flight search cache', { key, err });
      return null;
    }
  }

  async set(params: SearchParams, offers: FlightOffer[]): Promise<void> {
    const key = canonicalKey(params);
    try {
      await this.redis.set(key, JSON.stringify(offers), 'EX', resolveTtl());
    } catch (err) {
      this.logger.warn('Redis set failed for flight search cache', { key, err });
    }
  }

  getKey(params: SearchParams): string {
    return canonicalKey(params);
  }
}
