import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface FlightReservationCancelledData {
  reservationId: string;
  passengerId: string;
  cancelledAt: string;
  reason: string;
}

export interface FlightReservationCancelledProps extends DomainEventProps {
  data: FlightReservationCancelledData;
}

export class FlightReservationCancelledEvent extends DomainEvent {
  readonly data: FlightReservationCancelledData;

  constructor(props: FlightReservationCancelledProps) {
    super(props);
    this.data = props.data;
  }

  get eventName(): string {
    return 'FlightReservationCancelled';
  }
}
