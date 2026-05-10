import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface PaymentCapturedData {
  paymentId: string;
  bookingId: string;
  travelerId: string;
  capturedAmount: number;
  currency: string;
}

export class PaymentCapturedEvent extends DomainEvent {
  readonly data: PaymentCapturedData;

  get eventName(): string {
    return 'PaymentCaptured';
  }

  constructor(props: DomainEventProps & { data: PaymentCapturedData }) {
    super(props);
    this.data = props.data;
  }
}
