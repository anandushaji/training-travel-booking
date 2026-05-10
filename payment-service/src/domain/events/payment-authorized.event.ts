import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface PaymentAuthorizedData {
  paymentId: string;
  bookingId: string;
  travelerId: string;
  amount: number;
  currency: string;
  stripePaymentIntentId: string;
}

export class PaymentAuthorizedEvent extends DomainEvent {
  readonly data: PaymentAuthorizedData;

  get eventName(): string {
    return 'PaymentAuthorized';
  }

  constructor(props: DomainEventProps & { data: PaymentAuthorizedData }) {
    super(props);
    this.data = props.data;
  }
}
