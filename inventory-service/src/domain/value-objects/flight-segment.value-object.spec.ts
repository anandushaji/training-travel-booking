import { FlightSegment } from './flight-segment.value-object';
import { DomainException } from '@travel/shared';

const baseProps = {
  origin: 'LHR',
  destination: 'JFK',
  departureDate: new Date('2026-07-01T10:00:00Z'),
  arrivalDate: new Date('2026-07-01T18:00:00Z'),
  flightNumber: 'BA117',
  carrier: 'BA',
};

describe('FlightSegment value object', () => {
  it('should create a valid FlightSegment', () => {
    const segment = new FlightSegment(baseProps);
    expect(segment.origin).toBe('LHR');
    expect(segment.destination).toBe('JFK');
  });

  it('should throw when origin equals destination', () => {
    expect(
      () => new FlightSegment({ ...baseProps, origin: 'LHR', destination: 'LHR' }),
    ).toThrow(DomainException);
    expect(
      () => new FlightSegment({ ...baseProps, origin: 'LHR', destination: 'LHR' }),
    ).toThrow(expect.objectContaining({ code: 'INVALID_FLIGHT_SEGMENT' }));
  });

  it('should throw when departureDate is not before arrivalDate', () => {
    expect(
      () =>
        new FlightSegment({
          ...baseProps,
          departureDate: new Date('2026-07-01T18:00:00Z'),
          arrivalDate: new Date('2026-07-01T10:00:00Z'),
        }),
    ).toThrow(DomainException);

    // equal dates should also throw
    const same = new Date('2026-07-01T10:00:00Z');
    expect(
      () => new FlightSegment({ ...baseProps, departureDate: same, arrivalDate: same }),
    ).toThrow(DomainException);
  });
});
