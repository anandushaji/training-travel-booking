/* eslint-disable */
// @ts-nocheck
/**
 * Integration test: TravelPolicyRepository with real PostgreSQL (Testcontainers).
 * These tests are covered in depth in T18 (controller integration tests).
 * This file covers repository-level ACs from T07.
 */

import { DataSource, Repository } from 'typeorm';
import { TravelPolicyEntity } from '../entities/travel-policy.entity';
import { DepartmentalBudgetEntity } from '../entities/departmental-budget.entity';
import { PolicyViolationEntity } from '../entities/policy-violation.entity';
import { TravelPolicyRepository } from './travel-policy.repository';
import { TravelPolicy } from '../../domain/aggregates/travel-policy.aggregate';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';
import { CreatePolicyTables1746000000000 } from '../migrations/1746000000000-CreatePolicyTables';

// Skip in CI unless INTEGRATION_TESTS=true
const RUN_INTEGRATION = process.env['INTEGRATION_TESTS'] === 'true';
const describeIf = RUN_INTEGRATION ? describe : describe.skip;

describeIf('TravelPolicyRepository (integration)', () => {
  let dataSource: DataSource;
  let ormRepo: Repository<TravelPolicyEntity>;
  let repo: TravelPolicyRepository;

  const baseRules = {
    maxFlightCost: 1000,
    allowedCabinClasses: [CabinClass.ECONOMY],
    advanceBookingDays: 7,
    requiresApproval: false,
    approvalThreshold: 800,
    allowInternational: true,
  };

  beforeAll(async () => {
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const container = await new PostgreSqlContainer().start();

    dataSource = new DataSource({
      type: 'postgres',
      host: container.getHost(),
      port: container.getPort(),
      username: container.getUsername(),
      password: container.getPassword(),
      database: container.getDatabase(),
      entities: [TravelPolicyEntity, DepartmentalBudgetEntity, PolicyViolationEntity],
      migrations: [CreatePolicyTables1746000000000],
      synchronize: false,
      schema: 'policy_service',
    });
    await dataSource.initialize();
    await dataSource.query('CREATE SCHEMA IF NOT EXISTS policy_service');
    await dataSource.query('SET search_path TO policy_service');
    await dataSource.runMigrations();

    ormRepo = dataSource.getRepository(TravelPolicyEntity);
    repo = new TravelPolicyRepository(ormRepo);
  });

  afterAll(async () => {
    await dataSource?.destroy();
  });

  it('findById returns null when not found', async () => {
    const result = await repo.findById('00000000-0000-4000-8000-000000000099');
    expect(result).toBeNull();
  });

  it('save inserts a new policy', async () => {
    const policy = TravelPolicy.create(
      { name: 'Test Policy', department: 'Engineering', rules: baseRules },
      'admin',
    );
    const saved = await repo.save(policy);
    expect(saved.id).toBe(policy.id);
    expect(saved.name).toBe('Test Policy');
  });

  it('findById returns policy after save', async () => {
    const policy = TravelPolicy.create(
      { name: 'Find Me', department: 'Finance', rules: baseRules },
      'admin',
    );
    await repo.save(policy);
    const found = await repo.findById(policy.id);
    expect(found).not.toBeNull();
    expect(found!.name).toBe('Find Me');
  });

  it('save updates existing policy', async () => {
    const policy = TravelPolicy.create(
      { name: 'Updatable', department: 'HR', rules: baseRules },
      'admin',
    );
    await repo.save(policy);
    policy.update({ name: 'Updated Name' });
    await repo.save(policy);
    const found = await repo.findById(policy.id);
    expect(found!.name).toBe('Updated Name');
  });

  it('delete does not throw on missing id', async () => {
    await expect(repo.delete('00000000-0000-4000-8000-000000000088')).resolves.not.toThrow();
  });
});
