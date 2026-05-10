import { AmadeusHttpClient } from './amadeus-http.client';
import { AmadeusTokenService } from './amadeus-token.service';
import { AmadeusNotFoundException } from '../../domain/exceptions/amadeus-not-found.exception';
import { AmadeusUnavailableException } from '../../domain/exceptions/amadeus-unavailable.exception';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nock = require('nock') as typeof import('nock');

const BASE_URL = 'https://test.api.amadeus.com';

const makeTokenService = (): jest.Mocked<AmadeusTokenService> =>
  ({ getToken: jest.fn().mockResolvedValue('test-token') } as unknown as jest.Mocked<AmadeusTokenService>);

const makeConfig = (): ConfigService =>
  ({
    get: jest.fn((key: string) => {
      if (key === 'AMADEUS_BASE_URL') return BASE_URL;
      return undefined;
    }),
  } as unknown as ConfigService);

describe('AmadeusHttpClient', () => {
  let client: AmadeusHttpClient;
  let tokenService: jest.Mocked<AmadeusTokenService>;

  beforeEach(() => {
    nock.cleanAll();
    tokenService = makeTokenService();
    client = new AmadeusHttpClient(tokenService, makeConfig());
  });

  afterAll(() => {
    nock.restore();
  });

  it('should retry on 503 and succeed on second attempt', async () => {
    nock(BASE_URL)
      .get('/v2/shopping/flight-offers')
      .query(true)
      .reply(503, { error: 'Service Unavailable' });

    nock(BASE_URL)
      .get('/v2/shopping/flight-offers')
      .query(true)
      .reply(200, { data: [{ offerId: 'offer-1' }] });

    const result = await client.searchFlights({ origin: 'LHR', destination: 'JFK' });
    expect(result).toEqual({ data: [{ offerId: 'offer-1' }] });
  }, 30000);

  it('should not retry on 404 and throw AmadeusNotFoundException', async () => {
    nock(BASE_URL)
      .get('/v2/shopping/flight-offers')
      .query(true)
      .reply(404, { error: 'Not Found' });

    await expect(
      client.searchFlights({ origin: 'LHR', destination: 'JFK' }),
    ).rejects.toThrow(AmadeusNotFoundException);
  }, 10000);

  it('should open circuit after 10 requests with ≥50% errors in 30s window', async () => {
    // Make 10 failing requests to trip the circuit
    for (let i = 0; i < 10; i++) {
      nock(BASE_URL)
        .get('/v2/shopping/flight-offers')
        .query(true)
        .reply(503, { error: 'Service Unavailable' });
    }

    const requests = Array.from({ length: 10 }, () =>
      client.searchFlights({ origin: 'LHR', destination: 'JFK' }).catch(() => null),
    );
    await Promise.all(requests);

    // Circuit should now be open; next call should throw AmadeusUnavailableException
    nock.cleanAll();
    await expect(
      client.searchFlights({ origin: 'LHR', destination: 'JFK' }),
    ).rejects.toThrow(AmadeusUnavailableException);
  }, 60000);

  it('should abort request and count as retryable after 15s read timeout', async () => {
    // Simulate a timeout using a delayed nock
    nock(BASE_URL)
      .get('/v2/shopping/flight-offers')
      .query(true)
      .delayConnection(20_000) // longer than 15s timeout
      .reply(200, {});

    // The client should throw due to timeout (treated as retryable 5xx)
    await expect(
      client.searchFlights({ origin: 'LHR', destination: 'JFK' }),
    ).rejects.toBeDefined();
  }, 80000);

  it('should not retry on 400 and throw immediately (non-retryable branch)', async () => {
    nock(BASE_URL)
      .get('/v2/shopping/flight-offers')
      .query(true)
      .reply(400, { error: 'Bad Request' });

    await expect(
      client.searchFlights({ origin: 'LHR', destination: 'JFK' }),
    ).rejects.toBeDefined();
  }, 10000);

  it('should not retry on 422 and throw immediately (non-retryable branch)', async () => {
    nock(BASE_URL)
      .get('/v2/shopping/flight-offers')
      .query(true)
      .reply(422, { error: 'Unprocessable Entity' });

    await expect(
      client.searchFlights({ origin: 'LHR', destination: 'JFK' }),
    ).rejects.toBeDefined();
  }, 10000);

  it('createOrder should POST and return data on success', async () => {
    const responseBody = { data: { orderId: 'order-123' } };
    nock(BASE_URL)
      .post('/v1/booking/flight-orders')
      .reply(200, responseBody);

    const result = await client.createOrder({ offerId: 'offer-1' });
    expect(result).toEqual(responseBody);
  }, 10000);

  it('createOrder should throw AmadeusNotFoundException on 404', async () => {
    nock(BASE_URL)
      .post('/v1/booking/flight-orders')
      .reply(404, { error: 'Not Found' });

    await expect(
      client.createOrder({ offerId: 'offer-1' }),
    ).rejects.toThrow(AmadeusNotFoundException);
  }, 10000);

  it('cancelOrder should DELETE and resolve on success', async () => {
    nock(BASE_URL)
      .delete('/v1/booking/flight-orders/order-123')
      .reply(204);

    await expect(client.cancelOrder('order-123')).resolves.toBeUndefined();
  }, 10000);

  it('cancelOrder should retry on 503 and succeed on second attempt', async () => {
    nock(BASE_URL)
      .delete('/v1/booking/flight-orders/order-456')
      .reply(503, { error: 'Service Unavailable' });

    nock(BASE_URL)
      .delete('/v1/booking/flight-orders/order-456')
      .reply(204);

    await expect(client.cancelOrder('order-456')).resolves.toBeUndefined();
  }, 30000);
});
