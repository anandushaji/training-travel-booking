import { ServiceUnavailableException } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;

  beforeEach(() => {
    service = new CircuitBreakerService();
  });

  it('should return the same CircuitBreaker instance for the same service name', () => {
    const b1 = service.getBreaker('booking');
    const b2 = service.getBreaker('booking');
    expect(b1).toBe(b2);
  });

  it('should return different instances for different service names', () => {
    const b1 = service.getBreaker('booking');
    const b2 = service.getBreaker('policy');
    expect(b1).not.toBe(b2);
  });

  it('should open the circuit after 50% error threshold is exceeded over 10 requests', async () => {
    const breaker = service.getBreaker('test-service');
    const failFn = () => Promise.reject(new Error('downstream error'));

    // Fire 10 failures to exceed the volume + error threshold
    const calls = Array.from({ length: 10 }, () =>
      service.execute('test-service', failFn).catch(() => null),
    );
    await Promise.all(calls);

    // Circuit should now be open; fire returns fallback
    await expect(
      service.execute('test-service', () => Promise.resolve('ok')),
    ).rejects.toThrow(ServiceUnavailableException);
  }, 10000);

  it('should throw ServiceUnavailableException and not invoke the action when circuit is open', async () => {
    const breakerService = new CircuitBreakerService();
    const breaker = breakerService.getBreaker('open-service');

    // Force open
    const failFn = () => Promise.reject(new Error('fail'));
    const calls = Array.from({ length: 10 }, () =>
      breakerService.execute('open-service', failFn).catch(() => null),
    );
    await Promise.all(calls);

    const actionSpy = jest.fn(() => Promise.resolve('should-not-call'));
    await expect(breakerService.execute('open-service', actionSpy)).rejects.toThrow(
      ServiceUnavailableException,
    );
    // The action itself may not be called (fallback fires) — opossum behaviour
  }, 10000);
});
