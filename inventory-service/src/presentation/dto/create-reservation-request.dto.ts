import { IsString, IsUUID, IsIn } from 'class-validator';

export class CreateReservationRequestDto {
  @IsString()
  offerId!: string;

  @IsUUID()
  passengerId!: string;

  @IsIn(['ECONOMY', 'PREMIUM_ECONOMY', 'BUSINESS', 'FIRST'])
  cabinClass!: string;
}
