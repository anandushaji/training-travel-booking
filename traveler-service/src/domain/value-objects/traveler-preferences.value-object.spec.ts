import { TravelerPreferences } from './traveler-preferences.value-object';

describe('TravelerPreferences value object', () => {
  it('should create default preferences', () => {
    const prefs = TravelerPreferences.default();
    expect(prefs.seatPreference).toBe('none');
    expect(prefs.mealPreference).toBe('standard');
    expect(prefs.frequentFlyerNumbers).toEqual({});
    expect(prefs.preferredAirlines).toEqual([]);
    expect(prefs.specialAssistance).toEqual([]);
  });

  it('should create preferences from partial with all fields provided', () => {
    const prefs = TravelerPreferences.from({
      seatPreference: 'window',
      mealPreference: 'vegan',
      frequentFlyerNumbers: { BA: 'BA123456' },
      preferredAirlines: ['BA', 'LH'],
      specialAssistance: ['wheelchair'],
    });
    expect(prefs.seatPreference).toBe('window');
    expect(prefs.mealPreference).toBe('vegan');
    expect(prefs.frequentFlyerNumbers).toEqual({ BA: 'BA123456' });
    expect(prefs.preferredAirlines).toEqual(['BA', 'LH']);
    expect(prefs.specialAssistance).toEqual(['wheelchair']);
  });

  it('should apply defaults for missing partial fields', () => {
    const prefs = TravelerPreferences.from({});
    expect(prefs.seatPreference).toBe('none');
    expect(prefs.mealPreference).toBe('standard');
  });

  it('should serialise to plain object correctly', () => {
    const prefs = TravelerPreferences.from({
      seatPreference: 'aisle',
      frequentFlyerNumbers: { AA: 'AA999' },
      preferredAirlines: ['AA'],
      specialAssistance: [],
    });
    const plain = prefs.toPlainObject();
    expect(plain.seatPreference).toBe('aisle');
    expect(plain.frequentFlyerNumbers).toEqual({ AA: 'AA999' });
    expect(plain.preferredAirlines).toEqual(['AA']);
  });
});
