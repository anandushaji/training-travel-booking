// @ts-nocheck
import { PaymentEventConsumer } from './payment-event.consumer';
import { SagaStatus } from '../../domain/value-objects/saga-status.enum';
import { BookingStatus } from '../../domain/value-objects/booking-status.enum';

const makeBooking = (overrides: any = {}) => ({
  id: 'booking-1',
  travelerId: 'trav-1',
  status: BookingStatus.PAYMENT_PROCESSING,
  reservationId: 'RES-001',
  paymentId: null,
  totalAmount: 450,
  currency: 'USD',
  travelerName: 'Alice',
  travelerEmail: 'alice@example.com',
  itinerary: { toJSON: () => ({}) },
  confirm: jest.fn(),
  fail: jest.fn(),
  cancel: jest.fn(),
  ...overrides,
});

const makeSaga = (status: SagaStatus) => ({
  id: 'saga-1',
  status,
  complete: jest.fn(),
  beginCompensation: jest.fn(),
  markCompensated: jest.fn(),
  markCompensatedWithErrors: jest.fn(),
});

describe('PaymentEventConsumer', () => {
  let consumer: PaymentEventConsumer;
  let mockBookingRepo: any;
  let mockSagaRepo: any;
  let mockReadModelRepo: any;
  let mockPublisher: any;
  let mockInventoryClient: any;

  beforeEach(() => {
    mockBookingRepo = { findById: jest.fn(), save: jest.fn() };
    mockSagaRepo = { findByBookingId: jest.fn(), save: jest.fn() };
    mockReadModelRepo = { updateStatus: jest.fn() };
    mockPublisher = {
      publishBookingConfirmed: jest.fn().mockResolvedValue(undefined),
      publishBookingCancelled: jest.fn().mockResolvedValue(undefined),
    };
    mockInventoryClient = { cancelReservation: jest.fn().mockResolvedValue(undefined) };

    consumer = new PaymentEventConsumer(
      mockBookingRepo,
      mockSagaRepo,
      mockReadModelRepo,
      mockPublisher,
      mockInventoryClient,
    );
  });

  describe('handlePaymentCaptured', () => {
    it('PaymentCaptured confirms booking', async () => {
      const booking = makeBooking();
      mockBookingRepo.findById.mockResolvedValue(booking);
      mockSagaRepo.findByBookingId.mockResolvedValue(makeSaga(SagaStatus.IN_PROGRESS));
      await consumer.handlePaymentCaptured({ bookingId: 'booking-1', paymentId: 'PAY-001', travelerId: 'trav-1', amount: 450, currency: 'USD' }, 'corr-1');
      expect(booking.confirm).toHaveBeenCalled();
      expect(mockBookingRepo.save).toHaveBeenCalled();
    });

    it('duplicate PaymentCaptured is no-op', async () => {
      const booking = makeBooking();
      mockBookingRepo.findById.mockResolvedValue(booking);
      mockSagaRepo.findByBookingId.mockResolvedValue(makeSaga(SagaStatus.COMPLETED));
      await consumer.handlePaymentCaptured({ bookingId: 'booking-1', paymentId: 'PAY-001', travelerId: 'trav-1', amount: 450, currency: 'USD' }, 'corr-1');
      expect(booking.confirm).not.toHaveBeenCalled();
      expect(mockPublisher.publishBookingConfirmed).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentFailed', () => {
    it('PaymentFailed cancels reservation and marks FAILED', async () => {
      const booking = makeBooking({ reservationId: 'RES-001' });
      mockBookingRepo.findById.mockResolvedValue(booking);
      mockSagaRepo.findByBookingId.mockResolvedValue(makeSaga(SagaStatus.IN_PROGRESS));
      await consumer.handlePaymentFailed({ bookingId: 'booking-1', reason: 'declined' }, 'corr-1');
      expect(mockInventoryClient.cancelReservation).toHaveBeenCalledWith('RES-001', 'corr-1');
      expect(booking.fail).toHaveBeenCalledWith('declined');
    });

    it('duplicate PaymentFailed is no-op', async () => {
      const booking = makeBooking();
      mockBookingRepo.findById.mockResolvedValue(booking);
      mockSagaRepo.findByBookingId.mockResolvedValue(makeSaga(SagaStatus.COMPENSATED));
      await consumer.handlePaymentFailed({ bookingId: 'booking-1', reason: 'declined' }, 'corr-1');
      expect(booking.fail).not.toHaveBeenCalled();
    });
  });
});
