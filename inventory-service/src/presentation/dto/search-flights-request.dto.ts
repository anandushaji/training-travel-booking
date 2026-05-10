import { IsString, IsDateString, IsInt, IsOptional, IsIn, Min, Max, Length } from 'class-validator';
import { Type } from 'class-transformer';

export class SearchFlightsRequestDto {
  @IsString()
  @Length(3, 3)
  origin!: string;

  @IsString()
  @Length(3, 3)
  destination!: string;

  @IsDateString()
  departureDate!: string;

  @IsDateString()
  @IsOptional()
  returnDate?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(9)
  passengers!: number;

  @IsOptional()
  @IsIn(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
  cabinClass?: string;
}
