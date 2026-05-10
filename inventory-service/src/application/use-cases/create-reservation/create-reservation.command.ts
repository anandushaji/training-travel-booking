export interface CreateReservationCommand {
  offerId: string;
  passengerId: string;
  passengerFirstName: string;
  passengerLastName: string;
  passengerDob?: string;
  passportNumber?: string;
  cabinClass: string;
  idempotencyKey: string;
  holdMinutes?: number;
  correlationId?: string;
  causationId?: string;
}
