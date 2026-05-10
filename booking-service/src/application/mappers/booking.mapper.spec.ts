// @ts-nocheck
import { BookingMapper } from './booking.mapper';
import { Booking } from '../../domain/aggregates/booking.aggregate';
import { Itinerary, CabinClass } from '../../domain/value-objects/itinerary.value-object';
import { BookingReadModelRow } from '../../infrastructure/repositories/booking-read-model.repository';

const makeBooking = () =>
  Booking.create({
    travelerId: '00000000-0000-0000-0000-000000000001',
    offerId: 'offer-123',
    itinerary: new Itinerary({
      origin: 'JFK',
      destination: 'LAX',
      departureDate: new Date('2026-08-01'),
      cabinClass: CabinClass.ECONOMY,
      passengers: 1,
    }),
    totalAmount: 450,
    currency: 'USD',
  });

const makeRow = (overrides: Partial<BookingReadModelRow> = {}): BookingReadModelRow => ({
  id: 'booking-1',
  travelerId: 'traveler-1',
  status: 'CONFIRMED',
  origin: 'JFK',
  destination: 'LAX',
  departureDate: '2026-08-01',
  totalAmount: 450,
  currency: 'USD',
  createdAt: new Date('2026-01-01'),
  ...overrides,
});

describe('BookingMapper', () => {
  it('toDto(Booking) - maps all required fields including itinerary', () => {
    const booking = makeBooking();
    const dto = BookingMapper.toDto(booking);
    expect(dto.id).toBeDefined();
    expect(dto.travelerId).toBe('00000000-0000-0000-0000-000000000001');
    expect(dto.itinerary).toBeDefined();
    expect((dto.itinerary as any).origin).toBe('JFK');
    expect((dto.itinerary as any).destination).toBe('LAX');
  });

  it('toDto(Booking) - maps optional fields when they are defined', () => {
    const booking = makeBooking();
    booking.reserve('RES-001');
    booking.startPaymentProcessing('PAY-001');
    booking.updateSpecialRequests('window seat');
    booking.confirm('Alice Smith', 'alice@example.com');

    const dto = BookingMapper.toDto(booking);

    expect(dto.reservationId).toBe('RES-001');
    expect(dto.paymentId).toBe('PAY-001');
    expect(dto.specialRequests).toBe('window seat');
    expect(dto.travelerName).toBe('Alice Smith');
    expect(dto.travelerEmail).toBe('alice@example.com');
    expect(dto.confirmedAt).toBeDefined();
  });

  it('toDto(Booking) - maps cancelledAt and cancelReason when cancelled', () => {
    const booking = makeBooking();
    booking.cancel('changed mind');

    const dto = BookingMapper.toDto(booking);

    expect(dto.cancelledAt).toBeDefined();
    expect(dto.cancelReason).toBe('changed mind');
  });

  it('toDto(BookingReadModelRow) - maps required fields', () => {
    const row = makeRow();
    const dto = BookingMapper.toDto(row);

    expect(dto.id).toBe('booking-1');
    expect(dto.travelerId).toBe('traveler-1');
    expect(dto.status).toBe('CONFIRMED');
    expect((dto.itinerary as any).origin).toBe('JFK');
    expect(dto.totalAmount).toBe(450);
    expect(dto.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('toDto(BookingReadModelRow) - maps optional returnDate and cabinClass', () => {
    const row = makeRow({ returnDate: '2026-08-15', cabinClass: 'BUSINESS' });
    const dto = BookingMapper.toDto(row);

    expect((dto.itinerary as any).returnDate).toBe('2026-08-15');
    expect((dto.itinerary as any).cabinClass).toBe('BUSINESS');
  });

  it('toDto(BookingReadModelRow) - maps travelerName and travelerEmail when present', () => {
    const row = makeRow({ travelerName: 'Alice', travelerEmail: 'alice@example.com' });
    const dto = BookingMapper.toDto(row);

    expect(dto.travelerName).toBe('Alice');
    expect(dto.travelerEmail).toBe('alice@example.com');
  });

  it('toReadModelRow - maps required fields', () => {
    const booking = makeBooking();
    const row = BookingMapper.toReadModelRow(booking);

    expect(row.id).toBeDefined();
    expect(row.travelerId).toBe('00000000-0000-0000-0000-000000000001');
    expect(row.origin).toBe('JFK');
    expect(row.destination).toBe('LAX');
    expect(row.departureDate).toBe('2026-08-01');
    expect(row.totalAmount).toBe(450);
  });

  it('toReadModelRow - maps optional travelerName and travelerEmail', () => {
    const booking = makeBooking();
    booking.reserve('RES-001');
    booking.startPaymentProcessing('PAY-001');
    booking.confirm('Bob', 'bob@example.com');

    const row = BookingMapper.toReadModelRow(booking);

    expect(row.travelerName).toBe('Bob');
    expect(row.travelerEmail).toBe('bob@example.com');
  });
});

