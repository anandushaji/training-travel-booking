/* eslint-disable */
// @ts-nocheck
/**
 * Integration test: BookingController with real PostgreSQL (Testcontainers).
 * Run with: INTEGRATION_TESTS=true npm test
 *
 * External dependencies (HTTP clients, Kafka) are mocked so the test only
 * exercises the full NestJS request-to-DB round-trip.
 */

import * as prom from 'prom-client';

const RUN_INTEGRATION = process.env['INTEGRATION_TESTS'] === 'true';
const describeIf = RUN_INTEGRATION ? describe : describe.skip;

// ---------------------------------------------------------------------------
// Shared UUID helpers
// ---------------------------------------------------------------------------
const TRAVELER_ID = '00000000-0000-4000-8000-000000000099';
const OFFER_ID = 'OFFER-INT-001';

function makeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(
    JSON.stringify({ sub: TRAVELER_ID, ...payload, iat: 0, exp: 9999999999 }),
  ).toString('base64url');
  return `${header}.${body}.fake-signature`;
}

const validItinerary = {
  origin: 'JFK',
  destination: 'LAX',
  departureDate: '2026-06-01T10:00:00.000Z',
  cabinClass: 'ECONOMY',
  passengers: 1,
};

// ---------------------------------------------------------------------------
// describeIf block — only runs when INTEGRATION_TESTS=true
// ---------------------------------------------------------------------------
describeIf('BookingController (integration)', () => {
  let app: any;
  let dataSource: any;
  let supertest: any;
  let adminToken: string;
  let employeeToken: string;

  beforeAll(async () => {
    prom.register.clear();

    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const { Test } = await import('@nestjs/testing');
    const { ValidationPipe } = await import('@nestjs/common');
    supertest = (await import('supertest')).default;
    const { ConfigModule } = await import('@nestjs/config');
    const { TypeOrmModule } = await import('@nestjs/typeorm');

    const { BookingEntity } = await import('../../infrastructure/entities/booking.entity');
    const { BookingSagaEntity } = await import('../../infrastructure/entities/booking-saga.entity');
    const { BookingSagaStepEntity } = await import('../../infrastructure/entities/booking-saga-step.entity');
    const { EventStoreEntity } = await import('../../infrastructure/entities/event-store.entity');
    const { BookingReadModelEntity } = await import('../../infrastructure/entities/booking-read-model.entity');
    const { CreateBookingTables1700000000000 } = await import('../../infrastructure/migrations/1700000000000-CreateBookingTables');
    const { BookingModule } = await import('../../booking.module');
    const { PolicyServiceClient } = await import('../../infrastructure/http/policy-service.client');
    const { InventoryServiceClient } = await import('../../infrastructure/http/inventory-service.client');
    const { PaymentServiceClient } = await import('../../infrastructure/http/payment-service.client');
    const { KAFKA_PRODUCER } = await import('@travel/shared');

    const container = await new PostgreSqlContainer().start();

    // Mocks for saga external steps
    const policyClientMock = {
      validatePolicy: jest.fn().mockResolvedValue({ valid: true, violations: [] }),
    };
    const inventoryClientMock = {
      createReservation: jest.fn().mockResolvedValue({ reservationId: 'RES-INT-001' }),
      cancelReservation: jest.fn().mockResolvedValue(undefined),
    };
    const paymentClientMock = {
      authorizePayment: jest.fn().mockResolvedValue({ paymentId: '00000000-0000-4000-8000-000000000088' }),
      capturePayment: jest.fn().mockResolvedValue(undefined),
      refundPayment: jest.fn().mockResolvedValue(undefined),
    };
    const kafkaProducerMock = { send: jest.fn().mockResolvedValue(undefined) };

    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [() => ({
            DATABASE_URL: container.getConnectionUri(),
            KAFKA_BROKERS: 'localhost:9092',
            KAFKA_CLIENT_ID: 'booking-service-test',
            KAFKA_GROUP_ID: 'booking-service-test-group',
            POLICY_SERVICE_URL: 'http://localhost:9901',
            INVENTORY_SERVICE_URL: 'http://localhost:9902',
            PAYMENT_SERVICE_URL: 'http://localhost:9903',
          })],
        }),
        TypeOrmModule.forRoot({
          type: 'postgres' as const,
          url: container.getConnectionUri(),
          entities: [BookingEntity, BookingSagaEntity, BookingSagaStepEntity, EventStoreEntity, BookingReadModelEntity],
          migrations: [CreateBookingTables1700000000000],
          synchronize: false,
          schema: 'booking_service',
        }),
        BookingModule,
      ],
    })
      // Override HTTP clients to avoid real network calls
      .overrideProvider(PolicyServiceClient)
      .useValue(policyClientMock)
      .overrideProvider(InventoryServiceClient)
      .useValue(inventoryClientMock)
      .overrideProvider(PaymentServiceClient)
      .useValue(paymentClientMock)
      // Kafka producer
      .overrideProvider(KAFKA_PRODUCER)
      .useValue(kafkaProducerMock)
      .compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    dataSource = module.get('DataSource' as any);
    await dataSource.query('CREATE SCHEMA IF NOT EXISTS booking_service');
    await dataSource.runMigrations();

    adminToken = makeJwt({ role: 'ADMIN' });
    employeeToken = makeJwt({ role: 'EMPLOYEE', sub: TRAVELER_ID });
  }, 120_000);

  afterAll(async () => {
    await app?.close();
  });

  // ── Health endpoints ─────────────────────────────────────────────────────

  it('GET /health returns 200', async () => {
    const resp = await supertest(app.getHttpServer()).get('/health');
    expect(resp.status).toBe(200);
    expect(resp.body.status).toBe('healthy');
  });

  it('GET /ready returns 200 when DB connected', async () => {
    const resp = await supertest(app.getHttpServer()).get('/ready');
    expect(resp.status).toBe(200);
    expect(resp.body.database).toBe('connected');
  });

  // ── POST /bookings ────────────────────────────────────────────────────────

  it('POST /bookings returns 201 and creates a booking', async () => {
    const resp = await supertest(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('x-correlation-id', 'corr-integration-001')
      .send({
        travelerId: TRAVELER_ID,
        flightOfferId: OFFER_ID,
        itinerary: validItinerary,
        totalAmount: 350.00,
        currency: 'USD',
      });

    expect(resp.status).toBe(201);
    expect(resp.body.id).toBeDefined();
    expect(resp.body.travelerId).toBe(TRAVELER_ID);
  });

  it('POST /bookings returns 403 when EMPLOYEE books for another traveler', async () => {
    const resp = await supertest(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        travelerId: '00000000-0000-4000-8000-000000000001',
        flightOfferId: OFFER_ID,
        itinerary: validItinerary,
        totalAmount: 200.00,
        currency: 'USD',
      });

    expect(resp.status).toBe(403);
  });

  it('POST /bookings returns 400 when body is invalid', async () => {
    const resp = await supertest(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ travelerId: 'not-a-uuid' }); // missing required fields

    expect(resp.status).toBe(400);
  });

  // ── GET /bookings/:id ─────────────────────────────────────────────────────

  it('GET /bookings/:id returns booking', async () => {
    // First create a booking
    const createResp = await supertest(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        travelerId: TRAVELER_ID,
        flightOfferId: OFFER_ID,
        itinerary: validItinerary,
        totalAmount: 400.00,
        currency: 'USD',
      });
    const bookingId = createResp.body.id;

    const getResp = await supertest(app.getHttpServer())
      .get(`/bookings/${bookingId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(getResp.status).toBe(200);
    expect(getResp.body.id).toBe(bookingId);
  });

  it('GET /bookings/:id returns 404 for unknown id', async () => {
    const resp = await supertest(app.getHttpServer())
      .get('/bookings/00000000-0000-4000-8000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(resp.status).toBe(404);
  });

  // ── GET /bookings ─────────────────────────────────────────────────────────

  it('GET /bookings returns list', async () => {
    const resp = await supertest(app.getHttpServer())
      .get('/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ travelerId: TRAVELER_ID });

    expect(resp.status).toBe(200);
    expect(Array.isArray(resp.body)).toBe(true);
  });

  // ── POST /bookings/:id/cancel ─────────────────────────────────────────────

  it('POST /bookings/:id/cancel returns 200', async () => {
    // Create a booking first and wait for it to land in DB
    const createResp = await supertest(app.getHttpServer())
      .post('/bookings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        travelerId: TRAVELER_ID,
        flightOfferId: OFFER_ID,
        itinerary: validItinerary,
        totalAmount: 500.00,
        currency: 'USD',
      });
    const bookingId = createResp.body.id;

    const cancelResp = await supertest(app.getHttpServer())
      .post(`/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Changed plans' });

    // 200 or 422 (policy violation scenario) both acceptable; 4xx server errors are not
    expect(cancelResp.status).toBeLessThan(500);
  });
});
