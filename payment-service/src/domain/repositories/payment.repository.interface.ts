import { Payment } from '../aggregates/payment.aggregate';

export const PAYMENT_REPOSITORY = 'PAYMENT_REPOSITORY';

export interface IPaymentRepository {
  save(payment: Payment): Promise<void>;
  findById(paymentId: string): Promise<Payment | null>;
  findByIdempotencyKey(key: string): Promise<Payment | null>;
  findByStripePaymentIntentId(stripePaymentIntentId: string): Promise<Payment | null>;
}
