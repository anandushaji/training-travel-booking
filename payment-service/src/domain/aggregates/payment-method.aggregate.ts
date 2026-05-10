import { AggregateRoot, DomainException, generateUuid } from '@travel/shared';
import { CardBrandValue } from '../value-objects/card-brand.vo';

export interface PaymentMethodProps {
  id: string;
  travelerId: string;
  stripePaymentMethodId: string;
  cardBrand: CardBrandValue;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreatePaymentMethodProps {
  travelerId: string;
  stripePaymentMethodId: string;
  cardBrand: CardBrandValue;
  last4: string;
  expiryMonth: number;
  expiryYear: number;
}

export class PaymentMethod extends AggregateRoot<PaymentMethodProps> {
  static create(props: CreatePaymentMethodProps): PaymentMethod {
    const id = generateUuid();
    const now = new Date();

    const methodProps: PaymentMethodProps = {
      id,
      travelerId: props.travelerId,
      stripePaymentMethodId: props.stripePaymentMethodId,
      cardBrand: props.cardBrand,
      last4: props.last4,
      expiryMonth: props.expiryMonth,
      expiryYear: props.expiryYear,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    return new PaymentMethod(methodProps);
  }

  static reconstitute(props: PaymentMethodProps): PaymentMethod {
    return new PaymentMethod(props);
  }

  get paymentMethodId(): string {
    return this.props.id;
  }

  get travelerId(): string {
    return this.props.travelerId;
  }

  get stripePaymentMethodId(): string {
    return this.props.stripePaymentMethodId;
  }

  get cardBrand(): CardBrandValue {
    return this.props.cardBrand;
  }

  get last4(): string {
    return this.props.last4;
  }

  get expiryMonth(): number {
    return this.props.expiryMonth;
  }

  get expiryYear(): number {
    return this.props.expiryYear;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  deactivate(): void {
    if (!this.props.isActive) {
      throw new DomainException(
        'Payment method is already deactivated.',
        'PAYMENT_METHOD_ALREADY_INACTIVE',
        409,
      );
    }
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }
}
