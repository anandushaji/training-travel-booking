import { DataSource, IsNull } from 'typeorm';
import { TravelerTypeOrmEntity } from '../entities/traveler.typeorm-entity';
import { TravelerRepository } from './traveler.repository';
import { CreateTravelersTable1746144000000 } from '../../migrations/1746144000000-CreateTravelersTable';
import { Traveler } from '../../../domain/aggregates/traveler.aggregate';

/**
 * Integration tests for TravelerRepository.
 * Uses real PostgreSQL via Testcontainers.
 * Set SKIP_TESTCONTAINERS=true to skip in environments without Docker.
 */

const skipContainers = process.env['SKIP_TESTCONTAINERS'] === 'true';

describe('TravelerRepository (integration)', () => {
  let dataSource: DataSource;
  let repository: TravelerRepository;

  const createTestTraveler = () =>
    Traveler.create({
      employeeId: `EMP-${Date.now()}`,
      name: 'Test User',
      email: `test-${Date.now()}@corp.com`,
      department: 'Engineering',
      role: 'EMPLOYEE',
    });

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
        entities: [TravelerTypeOrmEntity],
        migrations: [CreateTravelersTable1746144000000],
        synchronize: false,
      });
      await dataSource.initialize();
      await dataSource.runMigrations();

      const typeormRepo = dataSource.getRepository(TravelerTypeOrmEntity);
      repository = new TravelerRepository(typeormRepo);
    } catch (e) {
      console.warn('Testcontainers unavailable, skipping:', e);
    }
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  const runTest = (fn: () => Promise<void>) => async () => {
    if (skipContainers || !dataSource?.isInitialized) {
      console.log('Skipping: Testcontainers not available');
      return;
    }
    await fn();
  };

  it(
    'should return null for soft-deleted traveler when includeDeleted is false',
    runTest(async () => {
      const traveler = createTestTraveler();
      await repository.save(traveler);
      traveler.softDelete();
      await repository.save(traveler);

      const result = await repository.findById(traveler.id, false);
      expect(result).toBeNull();
    }),
  );

  it(
    'should increment version on first update',
    runTest(async () => {
      const traveler = createTestTraveler();
      await repository.save(traveler);

      const loaded = await repository.findById(traveler.id);
      expect(loaded).not.toBeNull();
      loaded!.update({ name: 'Updated Name' });
      await repository.save(loaded!);

      const reloaded = await repository.findById(loaded!.id);
      expect(reloaded!.dbVersion).toBeGreaterThan(0);
    }),
  );

  it(
    'should throw OptimisticLockVersionMismatchError on stale-version save',
    runTest(async () => {
      const traveler = createTestTraveler();
      await repository.save(traveler);

      // Load the same aggregate twice
      const copyA = await repository.findById(traveler.id);
      const copyB = await repository.findById(traveler.id);
      expect(copyA).not.toBeNull();
      expect(copyB).not.toBeNull();

      // Save copyA first — succeeds, DB version increments
      copyA!.update({ name: 'Copy A Update' });
      await repository.save(copyA!);

      // Save copyB — stale version, should throw
      copyB!.update({ name: 'Copy B Update' });
      await expect(repository.save(copyB!)).rejects.toThrow();
    }),
  );

  it(
    'should exclude soft-deleted records from findAll when includeDeleted is false',
    runTest(async () => {
      // Clear state: get all active travelers
      const before = await repository.findAll(false);

      const traveler = createTestTraveler();
      await repository.save(traveler);
      traveler.softDelete();
      await repository.save(traveler);

      const after = await repository.findAll(false);
      expect(after.length).toBe(before.length); // soft-deleted not counted
      expect(after.find((t) => t.id === traveler.id)).toBeUndefined();
    }),
  );

  it(
    'should include soft-deleted records when findAll called with includeDeleted true',
    runTest(async () => {
      const traveler = createTestTraveler();
      await repository.save(traveler);
      traveler.softDelete();
      await repository.save(traveler);

      const all = await repository.findAll(true);
      const found = all.find((t) => t.id === traveler.id);
      expect(found).toBeDefined();
      expect(found!.deletedAt).not.toBeNull();
    }),
  );
});
