export interface GetPaymentQuery {
  paymentId: string;
  callerTravelerId: string;
}

export interface GetPaymentResponseDto {
  paymentId: string;
  status: string;
  amount: number;
  currency: string;
  bookingId: string;
  travelerId: string;
  paymentMethodId: string;
  failureReason: string | null;
  capturedAmount: number | null;
  refundedAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
}
