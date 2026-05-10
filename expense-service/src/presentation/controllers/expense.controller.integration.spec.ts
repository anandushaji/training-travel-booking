/* eslint-disable */
// @ts-nocheck
/**
 * Integration test: ExpenseController with real PostgreSQL (Testcontainers).
 * Run with: INTEGRATION_TESTS=true npm test
 *
 * Kafka publisher is mocked; only the NestJS request-to-DB round-trip is exercised.
 */

import * as prom from 'prom-client';

const RUN_INTEGRATION = process.env['INTEGRATION_TESTS'] === 'true';
const describeIf = RUN_INTEGRATION ? describe : describe.skip;

const TRAVELER_ID = '00000000-0000-4000-8000-000000000001';
const RECEIPT_ID = '00000000-0000-4000-8000-000000000010';
const BOOKING_ID = '00000000-0000-4000-8000-000000000002';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ sub: TRAVELER_ID, role: 'EMPLOYEE', ...payload, iat: 0, exp: 9999999999 }),
  ).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

describeIf('ExpenseController (integration)', () => {
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
    await dataSource.query('TRUNCATE TABLE expense_service.expenses, expense_service.receipts, expense_service.processed_events CASCADE');
  });

  it('AC-03: GET /api/v1/expenses returns correct summary.totalAmount for seeded data', async () => {
    // Seed a receipt (required for FK constraint)
    await dataSource.query(`
      INSERT INTO expense_service.receipts
        (id, receipt_number, booking_id, traveler_id, traveler_name, traveler_email,
         amount, currency, origin, destination, departure_date, status, generated_at)
      VALUES
        ('${RECEIPT_ID}', 'RCP-2026-000001', '${BOOKING_ID}', '${TRAVELER_ID}', 'Alice', 'alice@example.com',
         450.00, 'USD', 'JFK', 'LAX', '2026-06-01', 'ACTIVE', NOW())
    `);
    // Seed two expenses
    await dataSource.query(`
      INSERT INTO expense_service.expenses
        (id, booking_id, receipt_id, traveler_id, traveler_name, amount, currency,
         category, description, expense_date, status)
      VALUES
        (gen_random_uuid(), '${BOOKING_ID}', '${RECEIPT_ID}', '${TRAVELER_ID}', 'Alice',
         200.00, 'USD', 'FLIGHT', 'Airfare', '2026-06-01', 'ACTIVE'),
        (gen_random_uuid(), '${BOOKING_ID}', '${RECEIPT_ID}', '${TRAVELER_ID}', 'Alice',
         250.00, 'USD', 'HOTEL', 'Hotel', '2026-06-01', 'ACTIVE')
    `);

    const res = await supertest(app.getHttpServer())
      .get('/api/v1/expenses')
      .query({ startDate: '2026-01-01', endDate: '2026-12-31' })
      .set('Authorization', `Bearer ${employeeToken}`)
      .expect(200);

    expect(res.body.summary).toBeDefined();
    expect(res.body.summary.totalAmount).toBe(450);
    expect(res.body.expenses).toHaveLength(2);
  });
});
