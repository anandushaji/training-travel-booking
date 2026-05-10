import { Injectable, Logger } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

// Lua script: atomic INCR + EXPIRE, returns the new count
// If key does not exist, it creates it with value 1 and sets TTL
const INCR_SCRIPT = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return current
`;

export interface MetricsServiceInterface {
  incrementCacheHit(type: string): void;
  incrementCacheMiss(type: string): void;
}

@Injectable()
export class RedisThrottlerStore implements ThrottlerStorage {
  private readonly logger = new Logger(RedisThrottlerStore.name);
  private metricsService: MetricsServiceInterface | null = null;

  constructor(private readonly redis: Redis) {}

  setMetricsService(metrics: MetricsServiceInterface): void {
    this.metricsService = metrics;
  }

  async increment(key: string, ttl: number): Promise<{ totalHits: number; timeToExpire: number; isBlocked: boolean; timeToBlockExpire: number }> {
    try {
      const count = await (this.redis as Redis & { eval: (script: string, numKeys: number, key: string, ttlMs: string) => Promise<unknown> })
        .eval(INCR_SCRIPT, 1, key, String(ttl * 1000)) as number;

      const isBlocked = false; // ThrottlerGuard decides this based on the count vs limit
      return {
        totalHits: count,
        timeToExpire: ttl,
        isBlocked,
        timeToBlockExpire: 0,
      };
    } catch (err) {
      this.logger.warn(`Redis error in rate-limit store (fail-open): ${String(err)}`);
      // Fail-open: allow the request through
      return { totalHits: 0, timeToExpire: ttl, isBlocked: false, timeToBlockExpire: 0 };
    }
  }
}
