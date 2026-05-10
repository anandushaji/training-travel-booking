export type CabinClass = 'ECONOMY' | 'PREMIUM_ECONOMY' | 'BUSINESS' | 'FIRST';

export interface FlightOffer {
  id: string;
  airline: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  price: {
    amount: number;
    currency: string;
  };
  stops: number;
  duration: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass?: CabinClass;
  nonStop?: boolean;
}

export interface AirportOption {
  iata: string;
  name: string;
  city: string;
}

export interface SearchFilters {
  sortBy: 'price' | 'duration';
  maxPrice: number | null;
}

export interface SearchState {
  filters: SearchFilters;
  selectedOffer: FlightOffer | null;
}

export interface PolicyValidationResult {
  compliant: boolean;
}

export interface FlightSearchResponse {
  offers: FlightOffer[];
  meta: {
    count: number;
    cached: boolean;
    searchId: string;
  };
}
