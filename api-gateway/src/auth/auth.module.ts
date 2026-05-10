import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { RoutingModule } from '../routing/routing.module';
import { RateLimitModule, REDIS_CLIENT } from '../rate-limit/rate-limit.module';
import { ProxyHttpClient } from '../routing/proxy-http.client';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') ?? '',
        signOptions: {
          expiresIn: config.get<number>('JWT_EXPIRY') ?? 28800,
          algorithm: 'HS256' as const,
        },
      }),
      inject: [ConfigService],
    }),
    RoutingModule,
    RateLimitModule,
  ],
  controllers: [AuthController],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    {
      provide: AuthService,
      useFactory: (
        jwtService: JwtService,
        config: ConfigService,
        proxyClient: ProxyHttpClient,
        redis: Redis,
      ) => new AuthService(jwtService, config, proxyClient, redis),
      inject: [JwtService, ConfigService, ProxyHttpClient, REDIS_CLIENT],
    },
  ],
  exports: [JwtAuthGuard, JwtModule, PassportModule, AuthService],
})
export class AuthModule {}
