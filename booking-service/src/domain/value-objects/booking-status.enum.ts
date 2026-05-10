export enum BookingStatus {
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
}

export const TERMINAL_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.CANCELLED,
  BookingStatus.FAILED,
];
