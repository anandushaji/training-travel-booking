import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../cache/flight-search-cache.service';

const IDEMPOTENCY_PREFIX = 'inventory:idempotency:';
const LOCK_PREFIX = 'inventory:idempotency-lock:';

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const val = await this.redis.get(`${IDEMPOTENCY_PREFIX}${key}`);
      if (val === null) return null;
      return JSON.parse(val) as T;
    } catch (err) {
      this.logger.error('IdempotencyService.get failed', { key, error: String(err) });
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await this.redis.set(
        `${IDEMPOTENCY_PREFIX}${key}`,
        JSON.stringify(value),
        'EX',
        ttlSeconds,
      );
    } catch (err) {
      this.logger.error('IdempotencyService.set failed', { key, error: String(err) });
      throw err;
    }
  }

  /** Acquire a short-lived lock to prevent concurrent duplicate processing. Returns true if lock acquired. */
  async acquireLock(key: string): Promise<boolean> {
    try {
      const result = await this.redis.set(`${LOCK_PREFIX}${key}`, '1', 'EX', 30, 'NX');
      return result === 'OK';
    } catch {
      return false;
    }
  }
}
