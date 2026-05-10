export type ReservationStatusValue = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'EXPIRED';

export class ReservationStatus {
  readonly value: ReservationStatusValue;

  constructor(value: ReservationStatusValue) {
    this.value = value;
  }

  static PENDING = new ReservationStatus('PENDING');
  static CONFIRMED = new ReservationStatus('CONFIRMED');
  static CANCELLED = new ReservationStatus('CANCELLED');
  static EXPIRED = new ReservationStatus('EXPIRED');

  equals(other: ReservationStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
