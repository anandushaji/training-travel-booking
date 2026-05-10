export interface ReservationResponse {
  reservationId: string;
  status: string;
  expiresAt: string;
  segment: {
    origin: string;
    destination: string;
    departureAt: string;
    arrivalAt: string;
    flightNumber: string;
    carrier: string;
  };
  passenger: {
    passengerId: string;
    firstName: string;
    lastName: string;
  };
  cabinClass: string;
  createdAt: string;
}
