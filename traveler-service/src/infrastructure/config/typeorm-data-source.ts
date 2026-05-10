import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { CreateTravelersTable1746144000000 } from '../migrations/1746144000000-CreateTravelersTable';

/**
 * TypeORM DataSource for CLI commands (migration:run, migration:revert).
 * Uses DATABASE_URL environment variable.
 */
export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'] ?? '',
  entities: [__dirname + '/../../**/*.typeorm-entity{.ts,.js}'],
  migrations: [CreateTravelersTable1746144000000],
  synchronize: false,
  logging: ['error'],
  extra: { max: 5 },
});
