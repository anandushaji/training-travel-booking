// @ts-nocheck
import { BookingSagaOrchestrator, PolicyViolationException } from './booking-saga.orchestrator';
import { Booking } from '../../domain/aggregates/booking.aggregate';
import { Itinerary, CabinClass } from '../../domain/value-objects/itinerary.value-object';
import { SagaStatus } from '../../domain/value-objects/saga-status.enum';
import * as prom from 'prom-client';

const makeBooking = () =>
  Booking.create({
    travelerId: '00000000-0000-0000-0000-000000000001',
    offerId: 'offer-123',
    itinerary: new Itinerary({
      origin: 'JFK',
      destination: 'LAX',
      departureDate: new Date(Date.now() + 86400000 * 30),
      cabinClass: CabinClass.ECONOMY,
      passengers: 1,
    }),
    totalAmount: 450,
    currency: 'USD',
  });

describe('BookingSagaOrchestrator', () => {
  let orchestrator: BookingSagaOrchestrator;
  let mockSagaRepo: any;
  let mockPolicyClient: any;
  let mockInventoryClient: any;
  let mockPaymentClient: any;
  let mockMetrics: any;

  beforeEach(() => {
    prom.register.clear();
    mockSagaRepo = { save: jest.fn(), findByBookingId: jest.fn() };
    mockPolicyClient = { validatePolicy: jest.fn().mockResolvedValue({ valid: true }) };
    mockInventoryClient = {
      createReservation: jest.fn().mockResolvedValue({ reservationId: 'RES-001' }),
      cancelReservation: jest.fn().mockResolvedValue(undefined),
    };
    mockPaymentClient = {
      authorizePayment: jest.fn().mockResolvedValue({ paymentId: 'PAY-001', status: 'AUTHORIZED' }),
      capturePayment: jest.fn().mockResolvedValue(undefined),
      refundPayment: jest.fn().mockResolvedValue(undefined),
    };
    mockMetrics = {
      bookingSagaDurationSeconds: { observe: jest.fn() },
      incrementBookingsConfirmed: jest.fn(),
      incrementCompensationFailed: jest.fn(),
    };

    orchestrator = new BookingSagaOrchestrator(
      mockSagaRepo,
      mockPolicyClient,
      mockInventoryClient,
      mockPaymentClient,
      mockMetrics,
    );
  });

  it('all steps succeed - saga COMPLETED', async () => {
    const booking = makeBooking();
    await orchestrator.execute(booking, 'corr-1');
    // Saga should have been saved with COMPLETED status at some point
    const saveCalls = mockSagaRepo.save.mock.calls;
    const lastSaga = saveCalls[saveCalls.length - 1][0];
    expect(lastSaga.status).toBe(SagaStatus.COMPLETED);
  });

  it('policy violation - no reservation or payment', async () => {
    mockPolicyClient.validatePolicy.mockResolvedValue({ valid: false, violations: ['max_amount'] });
    const booking = makeBooking();
    await expect(orchestrator.execute(booking, 'corr-1')).rejects.toBeInstanceOf(PolicyViolationException);
    expect(mockInventoryClient.createReservation).not.toHaveBeenCalled();
    expect(mockPaymentClient.authorizePayment).not.toHaveBeenCalled();
  });

  it('inventory failure - no payment created', async () => {
    mockInventoryClient.createReservation.mockRejectedValue(new Error('Inventory unavailable'));
    const booking = makeBooking();
    await expect(orchestrator.execute(booking, 'corr-1')).rejects.toThrow('Inventory unavailable');
    expect(mockPaymentClient.authorizePayment).not.toHaveBeenCalled();
  });

  it('payment failure - cancels reservation', async () => {
    mockPaymentClient.authorizePayment.mockRejectedValue(new Error('Payment declined'));
    const booking = makeBooking();
    await expect(orchestrator.execute(booking, 'corr-1')).rejects.toThrow();
    expect(mockInventoryClient.cancelReservation).toHaveBeenCalledWith('RES-001', 'corr-1');
  });

  it('creates BookingStep for each step', async () => {
    const booking = makeBooking();
    await orchestrator.execute(booking, 'corr-1');
    const saveCalls = mockSagaRepo.save.mock.calls;
    const lastSaga = saveCalls[saveCalls.length - 1][0];
    // saga should have steps
    expect(lastSaga.steps.length).toBeGreaterThan(0);
  });

  it('compensation step failure - marks COMPENSATED_WITH_ERRORS', async () => {
    mockPaymentClient.authorizePayment.mockRejectedValue(new Error('Payment declined'));
    mockInventoryClient.cancelReservation.mockRejectedValue(new Error('Inventory cancel failed'));
    const booking = makeBooking();
    await expect(orchestrator.execute(booking, 'corr-1')).rejects.toThrow();
    const saveCalls = mockSagaRepo.save.mock.calls;
    const lastSaga = saveCalls[saveCalls.length - 1][0];
    expect(lastSaga.status).toBe(SagaStatus.COMPENSATED_WITH_ERRORS);
    expect(mockMetrics.incrementCompensationFailed).toHaveBeenCalled();
  });

  it('policy client throws non-PolicyViolation error - compensates and rethrows', async () => {
    mockPolicyClient.validatePolicy.mockRejectedValue(new Error('Policy service unavailable'));
    const booking = makeBooking();
    await expect(orchestrator.execute(booking, 'corr-1')).rejects.toThrow('Policy service unavailable');
    // Neither reservation nor payment should have been attempted
    expect(mockInventoryClient.createReservation).not.toHaveBeenCalled();
    expect(mockPaymentClient.authorizePayment).not.toHaveBeenCalled();
    // Saga should have been saved at least once after failure
    expect(mockSagaRepo.save).toHaveBeenCalled();
  });

  it('capturePayment failure - triggers compensation with refund', async () => {
    // authorizePayment succeeds (paymentId set), capturePayment fails
    mockPaymentClient.capturePayment.mockRejectedValue(new Error('Capture failed'));
    const booking = makeBooking();
    await expect(orchestrator.execute(booking, 'corr-1')).rejects.toThrow('Capture failed');
    // refundPayment should be called because paymentId was set
    expect(mockPaymentClient.refundPayment).toHaveBeenCalledWith('PAY-001', 'corr-1');
    // cancelReservation should also be called
    expect(mockInventoryClient.cancelReservation).toHaveBeenCalledWith('RES-001', 'corr-1');
  });

  it('capturePayment failure + refund failure - marks COMPENSATED_WITH_ERRORS', async () => {
    mockPaymentClient.capturePayment.mockRejectedValue(new Error('Capture failed'));
    mockPaymentClient.refundPayment.mockRejectedValue(new Error('Refund failed'));
    const booking = makeBooking();
    await expect(orchestrator.execute(booking, 'corr-1')).rejects.toThrow();
    expect(mockMetrics.incrementCompensationFailed).toHaveBeenCalled();
    const saveCalls = mockSagaRepo.save.mock.calls;
    const lastSaga = saveCalls[saveCalls.length - 1][0];
    expect(lastSaga.status).toBe(SagaStatus.COMPENSATED_WITH_ERRORS);
  });
});
