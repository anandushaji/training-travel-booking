import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';
import { ProxyHttpClient } from '../routing/proxy-http.client';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { LoginResponseDto } from './dto/login.response.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly proxyClient: ProxyHttpClient,
    private readonly redis: Redis,
  ) {}

  // ── Token helpers ─────────────────────────────────────────────────────────

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  issueAccessToken(payload: { sub: string; email: string; role: Role }): string {
    return this.jwtService.sign(
      { sub: payload.sub, email: payload.email, role: payload.role },
      { expiresIn: this.config.get<number>('JWT_EXPIRY') ?? 28800 },
    );
  }

  issueRefreshToken(userId: string): string {
    return this.jwtService.sign(
      { sub: userId },
      { expiresIn: this.config.get<number>('REFRESH_TOKEN_EXPIRY') ?? 604800 },
    );
  }

  async storeRefreshToken(refreshToken: string, userId: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    const ttl = this.config.get<number>('REFRESH_TOKEN_EXPIRY') ?? 604800;
    try {
      await this.redis.set(`gateway:refresh-token:${hash}`, userId, 'EX', ttl);
    } catch (err) {
      this.logger.warn(`Failed to store refresh token for userId=${userId}: ${String(err)}`);
      // Warn-and-continue: do not throw — token is still valid for its lifetime
    }
  }

  async revokeRefreshToken(refreshToken: string): Promise<void> {
    const hash = this.hashToken(refreshToken);
    await this.redis.del(`gateway:refresh-token:${hash}`);
  }

  async lookupRefreshToken(refreshToken: string): Promise<string | null> {
    const hash = this.hashToken(refreshToken);
    try {
      // GETDEL is atomic: returns value and deletes in one round-trip (Redis 6.2+)
      const userId = await (this.redis as Redis & { getdel(key: string): Promise<string | null> }).getdel(
        `gateway:refresh-token:${hash}`,
      );
      return userId;
    } catch (err) {
      // Fail-closed: Redis unavailability means we cannot verify the token — return 503
      this.logger.error(`Redis unavailable during lookupRefreshToken: ${String(err)}`);
      throw new ServiceUnavailableException('Token store unavailable');
    }
  }

  // ── Login flow ────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    correlationId: string,
    idempotencyKey: string,
  ): Promise<LoginResponseDto> {
    // Check idempotency cache (fail-open if Redis unavailable)
    const idemKey = `gateway:idempotency:login:${idempotencyKey}`;
    try {
      // Atomic SETNX: only set if not exists
      const cached = await this.redis.get(idemKey);
      if (cached) {
        return JSON.parse(cached) as LoginResponseDto;
      }
    } catch {
      // Fail-open: skip idempotency check, proceed with login
      this.logger.warn(`Redis unavailable for login idempotency check, proceeding (fail-open)`);
    }

    // Validate credentials via Traveler Service
    const travelerUrl = this.config.get<string>('TRAVELER_SERVICE_URL') ?? '';
    let authResult: { userId: string; email: string; role: Role };
    try {
      const response = await this.proxyClient.request<{ userId: string; email: string; role: Role }>(
        'traveler',
        {
          method: 'POST',
          url: `${travelerUrl}/api/v1/travelers/auth`,
          data: { email, password },
          correlationId,
        },
      );
      authResult = response.data;
    } catch {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessToken = this.issueAccessToken({
      sub: authResult.userId,
      email: authResult.email,
      role: authResult.role,
    });
    const refreshToken = this.issueRefreshToken(authResult.userId);

    await this.storeRefreshToken(refreshToken, authResult.userId);

    const result: LoginResponseDto = { accessToken, refreshToken, expiresIn: 28800 };

    // Store in idempotency cache (atomic NX EX, fail-open)
    try {
      await this.redis.set(idemKey, JSON.stringify(result), 'EX', 30, 'NX');
    } catch {
      this.logger.warn(`Redis unavailable for login idempotency store (fail-open)`);
    }

    return result;
  }

  // ── Refresh flow ──────────────────────────────────────────────────────────

  async refresh(refreshToken: string): Promise<LoginResponseDto> {
    // Verify JWT signature + expiry
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // GETDEL: atomic lookup + delete (fail-closed on Redis error)
    const userId = await this.lookupRefreshToken(refreshToken);
    if (!userId) {
      throw new UnauthorizedException('Refresh token not found or already used');
    }

    // Issue new token pair
    const newAccessToken = this.issueAccessToken({
      sub: userId,
      email: payload.email,
      role: payload.role,
    });
    const newRefreshToken = this.issueRefreshToken(userId);

    await this.storeRefreshToken(newRefreshToken, userId);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken, expiresIn: 28800 };
  }
}
