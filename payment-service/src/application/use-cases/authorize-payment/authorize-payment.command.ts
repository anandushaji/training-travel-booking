export interface AuthorizePaymentCommand {
  travelerId: string;
  bookingId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  description?: string;
  correlationId?: string;
}

export interface AuthorizePaymentResponseDto {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  bookingId: string;
  stripePaymentIntentId: string;
  createdAt: Date;
}
