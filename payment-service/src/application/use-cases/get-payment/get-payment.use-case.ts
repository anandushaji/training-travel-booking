import { Inject, Injectable } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import {
  IPaymentRepository,
  PAYMENT_REPOSITORY,
} from '../../../domain/repositories/payment.repository.interface';
import { ForbiddenException } from '../detach-payment-method/detach-payment-method.use-case';
import { GetPaymentQuery, GetPaymentResponseDto } from './get-payment.query';

@Injectable()
export class GetPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY)
    private readonly paymentRepo: IPaymentRepository,
  ) {}

  async execute(query: GetPaymentQuery): Promise<GetPaymentResponseDto> {
    const payment = await this.paymentRepo.findById(query.paymentId);
    if (payment === null) {
      throw new NotFoundException(
        `Payment ${query.paymentId} not found.`,
        { code: 'PAYMENT_NOT_FOUND' },
      );
    }

    if (payment.travelerId !== query.callerTravelerId) {
      throw new ForbiddenException(
        `Payment ${query.paymentId} does not belong to the caller.`,
      );
    }

    // Response MUST NOT include stripePaymentIntentId or stripePaymentMethodId
    return {
      paymentId: payment.paymentId,
      status: payment.status,
      amount: payment.money.amount,
      currency: payment.money.currency,
      bookingId: payment.bookingId,
      travelerId: payment.travelerId,
      paymentMethodId: payment.paymentMethodId,
      failureReason: payment.failureReason,
      capturedAmount: payment.capturedAmount,
      refundedAmount: payment.refundedAmount,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    };
  }
}
