import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PaymentTypeOrmEntity } from './entities/payment.typeorm-entity';
import { PaymentMethodTypeOrmEntity } from './entities/payment-method.typeorm-entity';

export default new DataSource({
  type: 'postgres',
  host: process.env['DB_HOST'] ?? 'localhost',
  port: parseInt(process.env['DB_PORT'] ?? '5432', 10),
  database: process.env['DB_NAME'] ?? 'payment_service',
  username: process.env['DB_USER'] ?? 'payment',
  password: process.env['DB_PASSWORD'] ?? '',
  schema: 'payment_service',
  entities: [PaymentTypeOrmEntity, PaymentMethodTypeOrmEntity],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],
  synchronize: false,
  extra: { max: 20, query_timeout: 5000 },
});
