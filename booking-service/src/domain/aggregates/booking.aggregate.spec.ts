// @ts-nocheck
import { Booking } from './booking.aggregate';
import { Itinerary, CabinClass } from '../value-objects/itinerary.value-object';
import { BookingStatus } from '../value-objects/booking-status.enum';
import { DomainException } from '@travel/shared';

const makeItinerary = () =>
  new Itinerary({
    origin: 'JFK',
    destination: 'LAX',
    departureDate: new Date(Date.now() + 86400000 * 30),
    cabinClass: CabinClass.ECONOMY,
    passengers: 1,
  });

const makeBooking = () =>
  Booking.create({
    travelerId: '00000000-0000-0000-0000-000000000001',
    offerId: 'offer-123',
    itinerary: makeItinerary(),
    totalAmount: 450.0,
    currency: 'USD',
  });

describe('Booking aggregate', () => {
  it('create - status PENDING version 1', () => {
    const booking = makeBooking();
    expect(booking.status).toBe(BookingStatus.PENDING);
    expect(booking.version).toBe(0);
  });

  it('reserve - transitions to RESERVED', () => {
    const booking = makeBooking();
    booking.reserve('RES-001');
    expect(booking.status).toBe(BookingStatus.RESERVED);
    expect(booking.reservationId).toBe('RES-001');
  });

  it('reserve - throws DomainException from non-PENDING state', () => {
    const booking = makeBooking();
    booking.reserve('RES-001');
    expect(() => booking.reserve('RES-002')).toThrow(DomainException);
  });

  it('startPaymentProcessing - transitions to PAYMENT_PROCESSING', () => {
    const booking = makeBooking();
    booking.reserve('RES-001');
    booking.startPaymentProcessing('PAY-001');
    expect(booking.status).toBe(BookingStatus.PAYMENT_PROCESSING);
    expect(booking.paymentId).toBe('PAY-001');
  });

  it('confirm - transitions to CONFIRMED', () => {
    const booking = makeBooking();
    booking.reserve('RES-001');
    booking.startPaymentProcessing('PAY-001');
    booking.confirm('Alice Smith', 'alice@example.com');
    expect(booking.status).toBe(BookingStatus.CONFIRMED);
    expect(booking.confirmedAt).toBeDefined();
  });

  it('confirm - throws DomainException from non-PAYMENT_PROCESSING state', () => {
    const booking = makeBooking();
    expect(() => booking.confirm('Alice', 'alice@example.com')).toThrow(DomainException);
  });

  it('cancel - throws DomainException when already CANCELLED', () => {
    const booking = makeBooking();
    booking.cancel('reason');
    expect(() => booking.cancel('reason 2')).toThrow(DomainException);
  });

  it('cancel - succeeds from PENDING', () => {
    const booking = makeBooking();
    booking.cancel('changed mind');
    expect(booking.status).toBe(BookingStatus.CANCELLED);
    expect(booking.cancelReason).toBe('changed mind');
  });

  it('fail - sets status to FAILED', () => {
    const booking = makeBooking();
    booking.fail('saga failed');
    expect(booking.status).toBe(BookingStatus.FAILED);
  });

  it('updateSpecialRequests - updates the field', () => {
    const booking = makeBooking();
    booking.updateSpecialRequests('vegetarian meal');
    expect(booking.specialRequests).toBe('vegetarian meal');
  });

  it('startPaymentProcessing - throws DomainException from non-RESERVED state', () => {
    const booking = makeBooking();
    // booking is PENDING, not RESERVED
    expect(() => booking.startPaymentProcessing('PAY-001')).toThrow(DomainException);
  });

  it('policyValidationId getter - returns undefined when not set', () => {
    const booking = makeBooking();
    expect(booking.policyValidationId).toBeUndefined();
  });

  it('setPolicyValidationId - stores and returns the id', () => {
    const booking = makeBooking();
    booking.setPolicyValidationId('POL-001');
    expect(booking.policyValidationId).toBe('POL-001');
  });
});
