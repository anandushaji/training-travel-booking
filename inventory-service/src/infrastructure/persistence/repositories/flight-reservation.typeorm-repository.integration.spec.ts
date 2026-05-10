/**
 * T15 — Repository integration tests (Testcontainers PostgreSQL).
 * Skipped when SKIP_TESTCONTAINERS=true.
 */

import { DataSource, Repository } from 'typeorm';
import { FlightReservationTypeOrmEntity } from '../entities/flight-reservation.typeorm-entity';
import { FlightReservationTypeOrmRepository } from './flight-reservation.typeorm-repository';
import { FlightReservation } from '../../../domain/aggregates/flight-reservation.aggregate';
import { FlightSegment } from '../../../domain/value-objects/flight-segment.value-object';
import { PassengerDetails } from '../../../domain/value-objects/passenger-details.value-object';
import { CreateFlightReservationsTable1700000000000 } from '../migrations/1700000000000-CreateFlightReservationsTable';
import type { ConfigService } from '@nestjs/config';

const SKIP = process.env['SKIP_TESTCONTAINERS'] === 'true';
const ENC_KEY = '0'.repeat(64); // 32-byte AES-256 key (all zeros, test only)

function buildReservation(idempotencyKey: string, holdMinutes = 15): FlightReservation {
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

describe('FlightReservationTypeOrmRepository (integration — Testcontainers)', () => {
  let dataSource: DataSource;
  let repo: FlightReservationTypeOrmRepository;

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
    'should persist and retrieve FlightReservation aggregate',
    runTest(async () => {
      const reservation = buildReservation('idem-repo-int-1');
      await repo.save(reservation);

      const found = await repo.findById(reservation.id);
      expect(found).not.toBeNull();
      expect(found!.id).toBe(reservation.id);
      expect(found!.status.value).toBe('PENDING');
      expect(found!.offerId).toBe('offer-1');
      expect(found!.segment.origin.trim()).toBe('LHR');
      expect(found!.segment.destination.trim()).toBe('JFK');
      expect(found!.idempotencyKey).toBe('idem-repo-int-1');
    }),
    120000,
  );

  it(
    'should return only PENDING reservations with expiresAt in the past',
    runTest(async () => {
      // holdMinutes = -2 → expiresAt = now - 2 min (already expired)
      const expired = buildReservation('idem-repo-int-2', -2);
      // holdMinutes = 30 → expiresAt = now + 30 min (not yet expired)
      const future = buildReservation('idem-repo-int-3', 30);

      await repo.save(expired);
      await repo.save(future);

      const results = await repo.findPendingExpired(new Date());
      const ids = results.map((r) => r.id);

      expect(ids).toContain(expired.id);
      expect(ids).not.toContain(future.id);
    }),
    120000,
  );
});
