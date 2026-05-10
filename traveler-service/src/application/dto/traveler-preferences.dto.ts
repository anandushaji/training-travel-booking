import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import {
  MealPreference,
  SeatPreference,
} from '../../domain/value-objects/traveler-preferences.value-object';

export class TravelerPreferencesDto {
  @IsOptional()
  @IsEnum(['window', 'aisle', 'middle', 'none'])
  seatPreference?: SeatPreference;

  @IsOptional()
  @IsEnum(['standard', 'vegetarian', 'vegan', 'halal', 'kosher', 'none'])
  mealPreference?: MealPreference;

  @IsOptional()
  @IsObject()
  frequentFlyerNumbers?: Record<string, string>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  preferredAirlines?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  specialAssistance?: string[];
}
