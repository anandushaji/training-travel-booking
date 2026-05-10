import { AggregateRoot, DomainException } from '@travel/shared';
import { FlightReservationId } from '../value-objects/flight-reservation-id.value-object';
import { FlightSegment } from '../value-objects/flight-segment.value-object';
import { PassengerDetails } from '../value-objects/passenger-details.value-object';
import { ReservationStatus } from '../value-objects/reservation-status.value-object';
import { CabinClass, CabinClassValue } from '../value-objects/cabin-class.value-object';
import { FlightReservedEvent } from '../events/flight-reserved.event';
import { FlightReservationCancelledEvent } from '../events/flight-reservation-cancelled.event';
import { FlightReservationExpiredEvent } from '../events/flight-reservation-expired.event';
import { InvalidReservationStateException } from '../exceptions/invalid-reservation-state.exception';

export interface FlightReservationProps {
  id: string;
  offerId: string;
  amadeusOrderId: string | null;
  segment: FlightSegment;
  passenger: PassengerDetails;
  status: ReservationStatus;
  cabinClass: CabinClass;
  idempotencyKey: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFlightReservationProps {
  offerId: string;
  amadeusOrderId?: string;
  segment: FlightSegment;
  passenger: PassengerDetails;
  cabinClass: CabinClassValue;
  idempotencyKey: string;
  holdMinutes?: number;
  correlationId?: string;
  causationId?: string;
}

export class FlightReservation extends AggregateRoot<FlightReservationProps> {
  static create(props: CreateFlightReservationProps): FlightReservation {
    const id = FlightReservationId.generate().value;
    const now = new Date();
    const holdMinutes = props.holdMinutes ?? 15;
    const expiresAt = new Date(now.getTime() + holdMinutes * 60 * 1000);

    const reservationProps: FlightReservationProps = {
      id,
      offerId: props.offerId,
      amadeusOrderId: props.amadeusOrderId ?? null,
      segment: props.segment,
      passenger: props.passenger,
      status: new ReservationStatus('PENDING'),
      cabinClass: new CabinClass(props.cabinClass),
      idempotencyKey: props.idempotencyKey,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    const reservation = new FlightReservation(reservationProps);
    reservation.apply(
      new FlightReservedEvent({
        aggregateId: id,
        ...(props.correlationId !== undefined && { correlationId: props.correlationId }),
        ...(props.causationId !== undefined && { causationId: props.causationId }),
        data: {
          reservationId: id,
          offerId: props.offerId,
          passengerId: props.passenger.passengerId,
          origin: props.segment.origin,
          destination: props.segment.destination,
          flightNumber: props.segment.flightNumber,
          carrier: props.segment.carrier,
          departureAt: props.segment.departureDate.toISOString(),
          arrivalAt: props.segment.arrivalDate.toISOString(),
          cabinClass: props.cabinClass,
          expiresAt: expiresAt.toISOString(),
        },
      }),
    );
    return reservation;
  }

  get reservationId(): FlightReservationId {
    return FlightReservationId.from(this.props.id);
  }

  get offerId(): string {
    return this.props.offerId;
  }

  get amadeusOrderId(): string | null {
    return this.props.amadeusOrderId;
  }

  get segment(): FlightSegment {
    return this.props.segment;
  }

  get passenger(): PassengerDetails {
    return this.props.passenger;
  }

  get status(): ReservationStatus {
    return this.props.status;
  }

  get cabinClass(): CabinClass {
    return this.props.cabinClass;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  confirm(): void {
    if (this.props.status.value !== 'PENDING') {
      throw new InvalidReservationStateException(
        `Cannot confirm reservation in status ${this.props.status.value}`,
        { currentStatus: this.props.status.value, targetStatus: 'CONFIRMED' },
      );
    }
    this.props.status = new ReservationStatus('CONFIRMED');
    this.props.updatedAt = new Date();
  }

  cancel(correlationId?: string, causationId?: string): void {
    if (this.props.status.value !== 'PENDING' && this.props.status.value !== 'CONFIRMED') {
      throw new InvalidReservationStateException(
        `Cannot cancel reservation in status ${this.props.status.value}`,
        { currentStatus: this.props.status.value, targetStatus: 'CANCELLED' },
      );
    }
    const now = new Date();
    this.props.status = new ReservationStatus('CANCELLED');
    this.props.updatedAt = now;
    this.apply(
      new FlightReservationCancelledEvent({
        aggregateId: this.props.id,
        ...(correlationId !== undefined && { correlationId }),
        ...(causationId !== undefined && { causationId }),
        data: {
          reservationId: this.props.id,
          passengerId: this.props.passenger.passengerId,
          cancelledAt: now.toISOString(),
          reason: 'USER_REQUESTED',
        },
      }),
    );
  }

  expire(correlationId?: string, causationId?: string): void {
    if (this.props.status.value !== 'PENDING') {
      throw new InvalidReservationStateException(
        `Cannot expire reservation in status ${this.props.status.value}`,
        { currentStatus: this.props.status.value, targetStatus: 'EXPIRED' },
      );
    }
    const now = new Date();
    this.props.status = new ReservationStatus('EXPIRED');
    this.props.updatedAt = now;
    this.apply(
      new FlightReservationExpiredEvent({
        aggregateId: this.props.id,
        ...(correlationId !== undefined && { correlationId }),
        ...(causationId !== undefined && { causationId }),
        data: {
          reservationId: this.props.id,
          passengerId: this.props.passenger.passengerId,
          offerId: this.props.offerId,
          expiredAt: now.toISOString(),
        },
      }),
    );
  }

  isExpired(): boolean {
    return this.props.expiresAt < new Date();
  }
}
