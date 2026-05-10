import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { IFlightReservationRepository, FLIGHT_RESERVATION_REPOSITORY } from '../../../domain/repositories/flight-reservation.repository.interface';
import { ReservationResponse } from '../create-reservation/create-reservation.result';
import { GetReservationQuery } from './get-reservation.query';

function toResponse(r: import('../../../domain/aggregates/flight-reservation.aggregate').FlightReservation): ReservationResponse {
  return {
    reservationId: r.id,
    status: r.status.value,
    expiresAt: r.expiresAt.toISOString(),
    segment: {
      origin: r.segment.origin,
      destination: r.segment.destination,
      departureAt: r.segment.departureDate.toISOString(),
      arrivalAt: r.segment.arrivalDate.toISOString(),
      flightNumber: r.segment.flightNumber,
      carrier: r.segment.carrier,
    },
    passenger: {
      passengerId: r.passenger.passengerId,
      firstName: r.passenger.firstName,
      lastName: r.passenger.lastName,
    },
    cabinClass: r.cabinClass.value,
    createdAt: r.createdAt.toISOString(),
  };
}

@Injectable()
export class GetReservationUseCase {
  constructor(
    @Inject(FLIGHT_RESERVATION_REPOSITORY)
    private readonly reservationRepo: IFlightReservationRepository,
  ) {}

  async execute(query: GetReservationQuery): Promise<ReservationResponse> {
    const reservation = await this.reservationRepo.findById(query.reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reservation ${query.reservationId} not found`);
    }
    return toResponse(reservation);
  }
}
