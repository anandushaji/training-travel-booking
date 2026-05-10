import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class AuthTravelerDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
