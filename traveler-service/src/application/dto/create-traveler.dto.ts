import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export enum TravelerRoleEnum {
  EMPLOYEE = 'EMPLOYEE',
  MANAGER = 'MANAGER',
  ADMIN = 'ADMIN',
}

export class CreateTravelerDto {
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

  @IsEnum(TravelerRoleEnum)
  role!: TravelerRoleEnum;
}
