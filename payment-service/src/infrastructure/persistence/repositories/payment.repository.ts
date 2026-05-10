import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentProps } from '../../../domain/aggregates/payment.aggregate';
import { IPaymentRepository } from '../../../domain/repositories/payment.repository.interface';
import { PaymentTypeOrmEntity } from '../entities/payment.typeorm-entity';
import { PaymentStatus } from '../../../domain/value-objects/payment-status.enum';
import { Money } from '../../../domain/value-objects/money.vo';

function toDomain(entity: PaymentTypeOrmEntity): Payment {
  const props: PaymentProps = {
    id: entity.id,
    travelerId: entity.travelerId,
    bookingId: entity.bookingId,
    paymentMethodId: entity.paymentMethodId,
    money: new Money(parseFloat(entity.amount), entity.currency),
    status: entity.status as PaymentStatus,
    stripePaymentIntentId: entity.stripePaymentIntentId,
    idempotencyKey: entity.idempotencyKey,
    description: entity.description,
    failureReason: entity.failureReason,
    capturedAmount: entity.capturedAmount !== null ? parseFloat(entity.capturedAmount) : null,
    refundedAmount: entity.refundedAmount !== null ? parseFloat(entity.refundedAmount) : null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
  return Payment.reconstitute(props);
}

function toPersistence(payment: Payment): Partial<PaymentTypeOrmEntity> {
  return {
    id: payment.paymentId,
    travelerId: payment.travelerId,
    bookingId: payment.bookingId,
    paymentMethodId: payment.paymentMethodId,
    amount: payment.money.amount.toString(),
    currency: payment.money.currency,
    status: payment.status,
    stripePaymentIntentId: payment.stripePaymentIntentId,
    idempotencyKey: payment.idempotencyKey,
    description: payment.description,
    failureReason: payment.failureReason,
    capturedAmount: payment.capturedAmount !== null ? payment.capturedAmount.toString() : null,
    refundedAmount: payment.refundedAmount !== null ? payment.refundedAmount.toString() : null,
  };
}

@Injectable()
export class PaymentRepository implements IPaymentRepository {
  constructor(
    @InjectRepository(PaymentTypeOrmEntity)
    private readonly repo: Repository<PaymentTypeOrmEntity>,
  ) {}

  async save(payment: Payment): Promise<void> {
    const entity = toPersistence(payment);
    await this.repo.save(entity as PaymentTypeOrmEntity);
    payment.clearEvents();
  }

  async findById(paymentId: string): Promise<Payment | null> {
    const entity = await this.repo.findOne({ where: { id: paymentId } });
    return entity ? toDomain(entity) : null;
  }

  async findByIdempotencyKey(key: string): Promise<Payment | null> {
    const entity = await this.repo.findOne({ where: { idempotencyKey: key } });
    return entity ? toDomain(entity) : null;
  }

  async findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<Payment | null> {
    const entity = await this.repo.findOne({ where: { stripePaymentIntentId } });
    return entity ? toDomain(entity) : null;
  }
}
