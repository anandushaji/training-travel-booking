import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './presentation/controllers/health.controller';
import { BookingModule } from './booking.module';

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
        url: config.get<string>('DATABASE_URL') ?? '',
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        migrations: [__dirname + '/infrastructure/migrations/*{.ts,.js}'],
        synchronize: false,
        schema: 'booking_service',
        extra: {
          max: 20,
          query_timeout: 5000,
          connectionTimeoutMillis: 5000,
        },
        logging: ['error'] as const,
      }),
    }),
    BookingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
