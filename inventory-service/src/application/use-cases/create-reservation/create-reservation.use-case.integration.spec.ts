/**
 * T15 — CreateReservationUseCase integration tests
 * (Testcontainers PostgreSQL + Redis; Amadeus and Kafka mocked).
 * Skipped when SKIP_TESTCONTAINERS=true.
 */

import { DataSource, Repository } from 'typeorm';
import Redis from 'ioredis';
import { FlightReservationTypeOrmEntity } from '../../../infrastructure/persistence/entities/flight-reservation.typeorm-entity';
import { FlightReservationTypeOrmRepository } from '../../../infrastructure/persistence/repositories/flight-reservation.typeorm-repository';
import { IdempotencyService } from '../../../infrastructure/idempotency/idempotency.service';
import { CreateReservationUseCase } from './create-reservation.use-case';
import { CreateFlightReservationsTable1700000000000 } from '../../../infrastructure/persistence/migrations/1700000000000-CreateFlightReservationsTable';
import type { ConfigService } from '@nestjs/config';
import type { AmadeusHttpClient } from '../../../infrastructure/amadeus/amadeus-http.client';
import type { InventoryEventPublisher } from '../../../infrastructure/kafka/inventory-event.publisher';

const SKIP = process.env['SKIP_TESTCONTAINERS'] === 'true';
const ENC_KEY = '0'.repeat(64);

const AMADEUS_ORDER_RESPONSE = {
  data: {
    id: 'amadeus-order-1',
    departureAt: '2026-07-01T10:00:00Z',
    arrivalAt: '2026-07-01T13:00:00Z',
    flightNumber: 'BA117',
    carrier: 'BA',
    origin: 'LHR',
    destination: 'JFK',
  },
};

const BASE_COMMAND = {
  offerId: 'offer-1',
  passengerId: '00000000-0000-4000-8000-000000000001',
  passengerFirstName: 'John',
  passengerLastName: 'Doe',
  cabinClass: 'ECONOMY',
  idempotencyKey: '00000000-0000-4000-8001-000000000001',
};

describe('CreateReservationUseCase (integration — Testcontainers)', () => {
  let dataSource: DataSource;
  let useCase: CreateReservationUseCase;
  let mockAmadeus: jest.Mocked<Pick<AmadeusHttpClient, 'createOrder'>>;
  let mockPublisher: jest.Mocked<Pick<InventoryEventPublisher, 'publish'>>;

  beforeAll(async () => {
    if (SKIP) return;

    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const { RedisContainer } = await import('@testcontainers/redis');

    const [pgContainer, redisContainer] = await Promise.all([
      new PostgreSqlContainer('postgres:15-alpine').start(),
      new RedisContainer().start(),
    ]);

    dataSource = new DataSource({
      type: 'postgres',
      url: pgContainer.getConnectionUri(),
      entities: [FlightReservationTypeOrmEntity],
      migrations: [CreateFlightReservationsTable1700000000000],
      synchronize: false,
      logging: false,
    });
    await dataSource.initialize();
    await dataSource.runMigrations();

    const ormRepo = dataSource.getRepository(FlightReservationTypeOrmEntity);
    const mockConfig = {
      get: (key: string) => (key === 'PASSPORT_ENCRYPTION_KEY' ? ENC_KEY : undefined),
    } as unknown as ConfigService;
    const flightRepo = new FlightReservationTypeOrmRepository(
      ormRepo as Repository<FlightReservationTypeOrmEntity>,
      mockConfig,
    );

    const redis = new Redis(redisContainer.getConnectionUrl());
    const idempotencyService = new IdempotencyService(redis);

    mockAmadeus = { createOrder: jest.fn().mockResolvedValue(AMADEUS_ORDER_RESPONSE) };
    mockPublisher = { publish: jest.fn().mockResolvedValue(undefined) };

    useCase = new CreateReservationUseCase(
      flightRepo,
      mockAmadeus as unknown as AmadeusHttpClient,
      idempotencyService,
      mockPublisher as unknown as InventoryEventPublisher,
    );
  }, 120000);

  afterAll(async () => {
    if (SKIP || !dataSource?.isInitialized) return;
    await dataSource.destroy();
  });

  const runTest = (fn: () => Promise<void>) => async () => {
    if (SKIP) {
      console.log('Skipping: SKIP_TESTCONTAINERS=true');
      return;
    }
    await fn();
  };

  it(
    'should not insert duplicate row on second call with same Idempotency-Key',
    runTest(async () => {
      // First call — should create a row
      const result1 = await useCase.execute(BASE_COMMAND);
      expect(result1.isNew).toBe(true);
      expect(mockAmadeus.createOrder).toHaveBeenCalledTimes(1);

      // Second call with same key — should return cached, no second row
      const result2 = await useCase.execute(BASE_COMMAND);
      expect(result2.isNew).toBe(false);
      expect(result2.response.reservationId).toBe(result1.response.reservationId);
      // Amadeus was only called once
      expect(mockAmadeus.createOrder).toHaveBeenCalledTimes(1);

      // Verify only one row in DB
      const rows = await dataSource.query(
        `SELECT COUNT(*) FROM flight_reservations WHERE idempotency_key = $1`,
        [BASE_COMMAND.idempotencyKey],
      );
      expect(parseInt((rows as Array<{ count: string }>)[0]!.count, 10)).toBe(1);
    }),
    120000,
  );

  it(
    'should abort and not persist aggregate when Amadeus throws',
    runTest(async () => {
      const amadeus422 = new Error('Unprocessable Entity');
      mockAmadeus.createOrder.mockRejectedValueOnce(amadeus422);

      const cmd = { ...BASE_COMMAND, idempotencyKey: '00000000-0000-4000-8001-000000000002' };
      await expect(useCase.execute(cmd)).rejects.toThrow('Unprocessable Entity');

      // No row should be in DB for this key
      const rows = await dataSource.query(
        `SELECT COUNT(*) FROM flight_reservations WHERE idempotency_key = $1`,
        [cmd.idempotencyKey],
      );
      expect(parseInt((rows as Array<{ count: string }>)[0]!.count, 10)).toBe(0);
    }),
    120000,
  );
});
