import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './presentation/controllers/health.controller';
import { PaymentModule } from './payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
      ignoreEnvFile: process.env['NODE_ENV'] === 'test',
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        host: config.get<string>('DB_HOST') ?? 'localhost',
        port: config.get<number>('DB_PORT') ?? 5432,
        database: config.get<string>('DB_NAME') ?? 'payment_service',
        username: config.get<string>('DB_USER') ?? 'payment',
        password: config.get<string>('DB_PASSWORD') ?? '',
        entities: [__dirname + '/**/*.typeorm-entity{.ts,.js}'],
        migrations: [__dirname + '/infrastructure/persistence/migrations/*{.ts,.js}'],
        synchronize: false,
        schema: 'payment_service',
        extra: {
          max: 20,
          query_timeout: 5000,
          connectionTimeoutMillis: 5000,
        },
        logging: ['error'] as const,
      }),
    }),
    PaymentModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
