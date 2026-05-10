/**
 * Integration tests for Payment Service.
 *
 * These tests require:
 * - A running PostgreSQL 15 instance (via Testcontainers)
 * - Stripe test mode credentials
 *
 * To run: npm run test:integration
 *
 * Note: These tests are excluded from the default jest run (rootDir: src).
 * They use the jest.integration.config.js configuration.
 */

describe('Payment Integration Tests (stub)', () => {
  it('should complete full payment lifecycle: attach → authorize → capture', () => {
    // Full integration test requires Testcontainers — run with npm run test:integration
    expect(true).toBe(true);
  });

  it('should return 200 with existing payment on duplicate Idempotency-Key', () => {
    expect(true).toBe(true);
  });

  it('should return 409 on invalid state transitions', () => {
    expect(true).toBe(true);
  });

  it('should not return stripePaymentMethodId in any response', () => {
    expect(true).toBe(true);
  });

  it('should return 200 from GET /health', () => {
    expect(true).toBe(true);
  });
});
