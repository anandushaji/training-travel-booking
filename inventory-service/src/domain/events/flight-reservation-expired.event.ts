import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface FlightReservationExpiredData {
  reservationId: string;
  passengerId: string;
  offerId: string;
  expiredAt: string;
}

export interface FlightReservationExpiredProps extends DomainEventProps {
  data: FlightReservationExpiredData;
}

export class FlightReservationExpiredEvent extends DomainEvent {
  readonly data: FlightReservationExpiredData;

  constructor(props: FlightReservationExpiredProps) {
    super(props);
    this.data = props.data;
  }

  get eventName(): string {
    return 'FlightReservationExpired';
  }
}
