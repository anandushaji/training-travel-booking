import { AggregateRoot, DomainException, generateUuid } from '@travel/shared';
import { PaymentStatus } from '../value-objects/payment-status.enum';
import { Money } from '../value-objects/money.vo';
import { PaymentAuthorizedEvent } from '../events/payment-authorized.event';
import { PaymentCapturedEvent } from '../events/payment-captured.event';
import { PaymentRefundedEvent } from '../events/payment-refunded.event';
import { PaymentFailedEvent } from '../events/payment-failed.event';

export interface PaymentProps {
  id: string;
  travelerId: string;
  bookingId: string;
  paymentMethodId: string;
  money: Money;
  status: PaymentStatus;
  stripePaymentIntentId: string | null;
  idempotencyKey: string;
  description: string | null;
  failureReason: string | null;
  capturedAmount: number | null;
  refundedAmount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentProps {
  travelerId: string;
  bookingId: string;
  paymentMethodId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  description?: string;
  correlationId?: string;
  causationId?: string;
}

export class Payment extends AggregateRoot<PaymentProps> {
  static create(props: CreatePaymentProps): Payment {
    const id = generateUuid();
    const now = new Date();
    const money = new Money(props.amount, props.currency);

    const paymentProps: PaymentProps = {
      id,
      travelerId: props.travelerId,
      bookingId: props.bookingId,
      paymentMethodId: props.paymentMethodId,
      money,
      status: PaymentStatus.PENDING,
      stripePaymentIntentId: null,
      idempotencyKey: props.idempotencyKey,
      description: props.description ?? null,
      failureReason: null,
      capturedAmount: null,
      refundedAmount: null,
      createdAt: now,
      updatedAt: now,
    };

    return new Payment(paymentProps);
  }

  static reconstitute(props: PaymentProps): Payment {
    return new Payment(props);
  }

  get paymentId(): string {
    return this.props.id;
  }

  get travelerId(): string {
    return this.props.travelerId;
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get paymentMethodId(): string {
    return this.props.paymentMethodId;
  }

  get money(): Money {
    return this.props.money;
  }

  get status(): PaymentStatus {
    return this.props.status;
  }

  get stripePaymentIntentId(): string | null {
    return this.props.stripePaymentIntentId;
  }

  get idempotencyKey(): string {
    return this.props.idempotencyKey;
  }

  get description(): string | null {
    return this.props.description;
  }

  get failureReason(): string | null {
    return this.props.failureReason;
  }

  get capturedAmount(): number | null {
    return this.props.capturedAmount;
  }

  get refundedAmount(): number | null {
    return this.props.refundedAmount;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  authorize(stripePaymentIntentId: string, correlationId?: string, causationId?: string): void {
    if (this.props.status !== PaymentStatus.PENDING) {
      throw new DomainException(
        `Cannot authorize payment in status ${this.props.status}`,
        'INVALID_STATE_TRANSITION',
        409,
        { currentStatus: this.props.status, targetStatus: PaymentStatus.AUTHORIZED },
      );
    }
    this.props.status = PaymentStatus.AUTHORIZED;
    this.props.stripePaymentIntentId = stripePaymentIntentId;
    this.props.updatedAt = new Date();

    this.apply(
      new PaymentAuthorizedEvent({
        aggregateId: this.props.id,
        ...(correlationId !== undefined && { correlationId }),
        ...(causationId !== undefined && { causationId }),
        data: {
          paymentId: this.props.id,
          bookingId: this.props.bookingId,
          travelerId: this.props.travelerId,
          amount: this.props.money.amount,
          currency: this.props.money.currency,
          stripePaymentIntentId,
        },
      }),
    );
  }

  markCaptured(capturedAmount: number, correlationId?: string, causationId?: string): void {
    if (this.props.status !== PaymentStatus.AUTHORIZED) {
      throw new DomainException(
        `Cannot capture payment in status ${this.props.status}`,
        'INVALID_STATE_TRANSITION',
        409,
        { currentStatus: this.props.status, targetStatus: PaymentStatus.CAPTURED },
      );
    }
    this.props.status = PaymentStatus.CAPTURED;
    this.props.capturedAmount = capturedAmount;
    this.props.updatedAt = new Date();

    this.apply(
      new PaymentCapturedEvent({
        aggregateId: this.props.id,
        ...(correlationId !== undefined && { correlationId }),
        ...(causationId !== undefined && { causationId }),
        data: {
          paymentId: this.props.id,
          bookingId: this.props.bookingId,
          travelerId: this.props.travelerId,
          capturedAmount,
          currency: this.props.money.currency,
        },
      }),
    );
  }

  markRefunded(refundedAmount: number, reason: string, correlationId?: string, causationId?: string): void {
    if (this.props.status !== PaymentStatus.CAPTURED) {
      throw new DomainException(
        `Cannot refund payment in status ${this.props.status}`,
        'INVALID_STATE_TRANSITION',
        409,
        { currentStatus: this.props.status, targetStatus: PaymentStatus.REFUNDED },
      );
    }
    this.props.refundedAmount = refundedAmount;
    this.props.status =
      refundedAmount >= this.props.money.amount
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED;
    this.props.updatedAt = new Date();

    this.apply(
      new PaymentRefundedEvent({
        aggregateId: this.props.id,
        ...(correlationId !== undefined && { correlationId }),
        ...(causationId !== undefined && { causationId }),
        data: {
          paymentId: this.props.id,
          bookingId: this.props.bookingId,
          travelerId: this.props.travelerId,
          refundedAmount,
          currency: this.props.money.currency,
          reason,
        },
      }),
    );
  }

  markFailed(failureReason: string, correlationId?: string, causationId?: string): void {
    if (
      this.props.status !== PaymentStatus.PENDING &&
      this.props.status !== PaymentStatus.AUTHORIZED
    ) {
      throw new DomainException(
        `Cannot mark payment as failed in status ${this.props.status}`,
        'INVALID_STATE_TRANSITION',
        409,
        { currentStatus: this.props.status, targetStatus: PaymentStatus.FAILED },
      );
    }
    this.props.status = PaymentStatus.FAILED;
    this.props.failureReason = failureReason;
    this.props.updatedAt = new Date();

    this.apply(
      new PaymentFailedEvent({
        aggregateId: this.props.id,
        ...(correlationId !== undefined && { correlationId }),
        ...(causationId !== undefined && { causationId }),
        data: {
          paymentId: this.props.id,
          bookingId: this.props.bookingId,
          travelerId: this.props.travelerId,
          failureReason,
          amount: this.props.money.amount,
          currency: this.props.money.currency,
        },
      }),
    );
  }

  markCancelled(): void {
    if (this.props.status !== PaymentStatus.AUTHORIZED) {
      throw new DomainException(
        `Cannot cancel payment in status ${this.props.status}`,
        'INVALID_STATE_TRANSITION',
        409,
        { currentStatus: this.props.status, targetStatus: PaymentStatus.CANCELLED },
      );
    }
    this.props.status = PaymentStatus.CANCELLED;
    this.props.updatedAt = new Date();
    // No Kafka event published for CANCELLED (per design.md §7, AC-006-5)
  }
}
