export interface FlightOfferResult {
  offerId: string;
  carrier: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureAt: string;
  arrivalAt: string;
  cabinClass: string;
  price: { amount: string; currency: string };
  seatsAvailable: number;
  source: 'LIVE' | 'CACHE';
}

export interface SearchFlightsResult {
  data: FlightOfferResult[];
  meta: { count: number; cachedAt: string | null };
}
