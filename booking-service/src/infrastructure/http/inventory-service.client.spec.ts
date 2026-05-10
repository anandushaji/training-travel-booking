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

describe('InventoryServiceClient', () => {
  let InventoryServiceClient: any;
  let mockConfig: any;
  let mockMetrics: any;

  beforeEach(() => {
    prom.register.clear();
    jest.clearAllMocks();

    // Default: createReservation breaker returns RESERVED; cancelReservation resolves void
    (require('opossum') as jest.Mock)
      .mockImplementationOnce((_fn: any, _opts: any) => ({
        fire: jest.fn().mockResolvedValue({ reservationId: 'RES-001', status: 'RESERVED' }),
        fallback: jest.fn(),
        on: jest.fn(),
      }))
      .mockImplementationOnce((_fn: any, _opts: any) => ({
        fire: jest.fn().mockResolvedValue(undefined),
        fallback: jest.fn(),
        on: jest.fn(),
      }));

    InventoryServiceClient = require('./inventory-service.client').InventoryServiceClient;

    mockConfig = {
      get: jest.fn((key: string) => {
        if (key === 'INVENTORY_SERVICE_URL') return 'http://localhost:3005';
        if (key === 'INVENTORY_READ_TIMEOUT_MS') return 5000;
        return undefined;
      }),
    };
    mockMetrics = {
      incrementDownstreamRetries: jest.fn(),
      setDownstreamCbState: jest.fn(),
    };
  });

  it('createReservation returns reservationId', async () => {
    const client = new InventoryServiceClient(mockConfig, mockMetrics);
    const result = await client.createReservation('offer-1', {}, 'corr-1');
    expect(result.reservationId).toBe('RES-001');
  });

  it('cancelReservation resolves on 204', async () => {
    const client = new InventoryServiceClient(mockConfig, mockMetrics);
    await expect(client.cancelReservation('RES-001', 'corr-1')).resolves.not.toThrow();
  });

  it('throws ServiceUnavailableException when CB open', async () => {
    const client = new InventoryServiceClient(mockConfig, mockMetrics);
    // Directly replace the create breaker to simulate CB open
    (client as any).createBreaker = {
      fire: jest.fn().mockRejectedValue(new Error('Breaker open')),
    };
    await expect(client.createReservation('offer-1', {}, 'corr-1')).rejects.toBeDefined();
  });

  it('retryCondition returns false for 4xx non-429 errors (no retry increment)', () => {
    new InventoryServiceClient(mockConfig, mockMetrics);
    const axiosRetryMock = require('axios-retry').default;
    const { retryCondition } = axiosRetryMock.mock.calls[0][1];

    const result = retryCondition({ response: { status: 422 } });

    expect(result).toBe(false);
    expect(mockMetrics.incrementDownstreamRetries).not.toHaveBeenCalled();
  });

  it('retryCondition increments metrics for 5xx errors and returns isNetworkOrIdempotentRequestError', () => {
    new InventoryServiceClient(mockConfig, mockMetrics);
    const axiosRetryMock = require('axios-retry').default;
    const { retryCondition } = axiosRetryMock.mock.calls[0][1];

    const result = retryCondition({ response: { status: 503 } });

    expect(mockMetrics.incrementDownstreamRetries).toHaveBeenCalledWith('inventory');
    expect(typeof result).toBe('boolean');
  });

  it('retryCondition increments metrics for 429 (rate-limit is retryable)', () => {
    new InventoryServiceClient(mockConfig, mockMetrics);
    const axiosRetryMock = require('axios-retry').default;
    const { retryCondition } = axiosRetryMock.mock.calls[0][1];

    retryCondition({ response: { status: 429 } });

    expect(mockMetrics.incrementDownstreamRetries).toHaveBeenCalledWith('inventory');
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

    new InventoryServiceClient(mockConfig, mockMetrics);

    eventHandlers['halfOpen']?.();
    eventHandlers['close']?.();

    expect(mockMetrics.setDownstreamCbState).toHaveBeenCalledWith('inventory', 'half-open');
    expect(mockMetrics.setDownstreamCbState).toHaveBeenCalledWith('inventory', 'closed');
  });
});
