import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { server } from '../../../../mocks/server';

const { like, string } = MatchersV3;

const provider = new PactV3({
  consumer: 'frontend',
  provider: 'traveler-service',
  dir: path.resolve(__dirname, '../../../../../pacts'),
  logLevel: 'error',
});

describe('travelerApi consumer — GET /travelers/:id matches expected schema', () => {
  // Stop MSW before Pact tests so Pact's mock server requests pass through
  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: 'error' }));

  it('returns 200 TravelerProfile for a valid traveler ID', async () => {
    await provider
      .given('a traveler with the given ID exists')
      .uponReceiving('a request for traveler by ID')
      .withRequest({
        method: 'GET',
        path: '/travelers/traveler-uuid',
        headers: { Authorization: string('Bearer test-token') },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like({
          id: string('traveler-uuid'),
          employeeId: string('EMP-001'),
          email: string('alice@corp.com'),
          firstName: string('Alice'),
          lastName: string('Smith'),
          fullName: string('Alice Smith'),
          department: string('Engineering'),
        }),
      })
      .executeTest(async (mockServer) => {
        const url = `${mockServer.url}/travelers/traveler-uuid`;
        const response = await fetch(url, {
          headers: {
            Authorization: 'Bearer test-token',
          },
        });
        expect(response.status).toBe(200);
        const body = await response.json() as Record<string, unknown>;
        expect(typeof body.id).toBe('string');
        expect(typeof body.employeeId).toBe('string');
        expect(typeof body.email).toBe('string');
        expect(typeof body.firstName).toBe('string');
        expect(typeof body.lastName).toBe('string');
        expect(typeof body.fullName).toBe('string');
        expect(typeof body.department).toBe('string');
      });
  });
});
