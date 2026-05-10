/**
 * Consumer-driven contract test: booking-service consuming payment-events topic.
 *
 * Validates that the PaymentAuthorized, PaymentCaptured, PaymentFailed, and
 * PaymentRefunded messages published to the `payment-events` Kafka topic conform
 * to the ADR-003 event envelope schema expected by the booking-service consumer.
 *
 * Uses MessageConsumerPact (v2 API — NOT v3) per the project convention.
 * Pact files are written to <project-root>/pacts/ via process.cwd().
 */

import {
  MessageConsumerPact,
  asynchronousBodyHandler,
  Matchers,
} from '@pact-foundation/pact';

const { like, term } = Matchers;

// ── Envelope helpers ─────────────────────────────────────────────────────────

const ISO_DATETIME_REGEX = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$';
const SAMPLE_DATETIME = '2026-05-03T12:00:00.000Z';
const PAYMENT_ID = '00000000-0000-4000-8000-000000000001';
const BOOKING_ID = '00000000-0000-4000-8000-000000000002';
const TRAVELER_ID = '00000000-0000-4000-8000-000000000003';
const EVENT_ID = '00000000-0000-4000-8000-000000000010';
const CORRELATION_ID = 'corr-00000000-0000-4000-8000-000000000001';
const CAUSATION_ID = 'cause-00000000-0000-4000-8000-000000000001';

function baseEnvelope(eventType: string) {
  return {
    eventId: like(EVENT_ID),
    eventType: like(eventType),
    aggregateId: like(PAYMENT_ID),
    occurredOn: term({ generate: SAMPLE_DATETIME, matcher: ISO_DATETIME_REGEX }),
    correlationId: like(CORRELATION_ID),
    causationId: like(CAUSATION_ID),
  };
}

// ── Pact instance ─────────────────────────────────────────────────────────────

const messagePact = new MessageConsumerPact({
  consumer: 'booking-service',
  provider: 'payment-service',
  dir: `${process.cwd()}/pacts`,
  pactfileWriteMode: 'update',
});

// ── PaymentAuthorized ─────────────────────────────────────────────────────────

describe('payment-events Pact (booking-service consumer)', () => {
  describe('PaymentAuthorized event', () => {
    it('should consume a PaymentAuthorized message', () => {
      return messagePact
        .given('a payment authorization has succeeded')
        .expectsToReceive('a PaymentAuthorized event')
        .withContent({
          ...baseEnvelope('PaymentAuthorized'),
          data: {
            paymentId: like(PAYMENT_ID),
            bookingId: like(BOOKING_ID),
            travelerId: like(TRAVELER_ID),
            amount: like(350.00),
            currency: like('USD'),
            stripePaymentIntentId: like('pi_test_authorized'),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              data: {
                paymentId: string;
                bookingId: string;
                travelerId: string;
                amount: number;
                currency: string;
                stripePaymentIntentId: string;
              };
            };
            expect(event.eventType).toBe('PaymentAuthorized');
            expect(event.data.paymentId).toBeDefined();
            expect(event.data.bookingId).toBeDefined();
            expect(event.data.travelerId).toBeDefined();
            expect(event.data.amount).toBeGreaterThan(0);
            expect(event.data.currency).toBeDefined();
            expect(event.data.stripePaymentIntentId).toBeDefined();
          }),
        );
    });
  });

  // ── PaymentCaptured ─────────────────────────────────────────────────────────

  describe('PaymentCaptured event', () => {
    it('should consume a PaymentCaptured message', () => {
      return messagePact
        .given('an authorized payment has been captured')
        .expectsToReceive('a PaymentCaptured event')
        .withContent({
          ...baseEnvelope('PaymentCaptured'),
          data: {
            paymentId: like(PAYMENT_ID),
            bookingId: like(BOOKING_ID),
            travelerId: like(TRAVELER_ID),
            capturedAmount: like(350.00),
            currency: like('USD'),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              data: {
                paymentId: string;
                bookingId: string;
                capturedAmount: number;
                currency: string;
              };
            };
            expect(event.eventType).toBe('PaymentCaptured');
            expect(event.data.paymentId).toBeDefined();
            expect(event.data.bookingId).toBeDefined();
            expect(event.data.capturedAmount).toBeGreaterThan(0);
          }),
        );
    });
  });

  // ── PaymentFailed ─────────────────────────────────────────────────────────

  describe('PaymentFailed event', () => {
    it('should consume a PaymentFailed message', () => {
      return messagePact
        .given('a payment authorization has been declined by Stripe')
        .expectsToReceive('a PaymentFailed event')
        .withContent({
          ...baseEnvelope('PaymentFailed'),
          data: {
            paymentId: like(PAYMENT_ID),
            bookingId: like(BOOKING_ID),
            travelerId: like(TRAVELER_ID),
            failureReason: like('card_declined'),
            amount: like(350.00),
            currency: like('USD'),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              data: {
                paymentId: string;
                bookingId: string;
                failureReason: string;
                amount: number;
              };
            };
            expect(event.eventType).toBe('PaymentFailed');
            expect(event.data.paymentId).toBeDefined();
            expect(event.data.bookingId).toBeDefined();
            expect(event.data.failureReason).toBeDefined();
            expect(event.data.amount).toBeGreaterThan(0);
          }),
        );
    });
  });

  // ── PaymentRefunded ─────────────────────────────────────────────────────────

  describe('PaymentRefunded event', () => {
    it('should consume a PaymentRefunded message', () => {
      return messagePact
        .given('a captured payment has been refunded')
        .expectsToReceive('a PaymentRefunded event')
        .withContent({
          ...baseEnvelope('PaymentRefunded'),
          data: {
            paymentId: like(PAYMENT_ID),
            bookingId: like(BOOKING_ID),
            travelerId: like(TRAVELER_ID),
            refundedAmount: like(350.00),
            currency: like('USD'),
            reason: like('requested_by_customer'),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              data: {
                paymentId: string;
                bookingId: string;
                refundedAmount: number;
                currency: string;
                reason: string;
              };
            };
            expect(event.eventType).toBe('PaymentRefunded');
            expect(event.data.paymentId).toBeDefined();
            expect(event.data.bookingId).toBeDefined();
            expect(event.data.refundedAmount).toBeGreaterThan(0);
            expect(event.data.reason).toBeDefined();
          }),
        );
    });
  });
});
