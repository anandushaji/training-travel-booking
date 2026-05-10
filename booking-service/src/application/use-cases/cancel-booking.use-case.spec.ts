// @ts-nocheck
import * as prom from 'prom-client';
import { CancelBookingUseCase } from './cancel-booking.use-case';
import { BookingStatus } from '../../domain/value-objects/booking-status.enum';
import { NotFoundException, ConflictException } from '@travel/shared';
import { Booking } from '../../domain/aggregates/booking.aggregate';
import { Itinerary, CabinClass } from '../../domain/value-objects/itinerary.value-object';

const makeBooking = (status: BookingStatus = BookingStatus.CONFIRMED) => {
  const b = Booking.create({
    travelerId: '00000000-0000-0000-0000-000000000001',
    offerId: 'offer-1',
    itinerary: new Itinerary({
      origin: 'JFK', destination: 'LAX',
      departureDate: new Date(Date.now() + 86400000 * 30),
      cabinClass: CabinClass.ECONOMY, passengers: 1,
    }),
    totalAmount: 450, currency: 'USD',
  });
  // Force status for testing
  if (status !== BookingStatus.PENDING) {
    (b as any).props.status = status;
    if (status !== BookingStatus.CANCELLED) {
      (b as any).props.reservationId = 'RES-001';
      (b as any).props.paymentId = 'PAY-001';
    }
  }
  return b;
};

describe('CancelBookingUseCase', () => {
  let useCase: CancelBookingUseCase;
  let mockBookingRepo: any;
  let mockReadModelRepo: any;
  let mockPublisher: any;
  let mockInventoryClient: any;
  let mockPaymentClient: any;
  let mockMetrics: any;

  beforeEach(() => {
    prom.register.clear();
    mockBookingRepo = { findById: jest.fn(), save: jest.fn() };
    mockReadModelRepo = { updateStatus: jest.fn() };
    mockPublisher = { publishBookingCancelled: jest.fn().mockResolvedValue(undefined) };
    mockInventoryClient = { cancelReservation: jest.fn().mockResolvedValue(undefined) };
    mockPaymentClient = { refundPayment: jest.fn().mockResolvedValue(undefined) };
    mockMetrics = { incrementBookingsCancelled: jest.fn() };

    useCase = new CancelBookingUseCase(
      mockBookingRepo,
      mockReadModelRepo,
      mockPublisher,
      mockInventoryClient,
      mockPaymentClient,
      mockMetrics,
    );
  });

  it('throws NotFoundException when not found', async () => {
    mockBookingRepo.findById.mockResolvedValue(null);
    await expect(useCase.execute('booking-1', {}, 'corr-1')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ConflictException when already CANCELLED', async () => {
    mockBookingRepo.findById.mockResolvedValue(makeBooking(BookingStatus.CANCELLED));
    await expect(useCase.execute('booking-1', {}, 'corr-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('cancels reservation and refunds payment', async () => {
    mockBookingRepo.findById.mockResolvedValue(makeBooking(BookingStatus.CONFIRMED));
    await useCase.execute('booking-1', { reason: 'Plans changed' }, 'corr-1');
    expect(mockInventoryClient.cancelReservation).toHaveBeenCalledWith('RES-001', 'corr-1');
    expect(mockPaymentClient.refundPayment).toHaveBeenCalledWith('PAY-001', 'corr-1');
  });

  it('publishes BookingCancelled', async () => {
    mockBookingRepo.findById.mockResolvedValue(makeBooking(BookingStatus.CONFIRMED));
    await useCase.execute('booking-1', {}, 'corr-1');
    expect(mockPublisher.publishBookingCancelled).toHaveBeenCalled();
  });
});

describe('UpdateBookingUseCase', () => {
  let UpdateBookingUseCase: any;
  let useCase: any;
  let mockBookingRepo: any;

  beforeEach(async () => {
    prom.register.clear();
    const mod = await import('./update-booking.use-case');
    UpdateBookingUseCase = mod.UpdateBookingUseCase;
    mockBookingRepo = { findById: jest.fn(), save: jest.fn() };
    useCase = new UpdateBookingUseCase(mockBookingRepo);
  });

  it('updates specialRequests', async () => {
    const booking = makeBooking(BookingStatus.CONFIRMED);
    mockBookingRepo.findById.mockResolvedValue(booking);
    const dto = await useCase.execute('booking-1', { specialRequests: 'vegetarian' }, 'corr-1');
    expect(booking.specialRequests).toBe('vegetarian');
    expect(mockBookingRepo.save).toHaveBeenCalled();
  });
});
