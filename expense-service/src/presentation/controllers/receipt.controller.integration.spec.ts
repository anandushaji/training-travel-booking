/* eslint-disable */
// @ts-nocheck
/**
 * Integration test: ReceiptController with real PostgreSQL (Testcontainers).
 * Run with: INTEGRATION_TESTS=true npm test
 *
 * Kafka publisher is mocked; only the NestJS request-to-DB round-trip is exercised.
 */

import * as prom from 'prom-client';

const RUN_INTEGRATION = process.env['INTEGRATION_TESTS'] === 'true';
const describeIf = RUN_INTEGRATION ? describe : describe.skip;

const TRAVELER_ID = '00000000-0000-4000-8000-000000000001';
const BOOKING_ID = '00000000-0000-4000-8000-000000000002';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ sub: TRAVELER_ID, role: 'EMPLOYEE', ...payload, iat: 0, exp: 9999999999 }),
  ).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describeIf('ReceiptController (integration)', () => {
  let app: any;
  let dataSource: any;
  let supertest: any;
  let employeeToken: string;

  beforeAll(async () => {
    prom.register.clear();

    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe, HttpStatus } = await import('@nestjs/common');
    supertest = (await import('supertest')).default;
    const { ConfigModule } = await import('@nestjs/config');
    const { TypeOrmModule } = await import('@nestjs/typeorm');
    const { DataSource } = await import('typeorm');

    const { ReceiptEntity } = await import('../../infrastructure/entities/receipt.entity');
    const { ExpenseEntity } = await import('../../infrastructure/entities/expense.entity');
    const { ExpenseReportEntity } = await import('../../infrastructure/entities/expense-report.entity');
    const { ProcessedEventEntity } = await import('../../infrastructure/entities/processed-event.entity');
    const { CreateExpenseTables1714737600000 } = await import('../../infrastructure/migrations/1714737600000_create_expense_tables');
    const { ExpenseModule } = await import('../../expense.module');
    const { KAFKA_PRODUCER } = await import('@travel/shared');

    const container = await new PostgreSqlContainer()
      .withDatabase('expense_test')
      .withUsername('postgres')
      .withPassword('postgres')
      .start();

    const kafkaProducerMock = { send: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            DATABASE_URL: container.getConnectionUri(),
            JWT_SECRET: 'test-secret',
            KAFKA_BROKERS: 'localhost:9092',
            KAFKA_GROUP_ID: 'expense-service-test',
          })],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: container.getConnectionUri(),
          entities: [ReceiptEntity, ExpenseEntity, ExpenseReportEntity, ProcessedEventEntity],
          migrations: [CreateExpenseTables1714737600000],
          migrationsRun: true,
          synchronize: false,
          schema: 'expense_service',
          logging: false,
        }),
        ExpenseModule,
      ],
    })
      .overrideProvider(KAFKA_PRODUCER)
      .useValue(kafkaProducerMock)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    dataSource = module.get(DataSource);
    employeeToken = makeJwt({ role: 'EMPLOYEE' });
  }, 120000);

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(async () => {
    // Clean tables before each test
    await dataSource.query('TRUNCATE TABLE expense_service.receipts, expense_service.expenses, expense_service.processed_events CASCADE');
  });

  it('AC-01: GET /api/v1/receipts returns seeded receipt with pagination', async () => {
    // Seed a receipt directly
    await dataSource.query(`
      INSERT INTO expense_service.receipts
        (id, receipt_number, booking_id, traveler_id, traveler_name, traveler_email,
         amount, currency, origin, destination, departure_date, status, generated_at)
      VALUES
        ('r-int-001', 'RCP-2026-000001', '${BOOKING_ID}', '${TRAVELER_ID}', 'Alice', 'alice@example.com',
         450.00, 'USD', 'JFK', 'LAX', '2026-06-01', 'ACTIVE', NOW())
    `);

    const res = await supertest(app.getHttpServer())
      .get('/api/v1/receipts')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(HttpStatus.OK);

    expect(res.body.receipts).toHaveLength(1);
    expect(res.body.receipts[0].receiptNumber).toBe('RCP-2026-000001');
    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination.total).toBe(1);
  });

  it('AC-02: GET /api/v1/receipts/:id with unknown ID returns 404', async () => {
    await supertest(app.getHttpServer())
      .get('/api/v1/receipts/00000000-0000-4000-8000-000000000999')
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(HttpStatus.NOT_FOUND);
  });
});
