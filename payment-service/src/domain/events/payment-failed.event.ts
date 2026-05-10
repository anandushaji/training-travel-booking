import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface PaymentFailedData {
  paymentId: string;
  bookingId: string;
  travelerId: string;
  failureReason: string;
  amount: number;
  currency: string;
}

export class PaymentFailedEvent extends DomainEvent {
  readonly data: PaymentFailedData;

  get eventName(): string {
    return 'PaymentFailed';
  }

  constructor(props: DomainEventProps & { data: PaymentFailedData }) {
    super(props);
    this.data = props.data;
  }
}
