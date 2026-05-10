import { PassengerDetails } from './passenger-details.value-object';

describe('PassengerDetails value object', () => {
  it('should create valid passenger details', () => {
    const pax = new PassengerDetails({
      passengerId: '550e8400-e29b-41d4-a716-446655440000',
      firstName: 'Alice',
      lastName: 'Smith',
    });
    expect(pax.passengerId).toBe('550e8400-e29b-41d4-a716-446655440000');
    expect(pax.firstName).toBe('Alice');
    expect(pax.lastName).toBe('Smith');
    expect(pax.dateOfBirth).toBeUndefined();
    expect(pax.passportNumber).toBeUndefined();
  });

  it('should store optional dateOfBirth and passportNumber', () => {
    const dob = new Date('1985-06-15');
    const pax = new PassengerDetails({
      passengerId: '550e8400-e29b-41d4-a716-446655440000',
      firstName: 'Bob',
      lastName: 'Jones',
      dateOfBirth: dob,
      passportNumber: 'P12345',
    });
    expect(pax.dateOfBirth).toEqual(dob);
    expect(pax.passportNumber).toBe('P12345');
  });

  it('should throw when passengerId is empty', () => {
    expect(
      () => new PassengerDetails({ passengerId: '  ', firstName: 'A', lastName: 'B' }),
    ).toThrow('passengerId must not be empty');
  });

  it('should throw when firstName is empty', () => {
    expect(
      () =>
        new PassengerDetails({
          passengerId: '550e8400-e29b-41d4-a716-446655440000',
          firstName: '',
          lastName: 'B',
        }),
    ).toThrow('firstName must not be empty');
  });

  it('should throw when lastName is empty', () => {
    expect(
      () =>
        new PassengerDetails({
          passengerId: '550e8400-e29b-41d4-a716-446655440000',
          firstName: 'A',
          lastName: '  ',
        }),
    ).toThrow('lastName must not be empty');
  });
});
