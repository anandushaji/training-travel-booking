import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AttachPaymentMethodDto {
  @IsString()
  @Matches(/^pm_[a-zA-Z0-9_]+$/, { message: 'stripePaymentMethodId must match pm_[a-zA-Z0-9_]+' })
  stripePaymentMethodId!: string;

  @IsEnum(['visa', 'mastercard', 'amex', 'discover', 'unknown'])
  cardBrand!: string;

  @IsString()
  @Matches(/^[0-9]{4}$/, { message: 'last4 must be exactly 4 digits' })
  last4!: string;

  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  expiryMonth!: number;

  @IsNumber()
  @Min(2024)
  @Type(() => Number)
  expiryYear!: number;
}

export class CreatePaymentDto {
  @IsUUID()
  paymentMethodId!: string;

  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount!: number;

  @IsString()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-character ISO 4217 code' })
  currency!: string;

  @IsUUID()
  bookingId!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class RefundPaymentDto {
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Type(() => Number)
  amount?: number;

  @IsEnum(['duplicate', 'fraudulent', 'requested_by_customer'])
  @IsNotEmpty()
  reason!: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}
