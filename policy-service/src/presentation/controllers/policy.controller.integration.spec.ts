/* eslint-disable */
// @ts-nocheck
/**
 * Integration test: PolicyController with real PostgreSQL (Testcontainers).
 * Run with: INTEGRATION_TESTS=true npm test
 */

import * as prom from 'prom-client';

const RUN_INTEGRATION = process.env['INTEGRATION_TESTS'] === 'true';
const describeIf = RUN_INTEGRATION ? describe : describe.skip;

describeIf('PolicyController (integration)', () => {
  let app: any;
  let dataSource: any;

  beforeAll(async () => {
    prom.register.clear();
    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const { Test } = await import('@nestjs/testing');
    const { INestApplication, ValidationPipe } = await import('@nestjs/common');
    const supertest = await import('supertest');
    const { ConfigModule } = await import('@nestjs/config');
    const { TypeOrmModule } = await import('@nestjs/typeorm');
    const { TravelPolicyEntity } = await import('../../infrastructure/entities/travel-policy.entity');
    const { DepartmentalBudgetEntity } = await import('../../infrastructure/entities/departmental-budget.entity');
    const { PolicyViolationEntity } = await import('../../infrastructure/entities/policy-violation.entity');
    const { CreatePolicyTables1746000000000 } = await import('../../infrastructure/migrations/1746000000000-CreatePolicyTables');
    const { PolicyModule } = await import('../../policy.module');

    const container = await new PostgreSqlContainer().start();

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            DATABASE_URL: container.getConnectionUri(),
            REDIS_URL: 'redis://localhost:6379',
            KAFKA_BROKERS: 'localhost:9092',
            TRAVELER_SERVICE_URL: 'http://localhost:3001',
          })],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres' as const,
          url: container.getConnectionUri(),
          entities: [TravelPolicyEntity, DepartmentalBudgetEntity, PolicyViolationEntity],
          migrations: [CreatePolicyTables1746000000000],
          synchronize: false,
          schema: 'policy_service',
        }),
        PolicyModule,
      ],
    })
      .overrideProvider('KAFKA_PRODUCER')
      .useValue({ send: jest.fn().mockResolvedValue(undefined) })
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    dataSource = module.get('DataSource' as any);
    await dataSource.query('CREATE SCHEMA IF NOT EXISTS policy_service');
    await dataSource.runMigrations();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('POST /api/v1/policies creates policy and returns 201', async () => {
    const supertest = await import('supertest');
    const adminToken = makeJwt({ role: 'ADMIN', department: 'Engineering' });

    const resp = await supertest.default(app.getHttpServer())
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Integration Test Policy',
        department: 'Engineering',
        rules: {
          maxFlightCost: 1000,
          allowedCabinClasses: ['ECONOMY'],
          advanceBookingDays: 7,
          requiresApproval: false,
          approvalThreshold: 800,
          allowInternational: true,
        },
      });
    expect(resp.status).toBe(201);
    expect(resp.body.name).toBe('Integration Test Policy');
  });

  it('POST /api/v1/policies duplicate returns 409', async () => {
    const supertest = await import('supertest');
    const adminToken = makeJwt({ role: 'ADMIN', department: 'Finance' });

    const body = {
      name: 'Duplicate Policy',
      department: 'Finance',
      rules: {
        maxFlightCost: 1000,
        allowedCabinClasses: ['ECONOMY'],
        advanceBookingDays: 7,
        requiresApproval: false,
        approvalThreshold: 800,
        allowInternational: true,
      },
    };

    await supertest.default(app.getHttpServer())
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

    const resp2 = await supertest.default(app.getHttpServer())
      .post('/api/v1/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(body);

    expect(resp2.status).toBe(409);
  });
});

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ sub: 'test-user', ...payload, iat: 0, exp: 9999999999 })).toString('base64url');
  return `${header}.${body}.fake-signature`;
}
