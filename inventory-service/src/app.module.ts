import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { envValidationSchema } from './config/env.validation';
import { InventoryConfig } from './config/inventory.config';
import { HealthController } from './presentation/controllers/health.controller';
import { InventoryModule } from './inventory.module';

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
        entities: [__dirname + '/**/*.typeorm-entity{.ts,.js}'],
        migrations: [__dirname + '/infrastructure/persistence/migrations/*{.ts,.js}'],
        synchronize: false,
        schema: 'inventory',
        extra: { max: 20 },
        logging: ['error'] as const,
      }),
    }),
    ScheduleModule.forRoot(),
    InventoryModule,
  ],
  controllers: [HealthController],
  providers: [InventoryConfig],
})
export class AppModule {}
