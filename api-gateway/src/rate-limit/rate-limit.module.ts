import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisThrottlerStore } from './redis-throttler.store';
import { RedisModule } from './redis.module';

export { REDIS_CLIENT } from './redis.module';

@Module({
  imports: [
    RedisModule,
    ThrottlerModule.forRootAsync({
      imports: [RedisModule, ConfigModule],
      useFactory: (_config: ConfigService, store: RedisThrottlerStore) => [
        { name: 'global', ttl: 900, limit: 100, storage: store },
        { name: 'search', ttl: 60, limit: 30, storage: store },
      ],
      inject: [ConfigService, RedisThrottlerStore],
    }),
  ],
  exports: [ThrottlerModule, RedisModule],
})
export class RateLimitModule {}
