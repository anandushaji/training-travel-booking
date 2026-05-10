import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { FlightReservationTypeOrmEntity } from './entities/flight-reservation.typeorm-entity';
import { CreateFlightReservationsTable1700000000000 } from './migrations/1700000000000-CreateFlightReservationsTable';

export default new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'] ?? '',
  schema: 'inventory',
  entities: [FlightReservationTypeOrmEntity],
  migrations: [CreateFlightReservationsTable1700000000000],
  synchronize: false,
  extra: {
    max: 20,
    statement_timeout: 5000,
    query_timeout: 5000,
    connectionTimeoutMillis: 5000,
  },
});
