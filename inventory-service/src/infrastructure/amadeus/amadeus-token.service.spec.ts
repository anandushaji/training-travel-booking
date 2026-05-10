import { ConfigService } from '@nestjs/config';
import { AmadeusTokenService } from './amadeus-token.service';

jest.mock('axios');
import axios from 'axios';

const mockAxiosPost = axios.post as jest.MockedFunction<typeof axios.post>;

const makeConfig = (): ConfigService => {
  const cfg = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        AMADEUS_BASE_URL: 'https://test.api.amadeus.com',
        AMADEUS_CLIENT_ID: 'test-client-id',
        AMADEUS_CLIENT_SECRET: 'test-client-secret',
      };
      return map[key];
    }),
  } as unknown as ConfigService;
  return cfg;
};

describe('AmadeusTokenService', () => {
  let service: AmadeusTokenService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AmadeusTokenService(makeConfig());
  });

  it('should return cached token without HTTP call when token is still valid', async () => {
    // Seed cache via first call
    mockAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'token-1', expires_in: 1800 },
    });
    const first = await service.getToken();
    expect(first).toBe('token-1');

    // Second call — cache is still valid, no HTTP call
    mockAxiosPost.mockClear();
    const second = await service.getToken();
    expect(second).toBe('token-1');
    expect(mockAxiosPost).not.toHaveBeenCalled();
  });

  it('should refresh token when within 60s of expiry', async () => {
    // Seed cache that expires in 30s (within 60s threshold)
    mockAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'token-expiring', expires_in: 30 },
    });
    await service.getToken();

    // Now advance time — mock returns new token
    mockAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'token-refreshed', expires_in: 1800 },
    });
    const newToken = await service.getToken();
    expect(newToken).toBe('token-refreshed');
    expect(mockAxiosPost).toHaveBeenCalledTimes(2);
  });

  it('should make only one token request when called concurrently with empty cache', async () => {
    let resolvePost!: (value: unknown) => void;
    const postPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });
    mockAxiosPost.mockReturnValueOnce(postPromise as ReturnType<typeof axios.post>);

    // Start two concurrent calls
    const p1 = service.getToken();
    const p2 = service.getToken();

    resolvePost({ data: { access_token: 'concurrent-token', expires_in: 1800 } });

    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('concurrent-token');
    expect(r2).toBe('concurrent-token');
    expect(mockAxiosPost).toHaveBeenCalledTimes(1);
  });

  it('should use empty string for clientId and clientSecret when config returns undefined', async () => {
    const emptyConfig = {
      get: jest.fn().mockReturnValue(undefined),
    } as unknown as import('@nestjs/config').ConfigService;
    const emptyService = new AmadeusTokenService(emptyConfig);

    mockAxiosPost.mockResolvedValueOnce({
      data: { access_token: 'token-empty-creds', expires_in: 1800 },
    });

    const token = await emptyService.getToken();
    expect(token).toBe('token-empty-creds');

    // The POST should have been called with empty clientId/clientSecret
    const callArgs = mockAxiosPost.mock.calls[0];
    expect(callArgs?.[0]).toContain('/v1/security/oauth2/token');
    // Body should contain empty client_id / client_secret
    const body = callArgs?.[1] as string;
    expect(body).toContain('client_id=');
    expect(body).toContain('client_secret=');
  });
});
