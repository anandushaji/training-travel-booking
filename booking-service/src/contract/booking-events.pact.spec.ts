/* eslint-disable */
// @ts-nocheck
/**
 * Consumer-driven contract test: expense-service consuming booking-events topic.
 *
 * Validates that BookingConfirmed and BookingCancelled messages published to the
 * `booking-events` Kafka topic conform to the ADR-003 event envelope schema
 * expected by the expense-service consumer (SM-08).
 *
 * Uses MessageConsumerPact (v2 API — NOT v3) per the project convention.
 */

import {
  MessageConsumerPact,
  asynchronousBodyHandler,
  Matchers,
} from '@pact-foundation/pact';

const { like, term } = Matchers;

const ISO_DATETIME_REGEX = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$';
const SAMPLE_DATETIME = '2026-05-03T12:00:00.000Z';
const BOOKING_ID = '00000000-0000-4000-8000-000000000001';
const TRAVELER_ID = '00000000-0000-4000-8000-000000000002';
const EVENT_ID = '00000000-0000-4000-8000-000000000010';
const CORRELATION_ID = 'corr-00000000-0000-4000-8000-000000000001';
const CAUSATION_ID = 'cause-00000000-0000-4000-8000-000000000001';

function baseEnvelope(eventType: string) {
  return {
    eventId: like(EVENT_ID),
    eventType: like(eventType),
    aggregateId: like(BOOKING_ID),
    occurredOn: term({ generate: SAMPLE_DATETIME, matcher: ISO_DATETIME_REGEX }),
    correlationId: like(CORRELATION_ID),
    causationId: like(CAUSATION_ID),
    version: like('1.0'),
  };
}

const messagePact = new MessageConsumerPact({
  consumer: 'expense-service',
  provider: 'booking-service',
  dir: `${process.cwd()}/pacts`,
  pactfileWriteMode: 'update',
});

describe('booking-events Pact (expense-service consumer)', () => {
  describe('BookingConfirmed event', () => {
    it('BookingConfirmed interaction', () => {
      return messagePact
        .given('a booking has been confirmed')
        .expectsToReceive('a BookingConfirmed event')
        .withContent({
          ...baseEnvelope('BookingConfirmed'),
          data: {
            travelerId: like(TRAVELER_ID),
            totalAmount: like(450.0),
            currency: like('USD'),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              aggregateId: string;
              data: { travelerId: string; totalAmount: number; currency: string };
            };
            expect(event.eventType).toBe('BookingConfirmed');
            expect(event.aggregateId).toBeDefined();
            expect(event.data.travelerId).toBeDefined();
            expect(event.data.totalAmount).toBeDefined();
            expect(event.data.currency).toBe('USD');
          }),
        );
    });
  });

  describe('BookingCancelled event', () => {
    it('BookingCancelled interaction', () => {
      return messagePact
        .given('a booking has been cancelled')
        .expectsToReceive('a BookingCancelled event')
        .withContent({
          ...baseEnvelope('BookingCancelled'),
          data: {
            travelerId: like(TRAVELER_ID),
            reason: like('Change of plans'),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              aggregateId: string;
              data: { travelerId: string; reason: string };
            };
            expect(event.eventType).toBe('BookingCancelled');
            expect(event.aggregateId).toBeDefined();
            expect(event.data.travelerId).toBeDefined();
            expect(event.data.reason).toBeDefined();
          }),
        );
    });

    it('handler validates envelope shape', () => {
      return messagePact
        .given('a booking has been cancelled with full envelope')
        .expectsToReceive('a BookingCancelled event with full ADR-003 envelope')
        .withContent({
          ...baseEnvelope('BookingCancelled'),
          data: {
            travelerId: like(TRAVELER_ID),
            reason: like('Budget exceeded'),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as Record<string, unknown>;
            expect(event['eventId']).toBeDefined();
            expect(event['eventType']).toBe('BookingCancelled');
            expect(event['aggregateId']).toBeDefined();
            expect(event['occurredOn']).toBeDefined();
            expect(event['correlationId']).toBeDefined();
            expect(event['causationId']).toBeDefined();
            expect(event['version']).toBe('1.0');
          }),
        );
    });
  });
});
