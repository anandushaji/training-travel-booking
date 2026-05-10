/* eslint-disable */
// @ts-nocheck
/**
 * Consumer-driven contract test: booking-service consuming policy-events topic.
 *
 * Validates that the PolicyValidated and PolicyViolationDetected messages
 * published to the `policy-events` Kafka topic conform to the ADR-003 event
 * envelope schema expected by the booking-service consumer.
 *
 * Uses MessageConsumerPact (v2 API — NOT v3) per the project convention.
 * Pact files are written to <project-root>/pacts/ via process.cwd().
 */

import {
  MessageConsumerPact,
  asynchronousBodyHandler,
  Matchers,
} from '@pact-foundation/pact';

const { like, term, eachLike } = Matchers;

// ── Shared constants ──────────────────────────────────────────────────────────

const ISO_DATETIME_REGEX = '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z$';
const SAMPLE_DATETIME = '2026-05-03T12:00:00.000Z';
const POLICY_ID = '00000000-0000-4000-8000-000000000001';
const TRAVELER_ID = '00000000-0000-4000-8000-000000000002';
const EVENT_ID = '00000000-0000-4000-8000-000000000010';
const CORRELATION_ID = 'corr-00000000-0000-4000-8000-000000000001';
const CAUSATION_ID = 'cause-00000000-0000-4000-8000-000000000001';

function baseEnvelope(eventType: string) {
  return {
    eventId: like(EVENT_ID),
    eventType: like(eventType),
    aggregateId: like(POLICY_ID),
    occurredOn: term({ generate: SAMPLE_DATETIME, matcher: ISO_DATETIME_REGEX }),
    correlationId: like(CORRELATION_ID),
    causationId: like(CAUSATION_ID),
  };
}

// ── Pact instance ─────────────────────────────────────────────────────────────

const messagePact = new MessageConsumerPact({
  consumer: 'booking-service',
  provider: 'policy-service',
  dir: `${process.cwd()}/pacts`,
  pactfileWriteMode: 'update',
});

// ── PolicyValidated ───────────────────────────────────────────────────────────

describe('policy-events Pact (booking-service consumer)', () => {
  describe('PolicyValidated event', () => {
    it('should consume a PolicyValidated message when no violations exist', () => {
      return messagePact
        .given('a travel booking passes policy validation')
        .expectsToReceive('a PolicyValidated event')
        .withContent({
          ...baseEnvelope('PolicyValidated'),
          data: {
            travelerId: like(TRAVELER_ID),
            policyId: like(POLICY_ID),
            valid: like(true),
            violations: [],
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              data: {
                travelerId: string;
                policyId: string | null;
                valid: boolean;
                violations: unknown[];
              };
            };
            expect(event.eventType).toBe('PolicyValidated');
            expect(event.data.travelerId).toBeDefined();
            expect(event.data.valid).toBe(true);
            expect(Array.isArray(event.data.violations)).toBe(true);
            expect(event.data.violations).toHaveLength(0);
          }),
        );
    });
  });

  // ── PolicyViolationDetected ───────────────────────────────────────────────

  describe('PolicyViolationDetected event', () => {
    it('should consume a PolicyViolationDetected message when violations exist', () => {
      return messagePact
        .given('a travel booking violates policy rules')
        .expectsToReceive('a PolicyViolationDetected event')
        .withContent({
          ...baseEnvelope('PolicyViolationDetected'),
          data: {
            travelerId: like(TRAVELER_ID),
            policyId: like(POLICY_ID),
            violations: eachLike({
              rule: like('maxFlightCost'),
              severity: like('ERROR'),
              message: like('Flight cost exceeds maximum allowed cost'),
            }),
            requiresApproval: like(true),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              data: {
                travelerId: string;
                policyId: string;
                violations: Array<{
                  rule: string;
                  severity: string;
                  message: string;
                }>;
                requiresApproval: boolean;
              };
            };
            expect(event.eventType).toBe('PolicyViolationDetected');
            expect(event.data.travelerId).toBeDefined();
            expect(event.data.policyId).toBeDefined();
            expect(Array.isArray(event.data.violations)).toBe(true);
            expect(event.data.violations.length).toBeGreaterThan(0);
            const violation = event.data.violations[0]!;
            expect(violation.rule).toBeDefined();
            expect(violation.severity).toBeDefined();
            expect(violation.message).toBeDefined();
            expect(typeof event.data.requiresApproval).toBe('boolean');
          }),
        );
    });

    it('should consume a PolicyViolationDetected event with WARNING severity', () => {
      return messagePact
        .given('a travel booking has a warning-level policy violation')
        .expectsToReceive('a PolicyViolationDetected event with WARNING severity')
        .withContent({
          ...baseEnvelope('PolicyViolationDetected'),
          data: {
            travelerId: like(TRAVELER_ID),
            policyId: like(POLICY_ID),
            violations: eachLike({
              rule: like('advanceBookingDays'),
              severity: like('WARNING'),
              message: like('Booking is within 3 days of departure'),
            }),
            requiresApproval: like(false),
          },
        })
        .withMetadata({ contentType: 'application/json' })
        .verify(
          asynchronousBodyHandler(async (body: unknown) => {
            const event = body as {
              eventType: string;
              data: {
                travelerId: string;
                policyId: string;
                violations: Array<{ severity: string }>;
                requiresApproval: boolean;
              };
            };
            expect(event.eventType).toBe('PolicyViolationDetected');
            const violation = event.data.violations[0]!;
            expect(violation.severity).toBe('WARNING');
            expect(event.data.requiresApproval).toBe(false);
          }),
        );
    });
  });
});
