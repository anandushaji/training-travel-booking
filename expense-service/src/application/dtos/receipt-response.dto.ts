export class ReceiptResponseDto {
  id!: string;
  receiptNumber!: string;
  bookingId!: string;
  travelerId!: string;
  travelerName!: string;
  travelerEmail!: string;
  amount!: number;
  currency!: string;
  origin!: string;
  destination!: string;
  departureDate!: string;
  status!: string;
  generatedAt!: string;
  voidedAt?: string;
}

export class PaginationDto {
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
