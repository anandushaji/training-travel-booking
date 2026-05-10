import { MessageConsumerPact, Matchers, asynchronousBodyHandler } from '@pact-foundation/pact';
import * as path from 'path';

const { like, term } = Matchers;

const ISO8601_DATETIME_RE = '^\\d{4}-[01]\\d-[0-3]\\dT[0-2]\\d:[0-5]\\d:[0-5]\\d(\\.\\d+)?([+-][0-2]\\d:[0-5]\\d|Z)$';
const UUID_RE = '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

const PACT_DIR = path.resolve(process.cwd(), 'pacts');

/**
 * ADR-003 required top-level envelope fields common to all inventory events.
 */
const envelopeFields = () => ({
  eventId: term({ generate: 'a3c2b1d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', matcher: UUID_RE }),
  aggregateId: term({ generate: 'b4d5c6e7-f8a9-4b0c-1d2e-3f4a5b6c7d8e', matcher: UUID_RE }),
  occurredOn: term({ generate: '2026-07-01T10:00:00.000Z', matcher: ISO8601_DATETIME_RE }),
  correlationId: like('corr-booking-1'),
  causationId: like('caus-booking-1'),
});

describe('InventoryEvents Pact — booking-service consumes inventory-service', () => {
  let pact: MessageConsumerPact;

  beforeAll(() => {
    pact = new MessageConsumerPact({
      consumer: 'booking-service',
      provider: 'inventory-service',
      dir: PACT_DIR,
      logLevel: 'error',
    });
  });

  afterAll(() => { /* pact file is written automatically on verify() */ });

  // ─── FlightReserved ──────────────────────────────────────────────────────────

  it('AC-01: FlightReserved message has all required ADR-003 fields', () => {
    return pact
      .given('a flight reservation exists')
      .expectsToReceive('a FlightReserved event')
      .withContent({
        ...envelopeFields(),
        eventType: 'FlightReserved',
        data: like({
          reservationId: term({ generate: 'c5e6d7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f', matcher: UUID_RE }),
          offerId: like('offer-123'),
          passengerId: term({ generate: 'd6f7e8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', matcher: UUID_RE }),
          origin: like('LHR'),
          destination: like('JFK'),
          flightNumber: like('BA117'),
          carrier: like('BA'),
          departureAt: term({ generate: '2026-07-01T10:00:00.000Z', matcher: ISO8601_DATETIME_RE }),
          arrivalAt: term({ generate: '2026-07-01T13:00:00.000Z', matcher: ISO8601_DATETIME_RE }),
          cabinClass: like('ECONOMY'),
          expiresAt: term({ generate: '2026-07-01T10:15:00.000Z', matcher: ISO8601_DATETIME_RE }),
        }),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        asynchronousBodyHandler((body) => {
          const msg = body as Record<string, unknown>;
          if (!msg['eventId']) throw new Error('Missing eventId');
          if (msg['eventType'] !== 'FlightReserved') throw new Error(`Wrong eventType: ${String(msg['eventType'])}`);
          if (!msg['aggregateId']) throw new Error('Missing aggregateId');
          if (!msg['occurredOn']) throw new Error('Missing occurredOn');
          if (!('correlationId' in msg)) throw new Error('Missing correlationId');
          if (!('causationId' in msg)) throw new Error('Missing causationId');
          if (!msg['data']) throw new Error('Missing data');
          return Promise.resolve();
        }),
      );
  });

  // ─── FlightReservationCancelled ───────────────────────────────────────────────

  it('AC-02: FlightReservationCancelled message has all required ADR-003 fields', () => {
    return pact
      .given('a confirmed flight reservation exists')
      .expectsToReceive('a FlightReservationCancelled event')
      .withContent({
        ...envelopeFields(),
        eventType: 'FlightReservationCancelled',
        data: like({
          reservationId: term({ generate: 'c5e6d7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f', matcher: UUID_RE }),
          passengerId: term({ generate: 'd6f7e8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', matcher: UUID_RE }),
          cancelledAt: term({ generate: '2026-07-01T10:05:00.000Z', matcher: ISO8601_DATETIME_RE }),
          reason: like('USER_REQUESTED'),
        }),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        asynchronousBodyHandler((body) => {
          const msg = body as Record<string, unknown>;
          if (!msg['eventId']) throw new Error('Missing eventId');
          if (msg['eventType'] !== 'FlightReservationCancelled') throw new Error(`Wrong eventType: ${String(msg['eventType'])}`);
          const data = msg['data'] as Record<string, unknown>;
          if (!data['cancelledAt']) throw new Error('Missing data.cancelledAt');
          if (!data['reason']) throw new Error('Missing data.reason');
          return Promise.resolve();
        }),
      );
  });

  // ─── FlightReservationExpired ─────────────────────────────────────────────────

  it('AC-03: FlightReservationExpired message has all required ADR-003 fields', () => {
    return pact
      .given('an expired pending flight reservation exists')
      .expectsToReceive('a FlightReservationExpired event')
      .withContent({
        ...envelopeFields(),
        eventType: 'FlightReservationExpired',
        data: like({
          reservationId: term({ generate: 'c5e6d7f8-a9b0-4c1d-2e3f-4a5b6c7d8e9f', matcher: UUID_RE }),
          passengerId: term({ generate: 'd6f7e8a9-b0c1-4d2e-3f4a-5b6c7d8e9f0a', matcher: UUID_RE }),
          offerId: like('offer-123'),
          expiredAt: term({ generate: '2026-07-01T10:20:00.000Z', matcher: ISO8601_DATETIME_RE }),
        }),
      })
      .withMetadata({ contentType: 'application/json' })
      .verify(
        asynchronousBodyHandler((body) => {
          const msg = body as Record<string, unknown>;
          if (!msg['eventId']) throw new Error('Missing eventId');
          if (msg['eventType'] !== 'FlightReservationExpired') throw new Error(`Wrong eventType: ${String(msg['eventType'])}`);
          const data = msg['data'] as Record<string, unknown>;
          if (!data['expiredAt']) throw new Error('Missing data.expiredAt');
          return Promise.resolve();
        }),
      );
  });
});
