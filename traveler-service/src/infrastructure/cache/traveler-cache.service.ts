import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';

export interface TravelerCacheDto {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  preferences: object;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

const CACHE_KEY_PREFIX = 'traveler:profile:';
const CACHE_TTL_SECONDS = 3600;

@Injectable()
export class TravelerCacheService {
  private readonly logger = new Logger(TravelerCacheService.name);

  constructor(private readonly redis: Redis) {}

  async get(travelerId: string): Promise<TravelerCacheDto | null> {
    try {
      const raw = await this.redis.get(`${CACHE_KEY_PREFIX}${travelerId}`);
      if (!raw) return null;
      return JSON.parse(raw) as TravelerCacheDto;
    } catch (err) {
      this.logger.warn('Redis get failed, falling back to DB', { travelerId, err });
      return null;
    }
  }

  async set(travelerId: string, dto: TravelerCacheDto): Promise<void> {
    try {
      await this.redis.set(
        `${CACHE_KEY_PREFIX}${travelerId}`,
        JSON.stringify(dto),
        'EX',
        CACHE_TTL_SECONDS,
      );
    } catch (err) {
      this.logger.warn('Redis set failed', { travelerId, err });
    }
  }

  async invalidate(travelerId: string): Promise<void> {
    try {
      await this.redis.del(`${CACHE_KEY_PREFIX}${travelerId}`);
    } catch (err) {
      this.logger.warn('Redis invalidate failed', { travelerId, err });
    }
  }
}
