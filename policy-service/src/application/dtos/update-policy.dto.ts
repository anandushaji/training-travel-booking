import {
  IsString,
  IsOptional,
  IsBoolean,
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

class UpdatePolicyRulesDto {
  @IsNumber()
  @IsPositive()
  @IsOptional()
  maxFlightCost?: number;

  @IsArray()
  @IsEnum(CabinClass, { each: true })
  @IsOptional()
  allowedCabinClasses?: CabinClass[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  advanceBookingDays?: number;

  @IsBoolean()
  @IsOptional()
  requiresApproval?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  approvalThreshold?: number;

  @IsBoolean()
  @IsOptional()
  allowInternational?: boolean;
}

export class UpdatePolicyDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ValidateNested()
  @Type(() => UpdatePolicyRulesDto)
  @IsOptional()
  rules?: UpdatePolicyRulesDto;
}
