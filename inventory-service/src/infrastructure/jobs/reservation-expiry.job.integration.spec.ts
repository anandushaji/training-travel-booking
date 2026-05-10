/**
 * T15 — ReservationExpiryJob integration tests
 * (Testcontainers PostgreSQL; Kafka and Metrics mocked).
 * Skipped when SKIP_TESTCONTAINERS=true.
 */

import { DataSource, Repository } from 'typeorm';
import { FlightReservationTypeOrmEntity } from '../persistence/entities/flight-reservation.typeorm-entity';
import { FlightReservationTypeOrmRepository } from '../persistence/repositories/flight-reservation.typeorm-repository';
import { ReservationExpiryJob } from './reservation-expiry.job';
import { FlightReservation } from '../../domain/aggregates/flight-reservation.aggregate';
import { FlightSegment } from '../../domain/value-objects/flight-segment.value-object';
import { PassengerDetails } from '../../domain/value-objects/passenger-details.value-object';
import { CreateFlightReservationsTable1700000000000 } from '../persistence/migrations/1700000000000-CreateFlightReservationsTable';
import type { ConfigService } from '@nestjs/config';
import type { InventoryEventPublisher } from '../kafka/inventory-event.publisher';
import type { MetricsService } from '../observability/metrics.service';

const SKIP = process.env['SKIP_TESTCONTAINERS'] === 'true';
const ENC_KEY = '0'.repeat(64);

function buildReservation(idempotencyKey: string, holdMinutes: number): FlightReservation {
  const segment = new FlightSegment({
    origin: 'LHR',
    destination: 'JFK',
    departureDate: new Date('2026-07-01T10:00:00Z'),
    arrivalDate: new Date('2026-07-01T13:00:00Z'),
    flightNumber: 'BA117',
    carrier: 'BA',
  });
  const passenger = new PassengerDetails({
    passengerId: '00000000-0000-4000-8000-000000000001',
    firstName: 'John',
    lastName: 'Doe',
  });
  return FlightReservation.create({
    offerId: 'offer-1',
    segment,
    passenger,
    cabinClass: 'ECONOMY',
    idempotencyKey,
    holdMinutes,
  });
}

describe('ReservationExpiryJob (integration — Testcontainers)', () => {
  let dataSource: DataSource;
  let repo: FlightReservationTypeOrmRepository;
  let job: ReservationExpiryJob;
  let mockPublisher: jest.Mocked<Pick<InventoryEventPublisher, 'publish'>>;
  let mockMetrics: jest.Mocked<Pick<MetricsService, 'incrementReservationsExpired'>>;

  beforeAll(async () => {
    if (SKIP) return;

    const { PostgreSqlContainer } = await import('@testcontainers/postgresql');
    const container = await new PostgreSqlContainer('postgres:15-alpine').start();

    dataSource = new DataSource({
      type: 'postgres',
      url: container.getConnectionUri(),
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
    repo = new FlightReservationTypeOrmRepository(
      ormRepo as Repository<FlightReservationTypeOrmEntity>,
      mockConfig,
    );

    mockPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    mockMetrics = { incrementReservationsExpired: jest.fn() };

    job = new ReservationExpiryJob(
      repo,
      mockPublisher as unknown as InventoryEventPublisher,
      mockMetrics as unknown as MetricsService,
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
    'should update status to EXPIRED for past-due PENDING reservation',
    runTest(async () => {
      // holdMinutes = -2 → expiresAt = now - 2 min (already expired)
      const expired = buildReservation('idem-job-int-1', -2);
      await repo.save(expired);

      await job.expireReservations();

      const rows = await dataSource.query(
        `SELECT status FROM flight_reservations WHERE id = $1`,
        [expired.id],
      );
      expect((rows as Array<{ status: string }>)[0]!.status).toBe('EXPIRED');
      expect(mockPublisher.publish).toHaveBeenCalled();
      expect(mockMetrics.incrementReservationsExpired).toHaveBeenCalled();
    }),
    120000,
  );

  it(
    'should not expire future-dated PENDING reservations',
    runTest(async () => {
      mockPublisher.publish.mockClear();
      const future = buildReservation('idem-job-int-2', 30);
      await repo.save(future);

      await job.expireReservations();

      const rows = await dataSource.query(
        `SELECT status FROM flight_reservations WHERE id = $1`,
        [future.id],
      );
      // status remains PENDING
      expect((rows as Array<{ status: string }>)[0]!.status).toBe('PENDING');
    }),
    120000,
  );
});
