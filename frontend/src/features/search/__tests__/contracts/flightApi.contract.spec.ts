import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { server } from '../../../../mocks/server';

const { like, eachLike, integer, string } = MatchersV3;

const provider = new PactV3({
  consumer: 'frontend',
  provider: 'inventory-service',
  dir: path.resolve(__dirname, '../../../../../pacts'),
  logLevel: 'error',
});

describe('flightApi consumer — GET /inventory/flights/search matches expected schema', () => {
  // Stop MSW before Pact tests so Pact's mock server requests pass through
  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: 'error' }));

  it('returns offers array with required fields', async () => {
    await provider
      .given('flights available for JFK to LAX on 2026-06-01')
      .uponReceiving('a search request for flights')
      .withRequest({
        method: 'GET',
        path: '/inventory/flights/search',
        query: {
          origin: 'JFK',
          destination: 'LAX',
          departureDate: '2026-06-01',
          adults: '1',
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          offers: eachLike({
            id: string('offer-1'),
            airline: string('American Airlines'),
            origin: string('JFK'),
            destination: string('LAX'),
            departureTime: string('2026-06-01T10:00:00Z'),
            arrivalTime: string('2026-06-01T15:30:00Z'),
            price: like({
              amount: integer(450),
              currency: string('USD'),
            }),
            stops: integer(0),
            duration: string('5h 30m'),
          }),
          meta: like({
            count: integer(1),
            cached: false,
            searchId: string('test-search-id'),
          }),
        },
      })
      .executeTest(async (mockServer) => {
        const url = `${mockServer.url}/inventory/flights/search?origin=JFK&destination=LAX&departureDate=2026-06-01&adults=1`;
        const response = await fetch(url, {
          headers: { Authorization: 'Bearer test-token' },
        });
        expect(response.status).toBe(200);
        const body = await response.json() as { offers: unknown[]; meta: unknown };
        expect(Array.isArray(body.offers)).toBe(true);
        expect(body.offers.length).toBeGreaterThan(0);
        const offer = body.offers[0] as Record<string, unknown>;
        expect(typeof offer.id).toBe('string');
        expect(typeof offer.airline).toBe('string');
        expect(typeof offer.origin).toBe('string');
        expect(typeof offer.destination).toBe('string');
        expect(typeof offer.departureTime).toBe('string');
        expect(typeof offer.arrivalTime).toBe('string');
        expect(typeof (offer.price as Record<string, unknown>).amount).toBe('number');
        expect(typeof (offer.price as Record<string, unknown>).currency).toBe('string');
        expect(typeof offer.stops).toBe('number');
        expect(typeof offer.duration).toBe('string');
      });
  });
});
