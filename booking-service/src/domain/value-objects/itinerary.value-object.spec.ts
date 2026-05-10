// @ts-nocheck
import { Itinerary, CabinClass } from './itinerary.value-object';
import { DomainException } from '@travel/shared';

const validProps = () => ({
  origin: 'JFK',
  destination: 'LAX',
  departureDate: new Date(Date.now() + 86400000 * 30),
  cabinClass: CabinClass.ECONOMY,
  passengers: 1,
});

describe('Itinerary', () => {
  it('valid construction succeeds', () => {
    const itinerary = new Itinerary(validProps());
    expect(itinerary.origin).toBe('JFK');
    expect(itinerary.destination).toBe('LAX');
    expect(itinerary.passengers).toBe(1);
  });

  it('rejects invalid origin', () => {
    expect(() => new Itinerary({ ...validProps(), origin: 'JF' })).toThrow(DomainException);
    expect(() => new Itinerary({ ...validProps(), origin: 'jfk' })).toThrow(DomainException);
    expect(() => new Itinerary({ ...validProps(), origin: 'JFKX' })).toThrow(DomainException);
  });

  it('rejects passengers below 1', () => {
    expect(() => new Itinerary({ ...validProps(), passengers: 0 })).toThrow(DomainException);
  });

  it('rejects passengers above 9', () => {
    expect(() => new Itinerary({ ...validProps(), passengers: 10 })).toThrow(DomainException);
  });

  it('rejects invalid cabinClass', () => {
    expect(() => new Itinerary({ ...validProps(), cabinClass: 'ULTRA' as CabinClass })).toThrow(DomainException);
  });

  it('toJSON includes optional returnDate when set', () => {
    const returnDate = new Date(Date.now() + 86400000 * 37);
    const itinerary = new Itinerary({ ...validProps(), returnDate });
    const json = itinerary.toJSON();
    expect(json['returnDate']).toBeDefined();
  });
});
