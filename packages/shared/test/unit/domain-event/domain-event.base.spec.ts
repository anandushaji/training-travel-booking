import { DomainEvent } from '../../../src/domain-event/domain-event.base';
import { isValidUuid } from '../../../src/utils/uuid.util';

class TestEvent extends DomainEvent {
  get eventName(): string {
    return 'TestEvent';
  }
}

describe('DomainEvent', () => {
  describe('construction', () => {
    it('populates all required fields', () => {
      const e = new TestEvent({ aggregateId: 'agg-1' });
      expect(typeof e.eventId).toBe('string');
      expect(e.eventId.length).toBeGreaterThan(0);
      expect(e.aggregateId).toBe('agg-1');
      expect(e.occurredOn).toBeInstanceOf(Date);
      expect(isValidUuid(e.correlationId)).toBe(true);
      expect(isValidUuid(e.causationId)).toBe(true);
    });
  });

  describe('causationId', () => {
    it('defaults to eventId when not provided', () => {
      const e = new TestEvent({ aggregateId: 'agg-1' });
      expect(e.causationId).toBe(e.eventId);
    });

    it('uses provided causationId when supplied', () => {
      const causationId = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000000';
      const e = new TestEvent({ aggregateId: 'agg-1', causationId });
      expect(e.causationId).toBe(causationId);
    });
  });

  describe('correlationId', () => {
    it('uses provided value', () => {
      const correlationId = 'a1b2c3d4-e5f6-4a7b-8c9d-000000000001';
      const e = new TestEvent({ aggregateId: 'agg-1', correlationId });
      expect(e.correlationId).toBe(correlationId);
    });

    it('auto-generates a UUID when not provided', () => {
      const e = new TestEvent({ aggregateId: 'agg-1' });
      expect(isValidUuid(e.correlationId)).toBe(true);
    });
  });

  describe('eventName', () => {
    it('returns concrete subclass value', () => {
      const e = new TestEvent({ aggregateId: 'agg-1' });
      expect(e.eventName).toBe('TestEvent');
    });
  });
});
