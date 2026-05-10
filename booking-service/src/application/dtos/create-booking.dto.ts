import {
  IsString,
  IsUUID,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  Min,
  Max,
  IsDateString,
  ValidateNested,
  IsInt,
} from 'class-validator';
import { Type } from 'class-transformer';

class ItineraryDto {
  @IsString()
  @IsNotEmpty()
  origin!: string;

  @IsString()
  @IsNotEmpty()
  destination!: string;

  @IsDateString()
  departureDate!: string;

  @IsOptional()
  @IsDateString()
  returnDate?: string;

  @IsString()
  @IsIn(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
  cabinClass!: string;

  @IsInt()
  @Min(1)
  @Max(9)
  passengers!: number;
}

export class CreateBookingDto {
  @IsUUID()
  travelerId!: string;

  @IsString()
  @IsNotEmpty()
  flightOfferId!: string;

  @ValidateNested()
  @Type(() => ItineraryDto)
  itinerary!: ItineraryDto;

  @IsNumber()
  @Min(0)
  totalAmount!: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
