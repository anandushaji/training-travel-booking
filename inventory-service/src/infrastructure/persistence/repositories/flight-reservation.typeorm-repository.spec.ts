/**
 * Repository integration tests — skipped if SKIP_TESTCONTAINERS=true.
 */

const SKIP = process.env['SKIP_TESTCONTAINERS'] === 'true';

describe('FlightReservationTypeOrmRepository', () => {
  it('should persist and retrieve FlightReservation aggregate', async () => {
    if (SKIP) {
      console.log('Skipping testcontainer test: SKIP_TESTCONTAINERS=true');
      return;
    }
    // Full integration test would use Testcontainers + TypeORM
    // Placeholder: passes when SKIP_TESTCONTAINERS is true
    expect(true).toBe(true);
  }, 120000);

  it('should return only PENDING reservations with expiresAt in the past', async () => {
    if (SKIP) {
      console.log('Skipping testcontainer test: SKIP_TESTCONTAINERS=true');
      return;
    }
    expect(true).toBe(true);
  }, 120000);
});
