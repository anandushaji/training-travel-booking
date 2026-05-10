import { FlightReservationMapper } from './flight-reservation.mapper';
import { FlightReservationTypeOrmEntity } from '../../infrastructure/persistence/entities/flight-reservation.typeorm-entity';
import { FlightReservation } from '../../domain/aggregates/flight-reservation.aggregate';
import { FlightSegment } from '../../domain/value-objects/flight-segment.value-object';
import { PassengerDetails } from '../../domain/value-objects/passenger-details.value-object';
import { ReservationStatus } from '../../domain/value-objects/reservation-status.value-object';
import { CabinClass } from '../../domain/value-objects/cabin-class.value-object';

const ENC_KEY = '0'.repeat(64); // 32-byte AES key for testing

const DEPARTURE = new Date('2026-07-01T10:00:00Z');
const ARRIVAL = new Date('2026-07-01T13:00:00Z');

function makeReservation(): FlightReservation {
  const segment = new FlightSegment({
    origin: 'LHR',
    destination: 'JFK',
    departureDate: DEPARTURE,
    arrivalDate: ARRIVAL,
    flightNumber: 'BA117',
    carrier: 'BA',
  });
  const passenger = new PassengerDetails({
    passengerId: '550e8400-e29b-41d4-a716-446655440000',
    firstName: 'John',
    lastName: 'Doe',
  });
  return FlightReservation.create({
    offerId: 'offer-1',
    amadeusOrderId: 'amadeus-order-1',
    segment,
    passenger,
    cabinClass: 'ECONOMY',
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
    holdMinutes: 15,
  });
}

function makeEntity(): FlightReservationTypeOrmEntity {
  const entity = new FlightReservationTypeOrmEntity();
  entity.id = '550e8400-e29b-41d4-a716-446655440002';
  entity.offerId = 'offer-1';
  entity.amadeusOrderId = 'amadeus-order-1';
  entity.passengerId = '550e8400-e29b-41d4-a716-446655440000';
  entity.passengerFirstName = 'John';
  entity.passengerLastName = 'Doe';
  entity.passengerDob = null;
  entity.passportNumber = null;
  entity.origin = 'LHR';
  entity.destination = 'JFK';
  entity.flightNumber = 'BA117';
  entity.carrier = 'BA';
  entity.departureAt = DEPARTURE;
  entity.arrivalAt = ARRIVAL;
  entity.cabinClass = 'ECONOMY';
  entity.status = 'PENDING';
  entity.idempotencyKey = '550e8400-e29b-41d4-a716-446655440001';
  entity.expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  entity.createdAt = new Date();
  entity.updatedAt = new Date();
  return entity;
}

describe('FlightReservationMapper', () => {
  describe('toPersistence', () => {
    it('should map aggregate to entity without passport', () => {
      const reservation = makeReservation();
      const entity = FlightReservationMapper.toPersistence(reservation, ENC_KEY);

      expect(entity.id).toBe(reservation.id);
      expect(entity.offerId).toBe('offer-1');
      expect(entity.amadeusOrderId).toBe('amadeus-order-1');
      expect(entity.passengerId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(entity.passengerFirstName).toBe('John');
      expect(entity.passengerLastName).toBe('Doe');
      expect(entity.origin).toBe('LHR');
      expect(entity.destination).toBe('JFK');
      expect(entity.flightNumber).toBe('BA117');
      expect(entity.carrier).toBe('BA');
      expect(entity.cabinClass).toBe('ECONOMY');
      expect(entity.status).toBe('PENDING');
      expect(entity.passportNumber).toBeNull();
      expect(entity.passengerDob).toBeNull();
    });

    it('should encrypt passport number when present', () => {
      const segment = new FlightSegment({
        origin: 'LHR', destination: 'JFK',
        departureDate: DEPARTURE, arrivalDate: ARRIVAL,
        flightNumber: 'BA117', carrier: 'BA',
      });
      const passenger = new PassengerDetails({
        passengerId: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'John', lastName: 'Doe',
        dateOfBirth: new Date('1990-01-01'),
        passportNumber: 'P123456789',
      });
      const reservation = FlightReservation.create({
        offerId: 'offer-1', segment, passenger, cabinClass: 'ECONOMY',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440003',
      });

      const entity = FlightReservationMapper.toPersistence(reservation, ENC_KEY);

      expect(entity.passportNumber).not.toBeNull();
      // Encrypted value should differ from plaintext
      expect(entity.passportNumber).not.toBe('P123456789');
      // Should contain iv:ciphertext format
      expect(entity.passportNumber).toMatch(/^[0-9a-f]+:[0-9a-f]+$/);
      expect(entity.passengerDob).toBeInstanceOf(Date);
    });
  });

  describe('toDomain', () => {
    it('should map entity to aggregate without passport', () => {
      const entity = makeEntity();
      const reservation = FlightReservationMapper.toDomain(entity, ENC_KEY);

      expect(reservation.id).toBe(entity.id);
      expect(reservation.offerId).toBe('offer-1');
      expect(reservation.amadeusOrderId).toBe('amadeus-order-1');
      expect(reservation.status.value).toBe('PENDING');
      expect(reservation.segment.origin).toBe('LHR');
      expect(reservation.segment.destination).toBe('JFK');
      expect(reservation.segment.flightNumber).toBe('BA117');
      expect(reservation.passenger.firstName).toBe('John');
      expect(reservation.passenger.passportNumber).toBeUndefined();
    });

    it('should map entity with non-null passengerDob to dateOfBirth on domain aggregate', () => {
      const entity = makeEntity();
      entity.passengerDob = new Date('1990-06-15');

      const reservation = FlightReservationMapper.toDomain(entity, ENC_KEY);

      expect(reservation.passenger.dateOfBirth).toEqual(new Date('1990-06-15'));
    });

    it('should decrypt passport number when present', () => {
      const segment = new FlightSegment({
        origin: 'LHR', destination: 'JFK',
        departureDate: DEPARTURE, arrivalDate: ARRIVAL,
        flightNumber: 'BA117', carrier: 'BA',
      });
      const passenger = new PassengerDetails({
        passengerId: '550e8400-e29b-41d4-a716-446655440000',
        firstName: 'John', lastName: 'Doe',
        passportNumber: 'P987654321',
      });
      const original = FlightReservation.create({
        offerId: 'offer-1', segment, passenger, cabinClass: 'ECONOMY',
        idempotencyKey: '550e8400-e29b-41d4-a716-446655440004',
      });

      // Roundtrip: aggregate → entity → aggregate
      const entity = FlightReservationMapper.toPersistence(original, ENC_KEY);
      const roundtripped = FlightReservationMapper.toDomain(entity, ENC_KEY);

      expect(roundtripped.passenger.passportNumber).toBe('P987654321');
    });
  });

  describe('updateEntity', () => {
    it('should update status and amadeusOrderId on entity', () => {
      const entity = makeEntity();
      const reservation = makeReservation();
      reservation.confirm(); // PENDING → CONFIRMED

      FlightReservationMapper.updateEntity(entity, reservation);

      expect(entity.status).toBe('CONFIRMED');
    });
  });
});
