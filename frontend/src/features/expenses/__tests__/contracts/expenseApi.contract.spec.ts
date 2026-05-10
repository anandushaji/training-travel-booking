import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import path from 'path';
import { server } from '../../../../mocks/server';

const { like, string, decimal } = MatchersV3;

const provider = new PactV3({
  consumer: 'frontend',
  provider: 'expense-service',
  dir: path.resolve(__dirname, '../../../../../pacts'),
  logLevel: 'error',
});

describe('expenseApi consumer — GET /receipts/:id matches expected schema', () => {
  // Stop MSW before Pact tests so Pact's mock server requests pass through
  beforeAll(() => server.close());
  afterAll(() => server.listen({ onUnhandledRequest: 'error' }));

  it('returns 200 Receipt for a valid receipt ID', async () => {
    await provider
      .given('a receipt with the given ID exists')
      .uponReceiving('a request for receipt by ID')
      .withRequest({
        method: 'GET',
        path: '/receipts/receipt-uuid',
        headers: { Authorization: string('Bearer test-token') },
      })
      .willRespondWith({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: like({
          id: string('receipt-uuid'),
          receiptNumber: string('RCP-2026-001'),
          bookingId: string('booking-uuid'),
          amount: decimal(450.00),
          currency: string('USD'),
          pdfUrl: string('https://s3.example.com/receipts/RCP-2026-001.pdf'),
        }),
      })
      .executeTest(async (mockServer) => {
        const url = `${mockServer.url}/receipts/receipt-uuid`;
        const response = await fetch(url, {
          headers: {
            Authorization: 'Bearer test-token',
          },
        });
        expect(response.status).toBe(200);
        const body = await response.json() as Record<string, unknown>;
        expect(typeof body.id).toBe('string');
        expect(typeof body.receiptNumber).toBe('string');
        expect(typeof body.bookingId).toBe('string');
        expect(typeof body.amount).toBe('number');
        expect(typeof body.currency).toBe('string');
        expect(typeof body.pdfUrl).toBe('string');
      });
  });
});
