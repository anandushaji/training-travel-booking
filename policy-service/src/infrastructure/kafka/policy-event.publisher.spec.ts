import { PolicyEventPublisher } from './policy-event.publisher';
import { PolicyValidatedEvent } from '../../domain/events/policy-validated.event';
import { PolicyViolationDetectedEvent } from '../../domain/events/policy-violation-detected.event';
import { KAFKA_PRODUCER } from '@travel/shared';
import { generateUuid } from '@travel/shared';

describe('PolicyEventPublisher', () => {
  let publisher: PolicyEventPublisher;
  let mockProducer: { send: jest.Mock };

  beforeEach(() => {
    mockProducer = { send: jest.fn().mockResolvedValue(undefined) };

    // Build publisher with mocked producer
    publisher = new PolicyEventPublisher(mockProducer as any);
  });

  describe('publishPolicyValidated', () => {
    it('sends to policy-events with aggregateId key', async () => {
      const aggregateId = generateUuid();
      const event = new PolicyValidatedEvent({
        aggregateId,
        data: {
          travelerId: generateUuid(),
          policyId: generateUuid(),
          valid: true,
          violations: [],
        },
      });

      await publisher.publishPolicyValidated(event);

      expect(mockProducer.send).toHaveBeenCalledTimes(1);
      const call = mockProducer.send.mock.calls[0]![0];
      expect(call.topic).toBe('policy-events');
      expect(call.messages[0]!.key).toBe(aggregateId);
    });

    it('message conforms to ADR-003 envelope', async () => {
      const aggregateId = generateUuid();
      const event = new PolicyValidatedEvent({
        aggregateId,
        correlationId: generateUuid(),
        causationId: generateUuid(),
        data: {
          travelerId: generateUuid(),
          policyId: null,
          valid: true,
          violations: [],
        },
      });

      await publisher.publishPolicyValidated(event);

      const messageValue = mockProducer.send.mock.calls[0]![0].messages[0]!.value as string;
      const parsed = JSON.parse(messageValue);
      expect(parsed.eventId).toBeDefined();
      expect(parsed.eventType).toBe('PolicyValidated');
      expect(parsed.aggregateId).toBe(aggregateId);
      expect(parsed.occurredOn).toBeDefined();
      expect(parsed.correlationId).toBeDefined();
      expect(parsed.causationId).toBeDefined();
      expect(parsed.data).toBeDefined();
    });

    it('rethrows Kafka error after logging', async () => {
      mockProducer.send.mockRejectedValueOnce(new Error('Kafka unavailable'));

      const event = new PolicyValidatedEvent({
        aggregateId: generateUuid(),
        data: {
          travelerId: generateUuid(),
          policyId: null,
          valid: true,
          violations: [],
        },
      });

      await expect(publisher.publishPolicyValidated(event)).rejects.toThrow('Kafka unavailable');
    });

    it('uses String() when occurredOn is not a Date instance', async () => {
      const event = new PolicyValidatedEvent({
        aggregateId: generateUuid(),
        data: { travelerId: generateUuid(), policyId: null, valid: true, violations: [] },
      });
      // Override occurredOn with a non-Date value to exercise the String() branch
      (event as any).occurredOn = '2026-05-03T12:00:00.000Z';

      await publisher.publishPolicyValidated(event);

      const messageValue = mockProducer.send.mock.calls[0]![0].messages[0]!.value as string;
      const parsed = JSON.parse(messageValue);
      expect(parsed.occurredOn).toBe('2026-05-03T12:00:00.000Z');
    });
  });

  describe('publishPolicyViolationDetected', () => {
    it('sends to policy-events with aggregateId key', async () => {
      const aggregateId = generateUuid();
      const event = new PolicyViolationDetectedEvent({
        aggregateId,
        data: {
          travelerId: generateUuid(),
          policyId: generateUuid(),
          violations: [{ rule: 'cabinClass', severity: 'ERROR', message: 'Not allowed' }],
          requiresApproval: false,
        },
      });

      await publisher.publishPolicyViolationDetected(event);

      expect(mockProducer.send).toHaveBeenCalledTimes(1);
      const call = mockProducer.send.mock.calls[0]![0];
      expect(call.topic).toBe('policy-events');
      expect(call.messages[0]!.key).toBe(aggregateId);
    });

    it('message includes violations in data envelope', async () => {
      const event = new PolicyViolationDetectedEvent({
        aggregateId: generateUuid(),
        data: {
          travelerId: generateUuid(),
          policyId: generateUuid(),
          violations: [{ rule: 'maxFlightCost', severity: 'ERROR', message: 'Too expensive' }],
          requiresApproval: true,
        },
      });

      await publisher.publishPolicyViolationDetected(event);

      const messageValue = mockProducer.send.mock.calls[0]![0].messages[0]!.value as string;
      const parsed = JSON.parse(messageValue);
      expect(parsed.data.violations).toBeDefined();
      expect(parsed.data.violations).toHaveLength(1);
    });

    it('rethrows Kafka error after logging', async () => {
      mockProducer.send.mockRejectedValueOnce(new Error('Kafka down'));

      const event = new PolicyViolationDetectedEvent({
        aggregateId: generateUuid(),
        data: {
          travelerId: generateUuid(),
          policyId: generateUuid(),
          violations: [],
          requiresApproval: false,
        },
      });

      await expect(publisher.publishPolicyViolationDetected(event)).rejects.toThrow('Kafka down');
    });

    it('uses String() when occurredOn is not a Date instance', async () => {
      const event = new PolicyViolationDetectedEvent({
        aggregateId: generateUuid(),
        data: {
          travelerId: generateUuid(),
          policyId: generateUuid(),
          violations: [{ rule: 'cabinClass', severity: 'ERROR', message: 'Not allowed' }],
          requiresApproval: false,
        },
      });
      (event as any).occurredOn = '2026-05-03T12:00:00.000Z';

      await publisher.publishPolicyViolationDetected(event);

      const messageValue = mockProducer.send.mock.calls[0]![0].messages[0]!.value as string;
      const parsed = JSON.parse(messageValue);
      expect(parsed.occurredOn).toBe('2026-05-03T12:00:00.000Z');
    });
  });
});
