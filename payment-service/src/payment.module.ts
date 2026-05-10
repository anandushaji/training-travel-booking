import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KafkaModule } from '@travel/shared';
import { PaymentTypeOrmEntity } from './infrastructure/persistence/entities/payment.typeorm-entity';
import { PaymentMethodTypeOrmEntity } from './infrastructure/persistence/entities/payment-method.typeorm-entity';
import { PaymentRepository } from './infrastructure/persistence/repositories/payment.repository';
import { PaymentMethodRepository } from './infrastructure/persistence/repositories/payment-method.repository';
import { PAYMENT_REPOSITORY } from './domain/repositories/payment.repository.interface';
import { PAYMENT_METHOD_REPOSITORY } from './domain/repositories/payment-method.repository.interface';
import { StripeClientService } from './infrastructure/stripe/stripe-client.service';
import { PaymentEventPublisher } from './infrastructure/events/payment-event.publisher';
import { MetricsService } from './infrastructure/observability/metrics.service';
import { AttachPaymentMethodUseCase } from './application/use-cases/attach-payment-method/attach-payment-method.use-case';
import { DetachPaymentMethodUseCase } from './application/use-cases/detach-payment-method/detach-payment-method.use-case';
import { ListPaymentMethodsUseCase } from './application/use-cases/list-payment-methods/list-payment-methods.use-case';
import { AuthorizePaymentUseCase } from './application/use-cases/authorize-payment/authorize-payment.use-case';
import { CapturePaymentUseCase } from './application/use-cases/capture-payment/capture-payment.use-case';
import { RefundPaymentUseCase } from './application/use-cases/refund-payment/refund-payment.use-case';
import { GetPaymentUseCase } from './application/use-cases/get-payment/get-payment.use-case';
import { PaymentController } from './presentation/controllers/payment.controller';
import { PaymentMethodController } from './presentation/controllers/payment-method.controller';
import { StripeWebhookController } from './presentation/controllers/stripe-webhook.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PaymentTypeOrmEntity, PaymentMethodTypeOrmEntity]),
    KafkaModule.register({
      clientId: process.env['KAFKA_CLIENT_ID'] ?? 'payment-service',
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
      groupId: process.env['KAFKA_GROUP_ID'] ?? 'payment-service-group',
    }),
  ],
  controllers: [PaymentController, PaymentMethodController, StripeWebhookController],
  providers: [
    // Infrastructure
    MetricsService,
    StripeClientService,
    PaymentEventPublisher,
    {
      provide: PAYMENT_REPOSITORY,
      useClass: PaymentRepository,
    },
    {
      provide: PAYMENT_METHOD_REPOSITORY,
      useClass: PaymentMethodRepository,
    },
    // Use cases
    AttachPaymentMethodUseCase,
    DetachPaymentMethodUseCase,
    ListPaymentMethodsUseCase,
    AuthorizePaymentUseCase,
    CapturePaymentUseCase,
    RefundPaymentUseCase,
    GetPaymentUseCase,
  ],
  exports: [MetricsService],
})
export class PaymentModule {}
