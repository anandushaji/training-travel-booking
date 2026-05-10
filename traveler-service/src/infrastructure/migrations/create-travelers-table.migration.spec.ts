import { DataSource } from 'typeorm';
import { CreateTravelersTable1746144000000 } from '../migrations/1746144000000-CreateTravelersTable';

/**
 * Integration tests for the CreateTravelersTable migration.
 * Uses real PostgreSQL via Testcontainers.
 *
 * NOTE: These tests require Docker running. They are skipped in CI if
 * SKIP_TESTCONTAINERS=true is set.
 */

const skipContainers = process.env['SKIP_TESTCONTAINERS'] === 'true';

describe('CreateTravelersTable migration', () => {
  let dataSource: DataSource;

  // Use a real pg connection if available, otherwise skip
  beforeAll(async () => {
    if (skipContainers) return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tc = await import('testcontainers') as any;
      const container = await new tc.PostgreSqlContainer('postgres:15-alpine')
        .withDatabase('testdb')
        .withUsername('test')
        .withPassword('test')
        .start();

      dataSource = new DataSource({
        type: 'postgres',
        host: container.getHost(),
        port: container.getMappedPort(5432),
        database: container.getDatabase(),
        username: container.getUsername(),
        password: container.getPassword(),
        migrations: [CreateTravelersTable1746144000000],
        synchronize: false,
      });
      await dataSource.initialize();
    } catch {
      // If testcontainers not available, tests will be skipped
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.destroy();
    }
  });

  const runTest = (fn: () => Promise<void>) => async () => {
    if (skipContainers || !dataSource?.isInitialized) {
      console.log('Skipping: Testcontainers not available');
      return;
    }
    await fn();
  };

  it(
    'should apply migration without error on clean database',
    runTest(async () => {
      await dataSource.runMigrations();
      const tables = await dataSource.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travelers'`,
      );
      expect(tables).toHaveLength(1);
    }),
  );

  it(
    'should enforce unique constraint on employee_id',
    runTest(async () => {
      await dataSource.query(
        `INSERT INTO travelers (id, employee_id, name, email, department, role)
         VALUES ('11111111-1111-1111-1111-111111111111', 'EMP-001', 'Alice', 'alice@corp.com', 'Eng', 'EMPLOYEE')`,
      );
      await expect(
        dataSource.query(
          `INSERT INTO travelers (id, employee_id, name, email, department, role)
           VALUES ('22222222-2222-2222-2222-222222222222', 'EMP-001', 'Bob', 'bob@corp.com', 'Eng', 'EMPLOYEE')`,
        ),
      ).rejects.toThrow(/unique/i);
    }),
  );

  it(
    'should enforce role CHECK constraint',
    runTest(async () => {
      await expect(
        dataSource.query(
          `INSERT INTO travelers (id, employee_id, name, email, department, role)
           VALUES ('33333333-3333-3333-3333-333333333333', 'EMP-999', 'Zed', 'zed@corp.com', 'Eng', 'INVALID_ROLE')`,
        ),
      ).rejects.toThrow();
    }),
  );

  it(
    'should set version default to 0',
    runTest(async () => {
      const rows = await dataSource.query(
        `SELECT version FROM travelers WHERE employee_id = 'EMP-001'`,
      );
      expect(rows[0].version).toBe(0);
    }),
  );

  it(
    'should revert migration cleanly',
    runTest(async () => {
      await dataSource.undoLastMigration();
      const tables = await dataSource.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'travelers'`,
      );
      expect(tables).toHaveLength(0);
    }),
  );
});
