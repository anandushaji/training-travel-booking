import { FlightReservation } from '../aggregates/flight-reservation.aggregate';

export const FLIGHT_RESERVATION_REPOSITORY = 'FLIGHT_RESERVATION_REPOSITORY';

export interface IFlightReservationRepository {
  findById(id: string): Promise<FlightReservation | null>;
  save(reservation: FlightReservation): Promise<void>;
  findPendingExpired(now: Date): Promise<FlightReservation[]>;
}
