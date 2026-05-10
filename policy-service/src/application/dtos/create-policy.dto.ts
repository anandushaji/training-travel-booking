import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsDefined,
  IsNumber,
  IsArray,
  IsEnum,
  IsPositive,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';

export class PolicyRulesDto {
  @IsNumber()
  @IsPositive()
  maxFlightCost!: number;

  @IsArray()
  @IsEnum(CabinClass, { each: true })
  allowedCabinClasses!: CabinClass[];

  @IsNumber()
  @Min(0)
  advanceBookingDays!: number;

  @IsBoolean()
  requiresApproval!: boolean;

  @IsNumber()
  @Min(0)
  approvalThreshold!: number;

  @IsBoolean()
  allowInternational!: boolean;
}

export class CreatePolicyDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department!: string;

  @IsDefined()
  @ValidateNested()
  @Type(() => PolicyRulesDto)
  rules!: PolicyRulesDto;
}
