import {
  IsUUID,
  IsNumber,
  IsPositive,
  IsOptional,
  IsEnum,
  IsString,
  Min,
} from 'class-validator';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';

export class PolicyValidationRequestDto {
  @IsUUID()
  travelerId!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsEnum(CabinClass)
  @IsOptional()
  cabinClass?: CabinClass;

  @IsString()
  @IsOptional()
  origin?: string;

  @IsString()
  @IsOptional()
  destination?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  advanceBookingDays?: number;

  @IsString()
  @IsOptional()
  bookingRef?: string;
}
