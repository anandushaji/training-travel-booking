import { DomainException } from '@travel/shared';
import { Payment } from './payment.aggregate';
import { PaymentStatus } from '../value-objects/payment-status.enum';
import { PaymentAuthorizedEvent } from '../events/payment-authorized.event';
import { PaymentCapturedEvent } from '../events/payment-captured.event';
import { PaymentRefundedEvent } from '../events/payment-refunded.event';
import { PaymentFailedEvent } from '../events/payment-failed.event';

const TEST_UUID = '00000000-0000-4000-8000-000000000001';
const TEST_UUID2 = '00000000-0000-4000-8000-000000000002';
const TEST_UUID3 = '00000000-0000-4000-8000-000000000003';

function makePendingPayment(): Payment {
  return Payment.create({
    travelerId: TEST_UUID,
    bookingId: TEST_UUID2,
    paymentMethodId: TEST_UUID3,
    amount: 350.00,
    currency: 'USD',
    idempotencyKey: 'idem-key-001',
    description: 'Flight SFO-JFK',
  });
}

describe('Payment aggregate', () => {
  describe('authorize()', () => {
    it('should transition to AUTHORIZED when authorize() is called on PENDING payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_1234567890');
      expect(payment.status).toBe(PaymentStatus.AUTHORIZED);
    });

    it('should raise PaymentAuthorized event when authorize() succeeds', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_1234567890');
      const events = payment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PaymentAuthorizedEvent);
    });

    it('should store stripePaymentIntentId after authorization', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_1234567890');
      expect(payment.stripePaymentIntentId).toBe('pi_1234567890');
    });

    it('should throw DomainException when authorize() is called on CAPTURED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCaptured(350.00);
      expect(() => payment.authorize('pi_abc')).toThrow(DomainException);
      expect(() => payment.authorize('pi_abc')).toThrow(
        expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
      );
    });

    it('should propagate correlationId in PaymentAuthorized event when provided', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_1234567890', 'corr-abc');
      const events = payment.getUncommittedEvents();
      expect((events[0] as any).correlationId).toBe('corr-abc');
    });

    it('should throw DomainException when authorize() is called on AUTHORIZED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      expect(() => payment.authorize('pi_abc')).toThrow(DomainException);
    });
  });

  describe('markCaptured()', () => {
    it('should transition to CAPTURED when markCaptured() is called on AUTHORIZED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCaptured(350.00);
      expect(payment.status).toBe(PaymentStatus.CAPTURED);
    });

    it('should raise PaymentCaptured event when markCaptured() succeeds', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.clearEvents();
      payment.markCaptured(350.00);
      const events = payment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PaymentCapturedEvent);
    });

    it('should propagate correlationId in PaymentCaptured event when provided', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.clearEvents();
      payment.markCaptured(350.00, 'corr-cap');
      const events = payment.getUncommittedEvents();
      expect((events[0] as any).correlationId).toBe('corr-cap');
    });

    it('should throw DomainException when markCaptured() is called on PENDING payment', () => {
      const payment = makePendingPayment();
      expect(() => payment.markCaptured(350.00)).toThrow(
        expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
      );
    });
  });

  describe('markRefunded()', () => {
    it('should transition to REFUNDED when markRefunded() is called on CAPTURED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCaptured(350.00);
      payment.markRefunded(350.00, 'requested_by_customer');
      expect(payment.status).toBe(PaymentStatus.REFUNDED);
    });

    it('should transition to PARTIALLY_REFUNDED when partial amount refunded', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCaptured(350.00);
      payment.markRefunded(100.00, 'requested_by_customer');
      expect(payment.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    });

    it('should raise PaymentRefunded event when markRefunded() succeeds', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCaptured(350.00);
      payment.clearEvents();
      payment.markRefunded(350.00, 'requested_by_customer');
      const events = payment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PaymentRefundedEvent);
    });

    it('should propagate correlationId in PaymentRefunded event when provided', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCaptured(350.00);
      payment.clearEvents();
      payment.markRefunded(350.00, 'requested_by_customer', 'corr-ref');
      const events = payment.getUncommittedEvents();
      expect((events[0] as any).correlationId).toBe('corr-ref');
    });

    it('should throw DomainException when markRefunded() is called on AUTHORIZED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      expect(() => payment.markRefunded(350.00, 'requested_by_customer')).toThrow(
        expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
      );
    });
  });

  describe('markFailed()', () => {
    it('should propagate correlationId in PaymentFailed event when provided', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.clearEvents();
      payment.markFailed('card_declined', 'corr-fail');
      const events = payment.getUncommittedEvents();
      expect((events[0] as any).correlationId).toBe('corr-fail');
    });

    it('should transition to FAILED when markFailed() is called on AUTHORIZED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markFailed('card_declined');
      expect(payment.status).toBe(PaymentStatus.FAILED);
    });

    it('should set failureReason when markFailed() is called', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markFailed('card_declined');
      expect(payment.failureReason).toBe('card_declined');
    });

    it('should raise PaymentFailed event when markFailed() succeeds', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.clearEvents();
      payment.markFailed('card_declined');
      const events = payment.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(PaymentFailedEvent);
    });

    it('should transition to FAILED when markFailed() is called on PENDING payment', () => {
      const payment = makePendingPayment();
      payment.markFailed('card_declined');
      expect(payment.status).toBe(PaymentStatus.FAILED);
    });

    it('should throw DomainException when markFailed() is called on CAPTURED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCaptured(350.00);
      expect(() => payment.markFailed('error')).toThrow(
        expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
      );
    });
  });

  describe('markCancelled()', () => {
    it('should transition to CANCELLED when markCancelled() is called on AUTHORIZED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCancelled();
      expect(payment.status).toBe(PaymentStatus.CANCELLED);
    });

    it('should NOT raise any domain event on markCancelled()', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.clearEvents();
      payment.markCancelled();
      expect(payment.getUncommittedEvents()).toHaveLength(0);
    });

    it('should throw DomainException when markCancelled() is called on PENDING payment', () => {
      const payment = makePendingPayment();
      expect(() => payment.markCancelled()).toThrow(
        expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }),
      );
    });

    it('should throw DomainException when markCancelled() is called on CAPTURED payment', () => {
      const payment = makePendingPayment();
      payment.authorize('pi_abc');
      payment.markCaptured(350.00);
      expect(() => payment.markCancelled()).toThrow(DomainException);
    });
  });

  describe('reconstitute()', () => {
    it('should correctly reconstruct Payment aggregate from props', () => {
      const now = new Date();
      const payment = Payment.reconstitute({
        id: TEST_UUID,
        travelerId: TEST_UUID2,
        bookingId: TEST_UUID3,
        paymentMethodId: TEST_UUID,
        money: { amount: 350.00, currency: 'USD' } as any,
        status: PaymentStatus.AUTHORIZED,
        stripePaymentIntentId: 'pi_abc',
        idempotencyKey: 'idem-001',
        description: null,
        failureReason: null,
        capturedAmount: null,
        refundedAmount: null,
        createdAt: now,
        updatedAt: now,
      });
      expect(payment.status).toBe(PaymentStatus.AUTHORIZED);
      expect(payment.stripePaymentIntentId).toBe('pi_abc');
    });
  });
});
