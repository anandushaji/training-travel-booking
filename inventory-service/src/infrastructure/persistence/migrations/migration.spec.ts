import { DataSource } from 'typeorm';
import { CreateFlightReservationsTable1700000000000 } from './1700000000000-CreateFlightReservationsTable';

/**
 * Migration integration test — skipped if SKIP_TESTCONTAINERS=true.
 *
 * Uses @testcontainers/postgresql to spin up a real PostgreSQL instance.
 */

const SKIP = process.env['SKIP_TESTCONTAINERS'] === 'true';

describe('Migration: CreateFlightReservationsTable', () => {
  let dataSource: DataSource;

  beforeAll(async () => {
    if (SKIP) return;

    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const container = await new PostgreSqlContainer('postgres:15-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
      migrations: [CreateFlightReservationsTable1700000000000],
      synchronize: false,
      logging: false,
    });

    await dataSource.initialize();
  }, 120000);

  afterAll(async () => {
    if (SKIP || !dataSource?.isInitialized) return;
    await dataSource.destroy();
  });

  it('should create flight_reservations table with correct schema after migration:run', async () => {
    if (SKIP) {
      console.log('Skipping testcontainer test: SKIP_TESTCONTAINERS=true');
      return;
    }

    await dataSource.runMigrations();

    const result = await dataSource.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'flight_reservations' ORDER BY column_name`,
    );
    const columns = (result as Array<{ column_name: string }>).map((r) => r.column_name);

    expect(columns).toContain('id');
    expect(columns).toContain('offer_id');
    expect(columns).toContain('amadeus_order_id');
    expect(columns).toContain('passenger_id');
    expect(columns).toContain('passport_number');
    expect(columns).toContain('status');
    expect(columns).toContain('idempotency_key');
    expect(columns).toContain('expires_at');

    // Check indexes
    const indexes = await dataSource.query(
      `SELECT indexname FROM pg_indexes WHERE tablename = 'flight_reservations'`,
    );
    const indexNames = (indexes as Array<{ indexname: string }>).map((i) => i.indexname);
    expect(indexNames).toContain('idx_fr_status_expires');
    expect(indexNames).toContain('idx_fr_passenger');
    expect(indexNames).toContain('idx_fr_idempotency');
  }, 120000);

  it('should drop flight_reservations table cleanly after migration:revert', async () => {
    if (SKIP) {
      console.log('Skipping testcontainer test: SKIP_TESTCONTAINERS=true');
      return;
    }

    await dataSource.undoLastMigration();

    const result = await dataSource.query(
      `SELECT table_name FROM information_schema.tables WHERE table_name = 'flight_reservations'`,
    );
    expect(result).toHaveLength(0);

    const enumResult = await dataSource.query(
      `SELECT typname FROM pg_type WHERE typname = 'reservation_status'`,
    );
    expect(enumResult).toHaveLength(0);
  }, 120000);
});
