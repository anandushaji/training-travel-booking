import { ValueObject } from '@travel/shared';

export type SeatPreference = 'window' | 'aisle' | 'middle' | 'none';
export type MealPreference =
  | 'standard'
  | 'vegetarian'
  | 'vegan'
  | 'halal'
  | 'kosher'
  | 'none';

export interface TravelerPreferencesProps {
  seatPreference: SeatPreference;
  mealPreference: MealPreference;
  frequentFlyerNumbers: Record<string, string>;
  preferredAirlines: string[];
  specialAssistance: string[];
}

export class TravelerPreferences extends ValueObject<TravelerPreferencesProps> {
  static default(): TravelerPreferences {
    return new TravelerPreferences({
      seatPreference: 'none',
      mealPreference: 'standard',
      frequentFlyerNumbers: {},
      preferredAirlines: [],
      specialAssistance: [],
    });
  }

  static from(raw: Partial<TravelerPreferencesProps>): TravelerPreferences {
    return new TravelerPreferences({
      seatPreference: raw.seatPreference ?? 'none',
      mealPreference: raw.mealPreference ?? 'standard',
      frequentFlyerNumbers: raw.frequentFlyerNumbers ?? {},
      preferredAirlines: raw.preferredAirlines ?? [],
      specialAssistance: raw.specialAssistance ?? [],
    });
  }

  get seatPreference(): SeatPreference {
    return this.props.seatPreference;
  }

  get mealPreference(): MealPreference {
    return this.props.mealPreference;
  }

  get frequentFlyerNumbers(): Record<string, string> {
    return this.props.frequentFlyerNumbers as Record<string, string>;
  }

  get preferredAirlines(): string[] {
    return this.props.preferredAirlines as string[];
  }

  get specialAssistance(): string[] {
    return this.props.specialAssistance as string[];
  }

  toPlainObject(): TravelerPreferencesProps {
    return {
      seatPreference: this.props.seatPreference,
      mealPreference: this.props.mealPreference,
      frequentFlyerNumbers: { ...this.props.frequentFlyerNumbers } as Record<
        string,
        string
      >,
      preferredAirlines: [...(this.props.preferredAirlines as string[])],
      specialAssistance: [...(this.props.specialAssistance as string[])],
    };
  }
}
