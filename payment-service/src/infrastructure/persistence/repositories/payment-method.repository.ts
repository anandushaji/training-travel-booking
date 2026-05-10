import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentMethod, PaymentMethodProps } from '../../../domain/aggregates/payment-method.aggregate';
import { IPaymentMethodRepository } from '../../../domain/repositories/payment-method.repository.interface';
import { PaymentMethodTypeOrmEntity } from '../entities/payment-method.typeorm-entity';
import { CardBrandValue } from '../../../domain/value-objects/card-brand.vo';

function toDomain(entity: PaymentMethodTypeOrmEntity): PaymentMethod {
  const props: PaymentMethodProps = {
    id: entity.id,
    travelerId: entity.travelerId,
    stripePaymentMethodId: entity.stripePaymentMethodId,
    cardBrand: entity.cardBrand as CardBrandValue,
    last4: entity.last4,
    expiryMonth: entity.expiryMonth,
    expiryYear: entity.expiryYear,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
  return PaymentMethod.reconstitute(props);
}

function toPersistence(method: PaymentMethod): Partial<PaymentMethodTypeOrmEntity> {
  return {
    id: method.paymentMethodId,
    travelerId: method.travelerId,
    stripePaymentMethodId: method.stripePaymentMethodId,
    cardBrand: method.cardBrand,
    last4: method.last4,
    expiryMonth: method.expiryMonth,
    expiryYear: method.expiryYear,
    isActive: method.isActive,
  };
}

@Injectable()
export class PaymentMethodRepository implements IPaymentMethodRepository {
  constructor(
    @InjectRepository(PaymentMethodTypeOrmEntity)
    private readonly repo: Repository<PaymentMethodTypeOrmEntity>,
  ) {}

  async save(method: PaymentMethod): Promise<void> {
    const entity = toPersistence(method);
    await this.repo.save(entity as PaymentMethodTypeOrmEntity);
  }

  async findById(paymentMethodId: string): Promise<PaymentMethod | null> {
    const entity = await this.repo.findOne({ where: { id: paymentMethodId } });
    return entity ? toDomain(entity) : null;
  }

  async findByTravelerId(travelerId: string): Promise<PaymentMethod[]> {
    const entities = await this.repo.find({
      where: { travelerId, isActive: true },
      order: { createdAt: 'DESC' },
    });
    return entities.map(toDomain);
  }

  async findByStripePaymentMethodId(stripeId: string): Promise<PaymentMethod | null> {
    const entity = await this.repo.findOne({ where: { stripePaymentMethodId: stripeId } });
    return entity ? toDomain(entity) : null;
  }
}
