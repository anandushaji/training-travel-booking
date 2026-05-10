export enum CabinClass {
  ECONOMY = 'ECONOMY',
  PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
  BUSINESS = 'BUSINESS',
  FIRST = 'FIRST',
}

export interface ItineraryProps {
  origin: string;
  destination: string;
  departureDate: Date;
  returnDate?: Date;
  cabinClass: CabinClass;
  passengers: number;
}

import { DomainException } from '@travel/shared';

export class Itinerary {
  readonly origin: string;
  readonly destination: string;
  readonly departureDate: Date;
  readonly returnDate: Date | undefined;
  readonly cabinClass: CabinClass;
  readonly passengers: number;

  constructor(props: ItineraryProps) {
    const iataRegex = /^[A-Z]{3}$/;
    if (!iataRegex.test(props.origin)) {
      throw new DomainException(
        `Invalid origin IATA code: ${props.origin}`,
        'INVALID_ORIGIN',
        400,
      );
    }
    if (!iataRegex.test(props.destination)) {
      throw new DomainException(
        `Invalid destination IATA code: ${props.destination}`,
        'INVALID_DESTINATION',
        400,
      );
    }
    if (props.passengers < 1 || props.passengers > 9) {
      throw new DomainException(
        `Passengers must be between 1 and 9, got ${props.passengers}`,
        'INVALID_PASSENGERS',
        400,
      );
    }
    if (!Object.values(CabinClass).includes(props.cabinClass)) {
      throw new DomainException(
        `Invalid cabin class: ${props.cabinClass}`,
        'INVALID_CABIN_CLASS',
        400,
      );
    }
    this.origin = props.origin;
    this.destination = props.destination;
    this.departureDate = props.departureDate;
    this.returnDate = props.returnDate;
    this.cabinClass = props.cabinClass;
    this.passengers = props.passengers;
  }

  toJSON(): Record<string, unknown> {
    return {
      origin: this.origin,
      destination: this.destination,
      departureDate: this.departureDate.toISOString().split('T')[0],
      ...(this.returnDate !== undefined && { returnDate: this.returnDate.toISOString().split('T')[0] }),
      cabinClass: this.cabinClass,
      passengers: this.passengers,
    };
  }
}
