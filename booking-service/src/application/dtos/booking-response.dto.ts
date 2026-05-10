export class BookingResponseDto {
  id!: string;
  travelerId!: string;
  offerId!: string;
  status!: string;
  itinerary!: Record<string, unknown>;
  reservationId?: string;
  paymentId?: string;
  totalAmount!: number;
  currency!: string;
  specialRequests?: string;
  travelerName?: string;
  travelerEmail?: string;
  confirmedAt?: string;
  cancelledAt?: string;
  cancelReason?: string;
  createdAt?: string;
}
