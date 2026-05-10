import { IsArray, IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class HrEmployeeRecordDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  employeeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  department!: string;

  @IsOptional()
  @IsString()
  role?: string;
}

export class SyncTravelersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HrEmployeeRecordDto)
  employees!: HrEmployeeRecordDto[];
}

export interface SyncResult {
  synced: number;
  errors: Array<{ employeeId: string; reason: string }>;
}
