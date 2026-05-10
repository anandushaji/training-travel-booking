import { CabinClass } from './cabin-class.value-object';

describe('CabinClass value object', () => {
  it('should store ECONOMY value', () => {
    expect(new CabinClass('ECONOMY').value).toBe('ECONOMY');
  });

  it('should store PREMIUM_ECONOMY value', () => {
    expect(new CabinClass('PREMIUM_ECONOMY').value).toBe('PREMIUM_ECONOMY');
  });

  it('should store BUSINESS value', () => {
    expect(new CabinClass('BUSINESS').value).toBe('BUSINESS');
  });

  it('should store FIRST value', () => {
    expect(new CabinClass('FIRST').value).toBe('FIRST');
  });

  it('should return string value from toString()', () => {
    expect(new CabinClass('ECONOMY').toString()).toBe('ECONOMY');
    expect(new CabinClass('BUSINESS').toString()).toBe('BUSINESS');
  });

  it('should expose static singleton instances', () => {
    expect(CabinClass.ECONOMY.value).toBe('ECONOMY');
    expect(CabinClass.PREMIUM_ECONOMY.value).toBe('PREMIUM_ECONOMY');
    expect(CabinClass.BUSINESS.value).toBe('BUSINESS');
    expect(CabinClass.FIRST.value).toBe('FIRST');
  });
});
