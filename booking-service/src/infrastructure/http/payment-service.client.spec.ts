// @ts-nocheck
import * as prom from 'prom-client';

// ── Top-level mocks (hoisted by ts-jest before any imports) ─────────────────

jest.mock('axios-retry', () => ({
  __esModule: true,
  default: jest.fn(),
  isNetworkOrIdempotentRequestError: jest.fn().mockReturnValue(true),
}));

jest.mock('opossum', () => jest.fn());

// ────────────────────────────────────────────────────────────────────────────

describe('PaymentServiceClient', () => {
  let PaymentServiceClient: any;
  let mockConfig: any;
  let mockMetrics: any;

  beforeEach(() => {
    prom.register.clear();
    jest.clearAllMocks();

    // Default: authorize breaker returns AUTHORIZED; capture/refund resolve void
    (require('opossum') as jest.Mock)
      .mockImplementationOnce((_fn: any, _opts: any) => ({
        fire: jest.fn().mockResolvedValue({ paymentId: 'PAY-001', status: 'AUTHORIZED' }),
        fallback: jest.fn(),
        on: jest.fn(),
      }))
      .mockImplementationOnce((_fn: any, _opts: any) => ({
        fire: jest.fn().mockResolvedValue(undefined),
        fallback: jest.fn(),
        on: jest.fn(),
      }))
      .mockImplementationOnce((_fn: any, _opts: any) => ({
        fire: jest.fn().mockResolvedValue(undefined),
        fallback: jest.fn(),
        on: jest.fn(),
      }));

    PaymentServiceClient = require('./payment-service.client').PaymentServiceClient;

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'PAYMENT_SERVICE_URL') return 'http://localhost:3004';
        if (key === 'PAYMENT_READ_TIMEOUT_MS') return 5000;
        return undefined;
      }),
    };
    mockMetrics = {
      incrementDownstreamRetries: jest.fn(),
      setDownstreamCbState: jest.fn(),
    };
  });

  it('authorizePayment returns paymentId', async () => {
    const client = new PaymentServiceClient(mockConfig, mockMetrics);
    const result = await client.authorizePayment('book-1', 'trav-1', 450, 'USD', 'corr-1');
    expect(result.paymentId).toBe('PAY-001');
  });

  it('capturePayment resolves on 200', async () => {
    const client = new PaymentServiceClient(mockConfig, mockMetrics);
    await expect(client.capturePayment('PAY-001', 'corr-1')).resolves.not.toThrow();
  });

  it('refundPayment resolves on 200', async () => {
    const client = new PaymentServiceClient(mockConfig, mockMetrics);
    await expect(client.refundPayment('PAY-001', 'corr-1')).resolves.not.toThrow();
  });

  it('throws when CB open', async () => {
    const client = new PaymentServiceClient(mockConfig, mockMetrics);
    // Directly replace the authorize breaker to simulate CB open
    (client as any).authorizeBreaker = {
      fire: jest.fn().mockRejectedValue(new Error('CB open')),
    };
    await expect(
      client.authorizePayment('book-1', 'trav-1', 450, 'USD', 'corr-1'),
    ).rejects.toBeDefined();
  });

  it('retryCondition returns false for 4xx non-429 errors', () => {
    new PaymentServiceClient(mockConfig, mockMetrics);
    const axiosRetryMock = require('axios-retry').default;
    const { retryCondition } = axiosRetryMock.mock.calls[0][1];

    const result = retryCondition({ response: { status: 400 } });

    expect(result).toBe(false);
    expect(mockMetrics.incrementDownstreamRetries).not.toHaveBeenCalled();
  });

  it('retryCondition increments metrics for 5xx errors', () => {
    new PaymentServiceClient(mockConfig, mockMetrics);
    const axiosRetryMock = require('axios-retry').default;
    const { retryCondition } = axiosRetryMock.mock.calls[0][1];

    retryCondition({ response: { status: 500 } });

    expect(mockMetrics.incrementDownstreamRetries).toHaveBeenCalledWith('payment');
  });

  it('retryCondition increments metrics for 429', () => {
    new PaymentServiceClient(mockConfig, mockMetrics);
    const axiosRetryMock = require('axios-retry').default;
    const { retryCondition } = axiosRetryMock.mock.calls[0][1];

    retryCondition({ response: { status: 429 } });

    expect(mockMetrics.incrementDownstreamRetries).toHaveBeenCalledWith('payment');
  });

  it('halfOpen and close event handlers update CB state metric', () => {
    // resetAllMocks clears the mockImplementationOnce queue so our new mockImplementation takes effect
    jest.resetAllMocks();

    // Re-create metrics mock after reset (implementations were wiped)
    mockMetrics = {
      incrementDownstreamRetries: jest.fn(),
      setDownstreamCbState: jest.fn(),
    };

    const eventHandlers: Record<string, () => void> = {};
    (require('opossum') as jest.Mock).mockImplementation((_fn: any, _opts: any) => ({
      fire: jest.fn(),
      fallback: jest.fn(),
      on: jest.fn((event: string, cb: () => void) => {
        eventHandlers[event] = cb;
      }),
    }));

    new PaymentServiceClient(mockConfig, mockMetrics);

    eventHandlers['halfOpen']?.();
    eventHandlers['close']?.();

    expect(mockMetrics.setDownstreamCbState).toHaveBeenCalledWith('payment', 'half-open');
    expect(mockMetrics.setDownstreamCbState).toHaveBeenCalledWith('payment', 'closed');
  });
});
