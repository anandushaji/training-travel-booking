import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { envValidationSchema } from './config/env.validation';
import { HealthController } from './presentation/controllers/health.controller';
import { ExpenseModule } from './expense.module';

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
        schema: 'expense_service',
        extra: {
          max: 20,
          statement_timeout: 5000,
          query_timeout: 5000,
          connectionTimeoutMillis: 5000,
        },
        logging: ['error'] as const,
      }),
    }),
    ExpenseModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
