export interface CancelReservationCommand {
  reservationId: string;
  correlationId?: string;
  causationId?: string;
}
