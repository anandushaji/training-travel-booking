export interface AttachPaymentMethodCommand {
  travelerId: string;
  stripePaymentMethodId: string;
  cardBrand: string;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}
