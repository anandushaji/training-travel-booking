import { FlightReservation } from './flight-reservation.aggregate';
import { FlightSegment } from '../value-objects/flight-segment.value-object';
import { PassengerDetails } from '../value-objects/passenger-details.value-object';
import { FlightReservedEvent } from '../events/flight-reserved.event';
import { FlightReservationCancelledEvent } from '../events/flight-reservation-cancelled.event';
import { FlightReservationExpiredEvent } from '../events/flight-reservation-expired.event';
import { InvalidReservationStateException } from '../exceptions/invalid-reservation-state.exception';

const makeSegment = () =>
  new FlightSegment({
    origin: 'LHR',
    destination: 'JFK',
    departureDate: new Date('2026-07-01T10:00:00Z'),
    arrivalDate: new Date('2026-07-01T18:00:00Z'),
    flightNumber: 'BA117',
    carrier: 'BA',
  });

const makePassenger = () =>
  new PassengerDetails({
    passengerId: '550e8400-e29b-41d4-a716-446655440000',
    firstName: 'John',
    lastName: 'Doe',
  });

const makeReservation = () =>
  FlightReservation.create({
    offerId: 'offer-123',
    segment: makeSegment(),
    passenger: makePassenger(),
    cabinClass: 'ECONOMY',
    idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
    holdMinutes: 15,
  });

describe('FlightReservation aggregate', () => {
  it('should create reservation with PENDING status and FlightReserved event', () => {
    const reservation = makeReservation();

    expect(reservation.status.value).toBe('PENDING');
    const events = reservation.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(FlightReservedEvent);
    // expiresAt should be ~15 minutes after creation
    const diffMs = reservation.expiresAt.getTime() - reservation.createdAt.getTime();
    expect(diffMs).toBeCloseTo(15 * 60 * 1000, -2);
  });

  it('should transition to EXPIRED and raise FlightReservationExpired when expire() called on PENDING aggregate', () => {
    const reservation = makeReservation();
    reservation.clearEvents();

    reservation.expire();

    expect(reservation.status.value).toBe('EXPIRED');
    const events = reservation.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(FlightReservationExpiredEvent);
  });

  it('should throw INVALID_STATUS_TRANSITION when expire() called on CONFIRMED aggregate', () => {
    const reservation = makeReservation();
    reservation.confirm();
    reservation.clearEvents();

    expect(() => reservation.expire()).toThrow(InvalidReservationStateException);
    expect(() => reservation.expire()).toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    );
  });

  it('should throw INVALID_STATUS_TRANSITION when cancel() called on EXPIRED aggregate', () => {
    const reservation = makeReservation();
    reservation.expire();
    reservation.clearEvents();

    expect(() => reservation.cancel()).toThrow(InvalidReservationStateException);
    expect(() => reservation.cancel()).toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    );
    expect(reservation.getUncommittedEvents()).toHaveLength(0);
  });

  it('should cancel CONFIRMED reservation and raise FlightReservationCancelled', () => {
    const reservation = makeReservation();
    reservation.confirm();
    reservation.clearEvents();

    reservation.cancel();

    expect(reservation.status.value).toBe('CANCELLED');
    const events = reservation.getUncommittedEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(FlightReservationCancelledEvent);
  });

  it('should transition PENDING to CONFIRMED via confirm()', () => {
    const reservation = makeReservation();
    reservation.confirm();
    expect(reservation.status.value).toBe('CONFIRMED');
  });

  it('should throw INVALID_STATUS_TRANSITION when confirm() called on non-PENDING aggregate', () => {
    const reservation = makeReservation();
    reservation.expire(); // PENDING → EXPIRED
    expect(() => reservation.confirm()).toThrow(
      expect.objectContaining({ code: 'INVALID_STATUS_TRANSITION' }),
    );
  });

  it('should return reservationId value object', () => {
    const reservation = makeReservation();
    expect(reservation.reservationId.value).toBe(reservation.id);
  });

  it('should return idempotencyKey', () => {
    const reservation = makeReservation();
    expect(reservation.idempotencyKey).toBe('550e8400-e29b-41d4-a716-446655440001');
  });

  it('should return true from isExpired() when expiresAt is in the past', () => {
    const reservation = makeReservation();
    // Force expiresAt to the past
    (reservation as unknown as { props: { expiresAt: Date } }).props.expiresAt = new Date(Date.now() - 1000);
    expect(reservation.isExpired()).toBe(true);
  });

  it('should return false from isExpired() when expiresAt is in the future', () => {
    const reservation = makeReservation();
    expect(reservation.isExpired()).toBe(false);
  });

  it('should include correlationId and causationId in FlightReserved event when provided', () => {
    const reservation = FlightReservation.create({
      offerId: 'offer-correlate',
      segment: makeSegment(),
      passenger: makePassenger(),
      cabinClass: 'ECONOMY',
      idempotencyKey: '550e8400-e29b-41d4-a716-446655440001',
      correlationId: 'corr-create',
      causationId: 'caus-create',
    });
    const events = reservation.getUncommittedEvents();
    expect(events[0]?.correlationId).toBe('corr-create');
    expect(events[0]?.causationId).toBe('caus-create');
  });

  it('should include correlationId and causationId in FlightReservationCancelled event when provided', () => {
    const reservation = makeReservation();
    reservation.clearEvents();
    reservation.cancel('corr-cancel', 'caus-cancel');
    const events = reservation.getUncommittedEvents();
    expect(events[0]?.correlationId).toBe('corr-cancel');
    expect(events[0]?.causationId).toBe('caus-cancel');
  });

  it('should include correlationId and causationId in FlightReservationExpired event when provided', () => {
    const reservation = makeReservation();
    reservation.clearEvents();
    reservation.expire('corr-expire', 'caus-expire');
    const events = reservation.getUncommittedEvents();
    expect(events[0]?.correlationId).toBe('corr-expire');
    expect(events[0]?.causationId).toBe('caus-expire');
  });
});
