import { AggregateRoot, DomainException, generateUuid } from '@travel/shared';
import { ReceiptStatus } from '../value-objects/receipt-status.enum';

export interface ReceiptProps {
  id: string;
  receiptNumber: string;
  bookingId: string;
  travelerId: string;
  travelerName: string;
  travelerEmail: string;
  amount: number;
  currency: string;
  origin: string;
  destination: string;
  departureDate: Date;
  status: ReceiptStatus;
  generatedAt: Date;
  voidedAt?: Date;
}

export interface CreateReceiptProps {
  receiptNumber: string;
  bookingId: string;
  travelerId: string;
  travelerName: string;
  travelerEmail: string;
  amount: number;
  currency?: string;
  origin: string;
  destination: string;
  departureDate: Date;
}

export class Receipt extends AggregateRoot<ReceiptProps> {
  static create(props: CreateReceiptProps): Receipt {
    const id = generateUuid();
    return new Receipt({
      id,
      receiptNumber: props.receiptNumber,
      bookingId: props.bookingId,
      travelerId: props.travelerId,
      travelerName: props.travelerName,
      travelerEmail: props.travelerEmail,
      amount: props.amount,
      currency: props.currency ?? 'USD',
      origin: props.origin,
      destination: props.destination,
      departureDate: props.departureDate,
      status: ReceiptStatus.ACTIVE,
      generatedAt: new Date(),
    });
  }

  get receiptNumber(): string {
    return this.props.receiptNumber;
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get travelerId(): string {
    return this.props.travelerId;
  }

  get travelerName(): string {
    return this.props.travelerName;
  }

  get travelerEmail(): string {
    return this.props.travelerEmail;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get origin(): string {
    return this.props.origin;
  }

  get destination(): string {
    return this.props.destination;
  }

  get departureDate(): Date {
    return this.props.departureDate;
  }

  get status(): ReceiptStatus {
    return this.props.status;
  }

  get generatedAt(): Date {
    return this.props.generatedAt;
  }

  get voidedAt(): Date | undefined {
    return this.props.voidedAt;
  }

  void(voidedAt: Date): void {
    if (this.props.status === ReceiptStatus.VOIDED) {
      throw new DomainException(
        'Receipt is already voided',
        'RECEIPT_ALREADY_VOIDED',
        409,
      );
    }
    this.props.status = ReceiptStatus.VOIDED;
    this.props.voidedAt = voidedAt;
  }
}
