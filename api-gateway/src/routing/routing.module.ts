import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProxyHttpClient } from './proxy-http.client';
import { ProxyRoutingController } from './proxy-routing.controller';
import { CircuitBreakerModule } from '../circuit-breaker/circuit-breaker.module';

@Module({
  imports: [ConfigModule, CircuitBreakerModule],
  controllers: [ProxyRoutingController],
  providers: [ProxyHttpClient],
  exports: [ProxyHttpClient],
})
export class RoutingModule {}
