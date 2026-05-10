/* eslint-disable */
// @ts-nocheck
/**
 * Integration test: BookingEventConsumer idempotency with real PostgreSQL (Testcontainers).
 * Run with: INTEGRATION_TESTS=true npm test
 *
 * AC-04: Calling the BookingConfirmed consumer handler twice with the same eventId
 *        results in exactly one row in receipts and one row in processed_events;
 *        the second call does not throw.
 */

import * as prom from 'prom-client';

const RUN_INTEGRATION = process.env['INTEGRATION_TESTS'] === 'true';
const describeIf = RUN_INTEGRATION ? describe : describe.skip;

const BOOKING_ID = '00000000-0000-4000-8000-000000000002';
const TRAVELER_ID = '00000000-0000-4000-8000-000000000001';
const EVENT_ID = 'evt-idempotency-test-001';

const confirmedEnvelope = {
  eventId: EVENT_ID,
  eventType: 'BookingConfirmed',
  aggregateId: BOOKING_ID,
  correlationId: 'corr-int-001',
  causationId: 'cause-int-001',
  occurredOn: new Date().toISOString(),
  version: '1.0',
  data: {
    travelerId: TRAVELER_ID,
    travelerName: 'Alice Smith',
    travelerEmail: 'alice@example.com',
    totalAmount: 450.0,
    currency: 'USD',
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2026-06-01',
  },
};

describeIf('BookingEventConsumer (integration — idempotency)', () => {
  let consumer: any;
  let dataSource: any;

  beforeAll(async () => {
    prom.register.clear();

    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const { Test } = await import('@nestjs/testing');
    const { ConfigModule } = await import('@nestjs/config');
    const { TypeOrmModule } = await import('@nestjs/typeorm');
    const { DataSource } = await import('typeorm');

    const { ReceiptEntity } = await import('../../infrastructure/entities/receipt.entity');
    const { ExpenseEntity } = await import('../../infrastructure/entities/expense.entity');
    const { ExpenseReportEntity } = await import('../../infrastructure/entities/expense-report.entity');
    const { ProcessedEventEntity } = await import('../../infrastructure/entities/processed-event.entity');
    const { CreateExpenseTables1714737600000 } = await import('../../infrastructure/migrations/1714737600000_create_expense_tables');
    const { ExpenseModule } = await import('../../expense.module');
    const { BookingEventConsumer } = await import('./booking-event.consumer');
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

    consumer = module.get(BookingEventConsumer);
    dataSource = module.get(DataSource);
  }, 120000);

  afterAll(async () => {
    // dataSource is managed by module lifecycle
  });

  it('AC-04: duplicate BookingConfirmed produces exactly one receipt and one processed_event', async () => {
    // First call — should insert receipt + processed_event
    await consumer.handleBookingEvent(confirmedEnvelope);

    // Second call with same eventId — should be a no-op (idempotency)
    await expect(consumer.handleBookingEvent(confirmedEnvelope)).resolves.toBeUndefined();

    const receiptRows = await dataSource.query(
      `SELECT * FROM expense_service.receipts WHERE booking_id = '${BOOKING_ID}'`,
    );
    const processedRows = await dataSource.query(
      `SELECT * FROM expense_service.processed_events WHERE event_id = '${EVENT_ID}'`,
    );

    expect(receiptRows).toHaveLength(1);
    expect(processedRows).toHaveLength(1);
  });
});
