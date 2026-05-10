import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

// Infrastructure — persistence
import { TravelerTypeOrmEntity } from './infrastructure/persistence/entities/traveler.typeorm-entity';
import { TravelerRepository } from './infrastructure/persistence/repositories/traveler.repository';
import { TRAVELER_REPOSITORY } from './domain/repositories/i-traveler.repository';

// Infrastructure — cache
import { TravelerCacheService } from './infrastructure/cache/traveler-cache.service';

// Infrastructure — Kafka
import { TravelerEventPublisher } from './infrastructure/kafka/traveler-event-publisher';

// Infrastructure — HR
import { HrSoapClientStub } from './infrastructure/hr/hr-soap-client.stub';

// Infrastructure — jobs
import { GdprAnonymisationJob } from './infrastructure/jobs/gdpr-anonymisation.job';

// Infrastructure — observability
import { MetricsService } from './infrastructure/observability/metrics.service';
import { LoggingService } from './infrastructure/observability/logging.service';

// Application — use cases
import { CreateTravelerUseCase } from './application/use-cases/create-traveler.use-case';
import { GetTravelerUseCase } from './application/use-cases/get-traveler.use-case';
import { GetTravelersUseCase } from './application/use-cases/get-travelers.use-case';
import { UpdateTravelerUseCase } from './application/use-cases/update-traveler.use-case';
import { DeleteTravelerUseCase } from './application/use-cases/delete-traveler.use-case';
import { GetTravelerPreferencesUseCase } from './application/use-cases/get-traveler-preferences.use-case';
import { UpdateTravelerPreferencesUseCase } from './application/use-cases/update-traveler-preferences.use-case';
import { GetAdminTravelersUseCase } from './application/use-cases/get-admin-travelers.use-case';
import { SyncTravelersUseCase } from './application/use-cases/sync-travelers.use-case';
import { AuthTravelerUseCase } from './application/use-cases/auth-traveler.use-case';

// Presentation — controllers
import { TravelerController } from './presentation/controllers/traveler.controller';
import { AdminTravelerController } from './presentation/controllers/admin-traveler.controller';
import { TravelerAuthController } from './presentation/controllers/traveler-auth.controller';

// Presentation — guards
import { JwtAuthGuard } from './presentation/guards/jwt-auth.guard';
import { RolesGuard } from './presentation/guards/roles.guard';
import { SelfOrAdminGuard } from './presentation/guards/self-or-admin.guard';

// Presentation — filters
import { DomainExceptionFilter } from './presentation/filters/domain-exception.filter';

// Shared
import { KAFKA_PRODUCER, KafkaModule } from '@travel/shared';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([TravelerTypeOrmEntity]),
    KafkaModule.register({
      clientId: 'traveler-service',
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
      groupId: 'traveler-service-group',
    }),
  ],
  controllers: [TravelerController, AdminTravelerController, TravelerAuthController],
  providers: [
    // --- Repository ---
    {
      provide: TRAVELER_REPOSITORY,
      useClass: TravelerRepository,
    },
    TravelerRepository, // also exposed directly for internal DI in use cases

    // --- Redis ---
    {
      provide: 'REDIS_CLIENT',
      useFactory: (config: ConfigService): Redis => {
        const url = config.get<string>('REDIS_URL', 'redis://localhost:6379');
        return new Redis(url, { connectTimeout: 2000, lazyConnect: true });
      },
      inject: [ConfigService],
    },
    {
      provide: TravelerCacheService,
      useFactory: (redis: Redis) => new TravelerCacheService(redis),
      inject: ['REDIS_CLIENT'],
    },

    // --- Kafka publisher ---
    {
      provide: TravelerEventPublisher,
      useFactory: (producer: unknown) => new TravelerEventPublisher(producer as never),
      inject: [KAFKA_PRODUCER],
    },

    // --- HR SOAP stub ---
    {
      provide: HrSoapClientStub,
      useFactory: (config: ConfigService) =>
        new HrSoapClientStub(config.get<string>('HR_SYSTEM_URL', 'http://hr-system')),
      inject: [ConfigService],
    },

    // --- Observability ---
    MetricsService,
    LoggingService,

    // --- Jobs ---
    GdprAnonymisationJob,

    // --- Guards ---
    JwtAuthGuard,
    RolesGuard,
    SelfOrAdminGuard,

    // --- Filter (registered as provider for global use in module scope) ---
    DomainExceptionFilter,

    // --- Use cases ---
    {
      provide: CreateTravelerUseCase,
      useFactory: (
        repo: TravelerRepository,
        cache: TravelerCacheService,
        pub: TravelerEventPublisher,
      ) => new CreateTravelerUseCase(repo, cache, pub),
      inject: [TravelerRepository, TravelerCacheService, TravelerEventPublisher],
    },
    {
      provide: GetTravelerUseCase,
      useFactory: (repo: TravelerRepository, cache: TravelerCacheService) =>
        new GetTravelerUseCase(repo, cache),
      inject: [TravelerRepository, TravelerCacheService],
    },
    {
      provide: GetTravelersUseCase,
      useFactory: (repo: TravelerRepository) => new GetTravelersUseCase(repo),
      inject: [TravelerRepository],
    },
    {
      provide: UpdateTravelerUseCase,
      useFactory: (
        repo: TravelerRepository,
        cache: TravelerCacheService,
        pub: TravelerEventPublisher,
      ) => new UpdateTravelerUseCase(repo, cache, pub),
      inject: [TravelerRepository, TravelerCacheService, TravelerEventPublisher],
    },
    {
      provide: DeleteTravelerUseCase,
      useFactory: (
        repo: TravelerRepository,
        cache: TravelerCacheService,
        pub: TravelerEventPublisher,
      ) => new DeleteTravelerUseCase(repo, cache, pub),
      inject: [TravelerRepository, TravelerCacheService, TravelerEventPublisher],
    },
    {
      provide: GetTravelerPreferencesUseCase,
      useFactory: (repo: TravelerRepository, cache: TravelerCacheService) =>
        new GetTravelerPreferencesUseCase(repo, cache),
      inject: [TravelerRepository, TravelerCacheService],
    },
    {
      provide: UpdateTravelerPreferencesUseCase,
      useFactory: (
        repo: TravelerRepository,
        cache: TravelerCacheService,
        pub: TravelerEventPublisher,
      ) => new UpdateTravelerPreferencesUseCase(repo, cache, pub),
      inject: [TravelerRepository, TravelerCacheService, TravelerEventPublisher],
    },
    {
      provide: GetAdminTravelersUseCase,
      useFactory: (repo: TravelerRepository) => new GetAdminTravelersUseCase(repo),
      inject: [TravelerRepository],
    },
    {
      provide: SyncTravelersUseCase,
      useFactory: (
        repo: TravelerRepository,
        pub: TravelerEventPublisher,
        hr: HrSoapClientStub,
      ) => new SyncTravelersUseCase(repo, pub, hr),
      inject: [TravelerRepository, TravelerEventPublisher, HrSoapClientStub],
    },
    {
      provide: AuthTravelerUseCase,
      useFactory: (repo: TravelerRepository) => new AuthTravelerUseCase(repo),
      inject: [TravelerRepository],
    },
  ],
  exports: [MetricsService, LoggingService],
})
export class TravelerModule {}
