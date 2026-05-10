import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainException, NotFoundException } from '@travel/shared';
import {
  IPaymentMethodRepository,
  PAYMENT_METHOD_REPOSITORY,
} from '../../../domain/repositories/payment-method.repository.interface';
import { StripeClientService } from '../../../infrastructure/stripe/stripe-client.service';

export class ForbiddenException extends DomainException {
  constructor(message: string) {
    super(message, 'FORBIDDEN', 403);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export interface DetachPaymentMethodCommand {
  paymentMethodId: string;
  callerTravelerId: string;
}

@Injectable()
export class DetachPaymentMethodUseCase {
  private readonly logger = new Logger(DetachPaymentMethodUseCase.name);

  constructor(
    @Inject(PAYMENT_METHOD_REPOSITORY)
    private readonly paymentMethodRepo: IPaymentMethodRepository,
    private readonly stripeClient: StripeClientService,
  ) {}

  async execute(command: DetachPaymentMethodCommand): Promise<void> {
    const method = await this.paymentMethodRepo.findById(command.paymentMethodId);
    if (method === null) {
      throw new NotFoundException(
        `Payment method ${command.paymentMethodId} not found.`,
        { code: 'PAYMENT_METHOD_NOT_FOUND' },
      );
    }

    if (method.travelerId !== command.callerTravelerId) {
      throw new ForbiddenException(
        `Payment method ${command.paymentMethodId} does not belong to the caller.`,
      );
    }

    method.deactivate();
    await this.paymentMethodRepo.save(method);

    // Stripe detach is best-effort: failure does not roll back DB deactivation
    try {
      await this.stripeClient.detachPaymentMethod(method.stripePaymentMethodId);
    } catch (err: unknown) {
      this.logger.warn(
        `Stripe detach failed for ${method.stripePaymentMethodId}: ${String(err)}. Local deactivation retained.`,
      );
    }
  }
}
