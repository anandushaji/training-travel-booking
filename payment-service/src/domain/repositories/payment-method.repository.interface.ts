import { PaymentMethod } from '../aggregates/payment-method.aggregate';

export const PAYMENT_METHOD_REPOSITORY = 'PAYMENT_METHOD_REPOSITORY';

export interface IPaymentMethodRepository {
  save(method: PaymentMethod): Promise<void>;
  findById(paymentMethodId: string): Promise<PaymentMethod | null>;
  findByTravelerId(travelerId: string): Promise<PaymentMethod[]>;
  findByStripePaymentMethodId(stripeId: string): Promise<PaymentMethod | null>;
}
