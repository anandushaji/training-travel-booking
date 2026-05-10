import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { server } from '../../../../mocks/server';

const { like, boolean } = MatchersV3;

const provider = new PactV3({
  consumer: 'frontend',
  provider: 'policy-service',
  dir: path.resolve(__dirname, '../../../../../pacts'),
  logLevel: 'error',
});

describe('policyApi consumer — GET /policies/validate returns compliant boolean', () => {
  // Stop MSW before Pact tests so Pact's mock server requests pass through
  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: 'error' }));

  it('returns compliant: true for an in-policy offer', async () => {
    await provider
      .given('offer offer-1 with amount 450 USD is within policy')
      .uponReceiving('a policy validation request')
      .withRequest({
        method: 'GET',
        path: '/policies/validate',
        query: {
          offerId: 'offer-1',
          amount: '450',
          currency: 'USD',
        },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like({
          compliant: boolean(true),
        }),
      })
      .executeTest(async (mockServer) => {
        const url = `${mockServer.url}/policies/validate?offerId=offer-1&amount=450&currency=USD`;
        const response = await fetch(url, {
          headers: { Authorization: 'Bearer test-token' },
        });
        expect(response.status).toBe(200);
        const body = await response.json() as { compliant: boolean };
        expect(typeof body.compliant).toBe('boolean');
      });
  });
});
