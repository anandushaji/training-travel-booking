import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from '@travel/shared';

// Infrastructure — Entities (registered for TypeORM feature)
import { BookingEntity } from './infrastructure/entities/booking.entity';
import { BookingSagaEntity } from './infrastructure/entities/booking-saga.entity';
import { BookingSagaStepEntity } from './infrastructure/entities/booking-saga-step.entity';
import { EventStoreEntity } from './infrastructure/entities/event-store.entity';
import { BookingReadModelEntity } from './infrastructure/entities/booking-read-model.entity';

// Infrastructure — Repositories
import { BookingRepository } from './infrastructure/repositories/booking.repository';
import { BookingSagaRepository } from './infrastructure/repositories/booking-saga.repository';
import { BookingReadModelRepository } from './infrastructure/repositories/booking-read-model.repository';

// Infrastructure — HTTP Clients
import { PolicyServiceClient } from './infrastructure/http/policy-service.client';
import { InventoryServiceClient } from './infrastructure/http/inventory-service.client';
import { PaymentServiceClient } from './infrastructure/http/payment-service.client';

// Infrastructure — Kafka
import { BookingEventPublisher } from './infrastructure/kafka/booking-event.publisher';
import { PaymentEventConsumer } from './infrastructure/kafka/payment-event.consumer';

// Infrastructure — Metrics
import { BookingMetricsService } from './infrastructure/metrics/booking-metrics.service';

// Application — Saga
import { BookingSagaOrchestrator } from './application/saga/booking-saga.orchestrator';

// Application — Use Cases
import { CreateBookingUseCase } from './application/use-cases/create-booking.use-case';
import { CancelBookingUseCase } from './application/use-cases/cancel-booking.use-case';
import { UpdateBookingUseCase } from './application/use-cases/update-booking.use-case';

// Application — Query Service
import { BookingQueryService } from './application/services/booking-query.service';

// Application — Event Handlers
import { BookingReadModelUpdater } from './application/event-handlers/booking-read-model.updater';

// Presentation — Controllers
import { BookingController } from './presentation/controllers/booking.controller';
import { MetricsController } from './presentation/controllers/metrics.controller';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      BookingEntity,
      BookingSagaEntity,
      BookingSagaStepEntity,
      EventStoreEntity,
      BookingReadModelEntity,
    ]),
    KafkaModule.register({
      clientId: process.env['KAFKA_CLIENT_ID'] ?? 'booking-service',
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
      groupId: process.env['KAFKA_GROUP_ID'] ?? 'booking-service-group',
    }),
  ],
  controllers: [BookingController, MetricsController],
  providers: [
    // Infrastructure
    BookingMetricsService,
    BookingRepository,
    BookingSagaRepository,
    BookingReadModelRepository,
    PolicyServiceClient,
    InventoryServiceClient,
    PaymentServiceClient,
    BookingEventPublisher,
    PaymentEventConsumer,
    // Application
    BookingSagaOrchestrator,
    CreateBookingUseCase,
    CancelBookingUseCase,
    UpdateBookingUseCase,
    BookingQueryService,
    BookingReadModelUpdater,
  ],
  exports: [BookingMetricsService],
})
export class BookingModule {}
