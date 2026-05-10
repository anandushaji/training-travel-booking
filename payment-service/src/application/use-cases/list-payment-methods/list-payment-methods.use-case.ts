import { Inject, Injectable } from '@nestjs/common';
import {
  IPaymentMethodRepository,
  PAYMENT_METHOD_REPOSITORY,
} from '../../../domain/repositories/payment-method.repository.interface';
import { PaymentMethodResponseDto } from '../../dto/payment-method.response.dto';

@Injectable()
export class ListPaymentMethodsUseCase {
  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: IPaymentMethodRepository,
  ) {}

  async execute(travelerId: string): Promise<PaymentMethodResponseDto[]> {
    const methods = await this.paymentMethodRepo.findByTravelerId(travelerId);
    return methods.map((m) => ({
      paymentMethodId: m.paymentMethodId,
      travelerId: m.travelerId,
      cardBrand: m.cardBrand,
      last4: m.last4,
      expiryMonth: m.expiryMonth,
      expiryYear: m.expiryYear,
      isActive: m.isActive,
      createdAt: m.createdAt,
    }));
  }
}
