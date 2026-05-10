export interface PaymentMethodResponseDto {
  paymentMethodId: string;
  travelerId: string;
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isActive: boolean;
  createdAt: Date;
}
