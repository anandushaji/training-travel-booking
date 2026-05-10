import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { server } from '../../../../mocks/server';

const { like, string, decimal } = MatchersV3;

const provider = new PactV3({
  consumer: 'frontend',
  provider: 'booking-service',
  dir: path.resolve(__dirname, '../../../../../pacts'),
  logLevel: 'error',
});

describe('bookingApi consumer — POST /bookings matches expected schema', () => {
  // Stop MSW before Pact tests so Pact's mock server requests pass through
  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: 'error' }));

  it('creates a booking and returns 201 Booking with PENDING status', async () => {
    await provider
      .given('traveler is authenticated and flight offer exists')
      .uponReceiving('a create booking request')
      .withRequest({
        method: 'POST',
        path: '/bookings',
        headers: { 'Content-Type': 'application/json' },
        body: {
          travelerId: string('traveler-uuid'),
          flightOfferId: string('offer-1'),
          itinerary: like({
            origin: string('JFK'),
            destination: string('LAX'),
            departureDate: string('2026-06-01'),
            cabinClass: string('ECONOMY'),
            passengers: 1,
          }),
          paymentMethod: string('CORPORATE_CARD'),
        },
      })
      .willRespondWith({
        status: 201,
        headers: { 'Content-Type': 'application/json' },
        body: like({
          id: string('booking-uuid'),
          travelerId: string('traveler-uuid'),
          flightOfferId: string('offer-1'),
          status: string('PENDING'),
          itinerary: like({
            origin: string('JFK'),
            destination: string('LAX'),
            departureDate: string('2026-06-01'),
            cabinClass: string('ECONOMY'),
            passengers: 1,
          }),
          totalAmount: decimal(450.0),
          currency: string('USD'),
          createdAt: string('2026-06-01T10:00:00Z'),
          updatedAt: string('2026-06-01T10:00:00Z'),
        }),
      })
      .executeTest(async (mockServer) => {
        const url = `${mockServer.url}/bookings`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer test-token',
          },
          body: JSON.stringify({
            travelerId: 'traveler-uuid',
            flightOfferId: 'offer-1',
            itinerary: {
              origin: 'JFK',
              destination: 'LAX',
              departureDate: '2026-06-01',
              cabinClass: 'ECONOMY',
              passengers: 1,
            },
            paymentMethod: 'CORPORATE_CARD',
          }),
        });
        expect(response.status).toBe(201);
        const body = await response.json() as Record<string, unknown>;
        expect(typeof body.id).toBe('string');
        expect(body.status).toBe('PENDING');
        expect(typeof body.travelerId).toBe('string');
        expect(typeof body.flightOfferId).toBe('string');
        expect(typeof (body.itinerary as Record<string, unknown>).origin).toBe('string');
        expect(typeof (body.itinerary as Record<string, unknown>).destination).toBe('string');
        expect(typeof body.totalAmount).toBe('number');
        expect(typeof body.currency).toBe('string');
      });
  });
});
