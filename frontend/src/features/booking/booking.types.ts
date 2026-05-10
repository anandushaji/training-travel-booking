export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'FAILED';

export type PaymentMethod = 'CORPORATE_CARD' | 'PERSONAL_CARD' | 'INVOICE';

export interface BookingItinerary {
  origin: string;
  destination: string;
  departureDate: string;   // date string: YYYY-MM-DD
  returnDate?: string | undefined;
  cabinClass: 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';
  passengers: number;
}

export interface Booking {
  id: string;
  travelerId: string;
  flightOfferId: string;
  status: BookingStatus;
  itinerary: BookingItinerary;
  totalAmount: number;
  currency: string;
  policyValidationId?: string | undefined;
  paymentId?: string | undefined;
  reservationId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string | undefined;
  cancelledAt?: string | undefined;
  receiptId?: string | undefined;
}

export interface BookingRequest {
  travelerId: string;
  flightOfferId: string;
  itinerary: BookingItinerary;
  paymentMethod: PaymentMethod;
}

export interface BookingListResponse {
  bookings: Booking[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface BookingState {
  activeBooking: Booking | null;
  isPolling: boolean;
}
