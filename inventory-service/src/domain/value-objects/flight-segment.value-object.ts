import { DomainException } from '@travel/shared';

export interface FlightSegmentProps {
  origin: string;
  destination: string;
  departureDate: Date;
  arrivalDate: Date;
  flightNumber: string;
  carrier: string;
}

export class FlightSegment {
  readonly origin: string;
  readonly destination: string;
  readonly departureDate: Date;
  readonly arrivalDate: Date;
  readonly flightNumber: string;
  readonly carrier: string;

  constructor(props: FlightSegmentProps) {
    if (props.origin.trim().toUpperCase() === props.destination.trim().toUpperCase()) {
      throw new DomainException(
        'Origin and destination must be different',
        'INVALID_FLIGHT_SEGMENT',
        422,
      );
    }
    if (props.departureDate >= props.arrivalDate) {
      throw new DomainException(
        'Departure date must be before arrival date',
        'INVALID_FLIGHT_SEGMENT',
        422,
      );
    }
    this.origin = props.origin.trim().toUpperCase();
    this.destination = props.destination.trim().toUpperCase();
    this.departureDate = props.departureDate;
    this.arrivalDate = props.arrivalDate;
    this.flightNumber = props.flightNumber;
    this.carrier = props.carrier;
  }
}
