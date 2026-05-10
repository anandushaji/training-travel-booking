import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface PaymentRefundedData {
  paymentId: string;
  bookingId: string;
  travelerId: string;
  refundedAmount: number;
  currency: string;
  reason: string;
}

export class PaymentRefundedEvent extends DomainEvent {
  readonly data: PaymentRefundedData;

  get eventName(): string {
    return 'PaymentRefunded';
  }

  constructor(props: DomainEventProps & { data: PaymentRefundedData }) {
    super(props);
    this.data = props.data;
  }
}
