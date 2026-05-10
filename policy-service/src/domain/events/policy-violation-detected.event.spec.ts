import { PolicyViolationDetectedEvent } from './policy-violation-detected.event';
import { generateUuid } from '@travel/shared';

describe('PolicyViolationDetectedEvent', () => {
  it('includes violations in data', () => {
    const event = new PolicyViolationDetectedEvent({
      aggregateId: generateUuid(),
      data: {
        travelerId: generateUuid(),
        policyId: generateUuid(),
        violations: [
          { rule: 'cabinClass', severity: 'ERROR', message: 'Not allowed' },
        ],
        requiresApproval: false,
      },
    });

    expect(event.data.violations).toBeDefined();
    expect(event.data.violations).toHaveLength(1);
    expect(event.data.violations[0]!.rule).toBe('cabinClass');
  });

  it('serialises to ADR-003 envelope', () => {
    const aggregateId = generateUuid();
    const event = new PolicyViolationDetectedEvent({
      aggregateId,
      data: {
        travelerId: generateUuid(),
        policyId: generateUuid(),
        violations: [],
        requiresApproval: true,
      },
    });

    expect(event.eventId).toBeDefined();
    expect(event.eventName).toBe('PolicyViolationDetected');
    expect(event.aggregateId).toBe(aggregateId);
    expect(event.occurredOn).toBeInstanceOf(Date);
  });
});
