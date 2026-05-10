import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { KafkaModule } from '@travel/shared';
import { ReceiptEntity } from './infrastructure/entities/receipt.entity';
import { ExpenseEntity } from './infrastructure/entities/expense.entity';
import { ExpenseReportEntity } from './infrastructure/entities/expense-report.entity';
import { ProcessedEventEntity } from './infrastructure/entities/processed-event.entity';
import { ReceiptRepository } from './infrastructure/repositories/receipt.repository';
import { ExpenseRepository } from './infrastructure/repositories/expense.repository';
import { ProcessedEventRepository } from './infrastructure/repositories/processed-event.repository';
import { ExpenseEventPublisher } from './infrastructure/kafka/expense-event.publisher';
import { BookingEventConsumer } from './infrastructure/kafka/booking-event.consumer';
import { ExpenseMetricsService } from './infrastructure/metrics/expense-metrics.service';
import { GenerateReceiptUseCase } from './application/use-cases/generate-receipt.use-case';
import { VoidReceiptUseCase } from './application/use-cases/void-receipt.use-case';
import { ExpenseQueryService } from './application/services/expense-query.service';
import { ReceiptController } from './presentation/controllers/receipt.controller';
import { ExpenseController } from './presentation/controllers/expense.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReceiptEntity,
      ExpenseEntity,
      ExpenseReportEntity,
      ProcessedEventEntity,
    ]),
    KafkaModule.register({
      clientId: process.env['KAFKA_CLIENT_ID'] ?? 'expense-service',
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
      groupId: process.env['KAFKA_GROUP_ID'] ?? 'expense-service-consumer',
    }),
  ],
  providers: [
    ExpenseMetricsService,
    ReceiptRepository,
    ExpenseRepository,
    ProcessedEventRepository,
    ExpenseEventPublisher,
    GenerateReceiptUseCase,
    VoidReceiptUseCase,
    ExpenseQueryService,
    BookingEventConsumer,
    {
      provide: 'DATA_SOURCE',
      useFactory: (dataSource: DataSource) => dataSource,
      inject: [DataSource],
    },
  ],
  controllers: [ReceiptController, ExpenseController],
})
export class ExpenseModule {}
