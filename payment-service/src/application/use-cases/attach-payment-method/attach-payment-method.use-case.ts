import { Inject, Injectable } from '@nestjs/common';
import { ConflictException } from '@travel/shared';
import { PaymentMethod } from '../../../domain/aggregates/payment-method.aggregate';
import {
  IPaymentMethodRepository,
  PAYMENT_METHOD_REPOSITORY,
} from '../../../domain/repositories/payment-method.repository.interface';
import { AttachPaymentMethodCommand } from './attach-payment-method.command';
import { PaymentMethodResponseDto } from '../../dto/payment-method.response.dto';
import { CardBrandValue } from '../../../domain/value-objects/card-brand.vo';

@Injectable()
export class AttachPaymentMethodUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: IPaymentMethodRepository,
  ) {}

  async execute(command: AttachPaymentMethodCommand): Promise<PaymentMethodResponseDto> {
    // Check for duplicate stripePaymentMethodId
    const existing = await this.paymentMethodRepo.findByStripePaymentMethodId(
      command.stripePaymentMethodId,
    );
    if (existing !== null) {
      throw new ConflictException(
        `Payment method ${command.stripePaymentMethodId} already attached.`,
        'PAYMENT_METHOD_ALREADY_EXISTS',
      );
    }

    const method = PaymentMethod.create({
      travelerId: command.travelerId, // from JWT — not from request body
      stripePaymentMethodId: command.stripePaymentMethodId,
      cardBrand: command.cardBrand as CardBrandValue,
      last4: command.last4,
      expiryMonth: command.expiryMonth,
      expiryYear: command.expiryYear,
    });

    await this.paymentMethodRepo.save(method);

    return {
      paymentMethodId: method.paymentMethodId,
      travelerId: method.travelerId,
      cardBrand: method.cardBrand,
      last4: method.last4,
      expiryMonth: method.expiryMonth,
      expiryYear: method.expiryYear,
      isActive: method.isActive,
      createdAt: method.createdAt,
    };
  }
}
