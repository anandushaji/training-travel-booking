import { PolicyValidatedEvent } from './policy-validated.event';
import { generateUuid } from '@travel/shared';

describe('PolicyValidatedEvent', () => {
  it('serialises to ADR-003 envelope', () => {
    const aggregateId = generateUuid();
    const event = new PolicyValidatedEvent({
      aggregateId,
      correlationId: generateUuid(),
      causationId: generateUuid(),
      data: {
        travelerId: generateUuid(),
        policyId: generateUuid(),
        valid: true,
        violations: [],
      },
    });

    expect(event.eventId).toBeDefined();
    expect(event.eventName).toBe('PolicyValidated');
    expect(event.aggregateId).toBe(aggregateId);
    expect(event.occurredOn).toBeInstanceOf(Date);
    expect(event.correlationId).toBeDefined();
    expect(event.causationId).toBeDefined();
    expect(event.data).toBeDefined();
  });

  it('has all required ADR-003 fields', () => {
    const event = new PolicyValidatedEvent({
      aggregateId: generateUuid(),
      data: {
        travelerId: generateUuid(),
        policyId: null,
        valid: true,
        violations: [],
      },
    });

    const fields = ['eventId', 'eventName', 'aggregateId', 'occurredOn', 'correlationId', 'causationId', 'data'] as const;
    for (const field of fields) {
      expect(event[field]).toBeDefined();
    }
  });

  it('data contains valid:true and empty violations', () => {
    const event = new PolicyValidatedEvent({
      aggregateId: generateUuid(),
      data: {
        travelerId: generateUuid(),
        policyId: generateUuid(),
        valid: true,
        violations: [],
      },
    });
    expect(event.data.valid).toBe(true);
    expect(event.data.violations).toEqual([]);
  });
});
