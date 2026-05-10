export interface RefundPaymentCommand {
  paymentId: string;
  callerTravelerId: string;
  amount?: number;
  reason: 'duplicate' | 'fraudulent' | 'requested_by_customer';
  correlationId?: string;
}

export interface RefundPaymentResponseDto {
  paymentId: string;
  status: string;
  refundedAmount: number;
  currency: string;
}
