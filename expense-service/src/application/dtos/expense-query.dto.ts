import { IsDateString, IsNotEmpty, IsOptional, IsUUID, IsInt, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ExpenseQueryDto {
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @IsDateString()
  @IsNotEmpty()
  endDate!: string;

  @IsOptional()
  @IsUUID()
  travelerId?: string;

  @IsOptional()
  @IsIn(['department', 'traveler', 'month', 'category'])
  groupBy?: 'department' | 'traveler' | 'month' | 'category';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
