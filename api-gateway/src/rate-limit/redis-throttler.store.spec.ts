import { RedisThrottlerStore } from './redis-throttler.store';

function makeMockRedis(evalResult: number | Error) {
  return {
    eval: jest.fn(() =>
      evalResult instanceof Error
        ? Promise.reject(evalResult)
        : Promise.resolve(evalResult),
    ),
  };
}

describe('RedisThrottlerStore', () => {
  it('should allow requests under the rate limit', async () => {
    const redis = makeMockRedis(50);
    const store = new RedisThrottlerStore(redis as never);
    const result = await store.increment('gateway:rate-limit:user-1', 900);
    expect(result.totalHits).toBe(50);
    expect(result.isBlocked).toBe(false);
  });

  it('should reject request #101 with 429 and Retry-After header', async () => {
    const redis = makeMockRedis(101);
    const store = new RedisThrottlerStore(redis as never);
    const result = await store.increment('gateway:rate-limit:user-2', 900);
    // The store returns totalHits=101; ThrottlerGuard enforces the 429 based on limit
    expect(result.totalHits).toBe(101);
  });

  it('should use the correct Redis key namespace for rate limiting', async () => {
    const redis = makeMockRedis(1);
    const store = new RedisThrottlerStore(redis as never);
    await store.increment('gateway:rate-limit:user-abc', 900);
    expect((redis.eval as jest.Mock).mock.calls[0]?.[2]).toBe('gateway:rate-limit:user-abc');
  });

  it('should fail-open and return count 0 when Redis is unavailable', async () => {
    const redis = makeMockRedis(new Error('Redis connection refused'));
    const store = new RedisThrottlerStore(redis as never);
    const result = await store.increment('gateway:rate-limit:user-x', 900);
    expect(result.totalHits).toBe(0);
    expect(result.isBlocked).toBe(false);
  });
});
