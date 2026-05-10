import { DomainException } from '@travel/shared';

export class StripePaymentMethodId {
  constructor(readonly value: string) {
    if (!/^pm_[a-zA-Z0-9_]+$/.test(value)) {
      throw new DomainException(
        `Invalid Stripe payment method ID: "${value}". Must match pm_[a-zA-Z0-9_]+`,
        'INVALID_STRIPE_PAYMENT_METHOD_ID',
        422,
        { value },
      );
    }
  }
}
