import { DomainEvent, DomainEventProps } from '@travel/shared';

export interface FlightReservedData {
  reservationId: string;
  offerId: string;
  passengerId: string;
  origin: string;
  destination: string;
  flightNumber: string;
  carrier: string;
  departureAt: string;
  arrivalAt: string;
  cabinClass: string;
  expiresAt: string;
}

export interface FlightReservedProps extends DomainEventProps {
  data: FlightReservedData;
}

export class FlightReservedEvent extends DomainEvent {
  readonly data: FlightReservedData;

  constructor(props: FlightReservedProps) {
    super(props);
    this.data = props.data;
  }

  get eventName(): string {
    return 'FlightReserved';
  }
}
