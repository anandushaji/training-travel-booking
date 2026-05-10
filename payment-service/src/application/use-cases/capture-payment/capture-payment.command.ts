export interface CapturePaymentCommand {
  paymentId: string;
  callerTravelerId: string;
  correlationId?: string;
}

export interface CapturePaymentResponseDto {
  paymentId: string;
  status: string;
  capturedAmount: number;
  currency: string;
}
