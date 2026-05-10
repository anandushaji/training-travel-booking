import { AggregateRoot, DomainException, generateUuid } from '@travel/shared';
import { BookingStatus, TERMINAL_STATUSES } from '../value-objects/booking-status.enum';
import { Itinerary } from '../value-objects/itinerary.value-object';

export interface BookingProps {
  id: string;
  travelerId: string;
  offerId: string;
  status: BookingStatus;
  itinerary: Itinerary;
  policyValidationId?: string;
  reservationId?: string;
  paymentId?: string;
  totalAmount: number;
  currency: string;
  specialRequests?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  cancelReason?: string;
  travelerName?: string;
  travelerEmail?: string;
}

export interface CreateBookingProps {
  travelerId: string;
  offerId: string;
  itinerary: Itinerary;
  totalAmount: number;
  currency?: string;
}

export class Booking extends AggregateRoot<BookingProps> {
  static create(props: CreateBookingProps): Booking {
    const id = generateUuid();
    return new Booking({
      id,
      travelerId: props.travelerId,
      offerId: props.offerId,
      status: BookingStatus.PENDING,
      itinerary: props.itinerary,
      totalAmount: props.totalAmount,
      currency: props.currency ?? 'USD',
    });
  }

  get travelerId(): string {
    return this.props.travelerId;
  }

  get offerId(): string {
    return this.props.offerId;
  }

  get status(): BookingStatus {
    return this.props.status;
  }

  get itinerary(): Itinerary {
    return this.props.itinerary;
  }

  get reservationId(): string | undefined {
    return this.props.reservationId;
  }

  get paymentId(): string | undefined {
    return this.props.paymentId;
  }

  get totalAmount(): number {
    return this.props.totalAmount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get specialRequests(): string | undefined {
    return this.props.specialRequests;
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  get cancelReason(): string | undefined {
    return this.props.cancelReason;
  }

  get travelerName(): string | undefined {
    return this.props.travelerName;
  }

  get travelerEmail(): string | undefined {
    return this.props.travelerEmail;
  }

  get policyValidationId(): string | undefined {
    return this.props.policyValidationId;
  }

  reserve(reservationId: string): void {
    if (this.props.status !== BookingStatus.PENDING) {
      throw new DomainException(
        `Cannot reserve a booking with status ${this.props.status}`,
        'INVALID_STATE_TRANSITION',
        422,
      );
    }
    this.props.status = BookingStatus.RESERVED;
    this.props.reservationId = reservationId;
  }

  startPaymentProcessing(paymentId: string): void {
    if (this.props.status !== BookingStatus.RESERVED) {
      throw new DomainException(
        `Cannot start payment processing for booking with status ${this.props.status}`,
        'INVALID_STATE_TRANSITION',
        422,
      );
    }
    this.props.status = BookingStatus.PAYMENT_PROCESSING;
    this.props.paymentId = paymentId;
  }

  confirm(travelerName: string, travelerEmail: string): void {
    if (this.props.status !== BookingStatus.PAYMENT_PROCESSING) {
      throw new DomainException(
        `Cannot confirm a booking with status ${this.props.status}`,
        'INVALID_STATE_TRANSITION',
        422,
      );
    }
    this.props.status = BookingStatus.CONFIRMED;
    this.props.confirmedAt = new Date();
    this.props.travelerName = travelerName;
    this.props.travelerEmail = travelerEmail;
  }

  cancel(reason: string): void {
    if (this.props.status === BookingStatus.CANCELLED) {
      throw new DomainException(
        'Booking is already cancelled',
        'BOOKING_ALREADY_CANCELLED',
        409,
      );
    }
    // Allow cancel from CONFIRMED (with best-effort refund) and FAILED states;
    // all other terminal states fall through to set CANCELLED below.
    this.props.status = BookingStatus.CANCELLED;
    this.props.cancelledAt = new Date();
    this.props.cancelReason = reason;
  }

  fail(reason: string): void {
    this.props.status = BookingStatus.FAILED;
    this.props.cancelReason = reason;
  }

  updateSpecialRequests(specialRequests: string): void {
    this.props.specialRequests = specialRequests;
  }

  setPolicyValidationId(policyValidationId: string): void {
    this.props.policyValidationId = policyValidationId;
  }
}
