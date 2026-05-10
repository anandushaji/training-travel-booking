import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisThrottlerStore } from './redis-throttler.store';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        return new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379');
      },
      inject: [ConfigService],
    },
    {
      provide: RedisThrottlerStore,
      useFactory: (redis: Redis) => new RedisThrottlerStore(redis),
      inject: [REDIS_CLIENT],
    },
  ],
  exports: [REDIS_CLIENT, RedisThrottlerStore],
})
export class RedisModule {}
