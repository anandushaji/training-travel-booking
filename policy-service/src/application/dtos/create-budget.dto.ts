import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsOptional,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department!: string;

  @IsInt()
  @Min(2000)
  fiscalYear!: number;

  @IsNumber()
  @IsPositive()
  totalBudget!: number;

  @IsString()
  @IsNotEmpty()
  currency!: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  q1Budget?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  q2Budget?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  q3Budget?: number;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  q4Budget?: number;
}
