import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ProxyHttpClient } from '../routing/proxy-http.client';
import { Role } from '../common/enums/role.enum';
import { createHash } from 'crypto';

function makeRedisMock() {
  const store: Record<string, string> = {};
  return {
    get: jest.fn(async (key: string) => store[key] ?? null),
    set: jest.fn(async (key: string, value: string, ...args: unknown[]) => {
      // Handle NX flag: only set if not exists
      const nxIndex = args.indexOf('NX');
      if (nxIndex !== -1) {
        if (store[key]) return null;
      }
      store[key] = value;
      return 'OK';
    }),
    del: jest.fn(async (key: string) => {
      delete store[key];
      return 1;
    }),
    getdel: jest.fn(async (key: string) => {
      const val = store[key] ?? null;
      if (val) delete store[key];
      return val;
    }),
    _store: store,
  };
}

function makeJwtService(): jest.Mocked<JwtService> {
  const service = {
    sign: jest.fn((payload: object, opts?: object) => {
      return `mocked.jwt.${JSON.stringify(payload)}`;
    }),
    verify: jest.fn((token: string) => {
      if (token.startsWith('expired')) throw new Error('expired');
      // Decode mock token payload
      const parts = token.split('.');
      if (parts.length === 3) {
        try {
          return JSON.parse(parts[2] ?? '{}') as { sub: string; email: string; role: Role };
        } catch {
          throw new Error('invalid');
        }
      }
      throw new Error('invalid');
    }),
    decode: jest.fn((token: string) => {
      // Mock token format: "mocked.jwt.<JSON>" — parse last segment for payload
      const parts = token.split('mocked.jwt.');
      const jsonStr = parts[1] ?? '{}';
      try {
        return { ...JSON.parse(jsonStr), iat: 1000000, exp: 1028800 };
      } catch {
        return { iat: 1000000, exp: 1028800 };
      }
    }),
  } as unknown as jest.Mocked<JwtService>;
  return service;
}

function makeConfigService(): jest.Mocked<ConfigService> {
  return {
    get: jest.fn((key: string) => {
      const map: Record<string, unknown> = {
        JWT_EXPIRY: 28800,
        REFRESH_TOKEN_EXPIRY: 604800,
        TRAVELER_SERVICE_URL: 'http://traveler:3003',
      };
      return map[key];
    }),
  } as unknown as jest.Mocked<ConfigService>;
}

describe('AuthService', () => {
  let service: AuthService;
  let redis: ReturnType<typeof makeRedisMock>;
  let jwtService: jest.Mocked<JwtService>;
  let proxyClient: jest.Mocked<ProxyHttpClient>;

  beforeEach(() => {
    redis = makeRedisMock();
    jwtService = makeJwtService();
    proxyClient = {
      request: jest.fn(),
    } as unknown as jest.Mocked<ProxyHttpClient>;

    service = new AuthService(
      jwtService,
      makeConfigService(),
      proxyClient,
      redis as never,
    );
  });

  it('should return cached response on duplicate login within 30s idempotency window', async () => {
    const travelerResponse = {
      data: { userId: 'u-1', email: 'alice@corp.com', role: Role.EMPLOYEE },
    };
    proxyClient.request.mockResolvedValue(travelerResponse as never);

    const result1 = await service.login('alice@corp.com', 'pass1234', 'corr-1', 'idem-key-1');
    expect(result1.accessToken).toBeDefined();

    // Second call with same idempotency key — should return cached result, not call proxy again
    const result2 = await service.login('alice@corp.com', 'pass1234', 'corr-1', 'idem-key-1');
    expect(proxyClient.request).toHaveBeenCalledTimes(1);
    expect(result2.accessToken).toBe(result1.accessToken);
  });

  it('should return 401 when the old refresh token is used after rotation', async () => {
    // Issue a refresh token (simulated)
    const oldRefreshToken = 'old.refresh.token.payload';
    const userId = 'u-1';
    await service.storeRefreshToken(oldRefreshToken, userId);

    // Rotate: lookup + delete
    const foundUserId = await service.lookupRefreshToken(oldRefreshToken);
    expect(foundUserId).toBe(userId);

    // Now old token's Redis key is deleted (GETDEL). Use it again → should be null
    const secondLookup = await service.lookupRefreshToken(oldRefreshToken);
    expect(secondLookup).toBeNull();
  });

  it('should store SHA-256 hash of refresh token in Redis with TTL 604800 on login', async () => {
    proxyClient.request.mockResolvedValue({
      data: { userId: 'u-2', email: 'bob@corp.com', role: Role.MANAGER },
    } as never);

    await service.login('bob@corp.com', 'pass1234', 'corr-2', 'idem-key-2');

    const setCalls = (redis.set as jest.Mock).mock.calls as unknown[][];
    const refreshTokenSetCall = setCalls.find(
      (c) => typeof c[0] === 'string' && (c[0] as string).startsWith('gateway:refresh-token:'),
    );
    expect(refreshTokenSetCall).toBeDefined();
    // Verify key format: gateway:refresh-token:<64-char hex sha256>
    expect((refreshTokenSetCall?.[0] as string)).toMatch(/^gateway:refresh-token:[a-f0-9]{64}$/);
    // Verify TTL arg is 604800
    const exIndex = (refreshTokenSetCall as unknown[]).indexOf('EX');
    expect(exIndex).toBeGreaterThan(-1);
    expect((refreshTokenSetCall as unknown[])[exIndex + 1]).toBe(604800);
  });

  it('should throw ServiceUnavailableException when Redis is unavailable during lookupRefreshToken', async () => {
    (redis.getdel as jest.Mock).mockRejectedValueOnce(new Error('Redis connection refused'));

    await expect(service.lookupRefreshToken('any.token')).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('should issue a new access token and refresh token on valid refresh', async () => {
    const userId = 'u-refresh-1';
    // Put a token into the Redis store
    const rawRefresh = `mocked.jwt.${JSON.stringify({ sub: userId })}`;
    await service.storeRefreshToken(rawRefresh, userId);

    // jwtService.verify should return the payload for this mock token
    (jwtService.verify as jest.Mock).mockReturnValueOnce({ sub: userId, email: 'x@corp.com', role: Role.EMPLOYEE });

    const result = await service.refresh(rawRefresh);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.expiresIn).toBe(28800);
  });

  it('should throw UnauthorizedException when refresh token is expired (jwt.verify throws)', async () => {
    (jwtService.verify as jest.Mock).mockImplementationOnce(() => {
      throw new Error('jwt expired');
    });

    await expect(service.refresh('expired.refresh.token')).rejects.toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException when refresh token is not found in Redis (already used)', async () => {
    // Token verifies ok but not in Redis store
    (jwtService.verify as jest.Mock).mockReturnValueOnce({ sub: 'u-ghost', email: 'x@corp.com', role: Role.EMPLOYEE });
    // GETDEL returns null (key not found)
    (redis.getdel as jest.Mock).mockResolvedValueOnce(null);

    await expect(service.refresh('valid.but.not.stored')).rejects.toThrow(UnauthorizedException);
  });

  it('should fail-open on login idempotency Redis get error (proceed with login)', async () => {
    // First call to redis.get throws (idempotency check fails-open)
    (redis.get as jest.Mock).mockRejectedValueOnce(new Error('Redis unavailable'));
    proxyClient.request.mockResolvedValueOnce({
      data: { userId: 'u-failopen', email: 'fail@corp.com', role: Role.EMPLOYEE },
    } as never);

    const result = await service.login('fail@corp.com', 'pass1234', 'corr-x', 'idem-x');
    expect(result.accessToken).toBeDefined();
  });
});
