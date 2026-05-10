import { IsString, IsDateString, IsInt, IsOptional, IsIn, IsBoolean, Min, Max, Length } from 'class-validator';
import { Type, Transform } from 'class-transformer';

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

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  nonStop?: boolean;
}
