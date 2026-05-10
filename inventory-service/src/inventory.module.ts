import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { KafkaModule } from '@travel/shared';

// Infrastructure — persistence
import { FlightReservationTypeOrmEntity } from './infrastructure/persistence/entities/flight-reservation.typeorm-entity';
import { FlightReservationTypeOrmRepository } from './infrastructure/persistence/repositories/flight-reservation.typeorm-repository';
import { FLIGHT_RESERVATION_REPOSITORY } from './domain/repositories/flight-reservation.repository.interface';

// Infrastructure — cache & idempotency
import { FlightSearchCacheService, REDIS_CLIENT } from './infrastructure/cache/flight-search-cache.service';
import { IdempotencyService } from './infrastructure/idempotency/idempotency.service';

// Infrastructure — Amadeus
import { AmadeusModule } from './infrastructure/amadeus/amadeus.module';

// Infrastructure — Kafka
import { InventoryEventPublisher } from './infrastructure/kafka/inventory-event.publisher';

// Infrastructure — jobs
import { ReservationExpiryJob } from './infrastructure/jobs/reservation-expiry.job';

// Infrastructure — observability
import { MetricsService } from './infrastructure/observability/metrics.service';

// Application — use cases
import { SearchFlightsUseCase } from './application/use-cases/search-flights/search-flights.use-case';
import { CreateReservationUseCase } from './application/use-cases/create-reservation/create-reservation.use-case';
import { GetReservationUseCase } from './application/use-cases/get-reservation/get-reservation.use-case';
import { CancelReservationUseCase } from './application/use-cases/cancel-reservation/cancel-reservation.use-case';

// Presentation
import { FlightsController } from './presentation/controllers/flights.controller';
import { ReservationsController } from './presentation/controllers/reservations.controller';
import { MetricsController } from './presentation/controllers/metrics.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([FlightReservationTypeOrmEntity]),
    AmadeusModule,
    KafkaModule.register({
      clientId: 'inventory-service',
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
      groupId: 'inventory-service-group',
    }),
  ],
  controllers: [FlightsController, ReservationsController, MetricsController],
  providers: [
    // Redis client
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        return new Redis(url);
      },
    },

    // Infrastructure
    {
      provide: FLIGHT_RESERVATION_REPOSITORY,
      useClass: FlightReservationTypeOrmRepository,
    },
    FlightReservationTypeOrmRepository,
    FlightSearchCacheService,
    IdempotencyService,
    InventoryEventPublisher,
    ReservationExpiryJob,
    MetricsService,

    // Use cases
    SearchFlightsUseCase,
    CreateReservationUseCase,
    GetReservationUseCase,
    CancelReservationUseCase,
  ],
})
export class InventoryModule {}
