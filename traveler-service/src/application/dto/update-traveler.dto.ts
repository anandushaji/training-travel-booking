import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { TravelerRoleEnum } from './create-traveler.dto';

export class UpdateTravelerDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @IsEnum(TravelerRoleEnum)
  role?: TravelerRoleEnum;
}
