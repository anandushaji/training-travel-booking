import { Traveler } from './traveler.aggregate';
import { TravelerPreferences } from '../value-objects/traveler-preferences.value-object';
import { TravelerCreatedEvent } from '../events/traveler-created.event';
import { TravelerUpdatedEvent } from '../events/traveler-updated.event';
import { TravelerDeletedEvent } from '../events/traveler-deleted.event';

describe('Traveler aggregate', () => {
  const validCreateProps = {
    employeeId: 'EMP-001',
    name: 'Alice Smith',
    email: 'alice@corp.com',
    department: 'Engineering',
    role: 'EMPLOYEE' as const,
    correlationId: 'corr-123',
    causationId: 'cause-123',
  };

  describe('create()', () => {
    it('should emit TravelerCreated event on create', () => {
      const traveler = Traveler.create(validCreateProps);
      const events = traveler.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TravelerCreatedEvent);
      const event = events[0] as TravelerCreatedEvent;
      expect(event.data.employeeId).toBe('EMP-001');
      expect(event.data.name).toBe('Alice Smith');
    });

    it('should create traveler with deletedAt = null', () => {
      const traveler = Traveler.create(validCreateProps);
      expect(traveler.deletedAt).toBeNull();
    });

    it('should create traveler with default preferences', () => {
      const traveler = Traveler.create(validCreateProps);
      expect(traveler.preferences.seatPreference).toBe('none');
      expect(traveler.preferences.mealPreference).toBe('standard');
    });

    it('should throw InvalidEmailException for invalid email', () => {
      expect(() =>
        Traveler.create({ ...validCreateProps, email: 'not-valid' }),
      ).toThrow();
    });
  });

  describe('softDelete()', () => {
    it('should set deletedAt and emit TravelerDeleted on softDelete', () => {
      const traveler = Traveler.create(validCreateProps);
      traveler.clearEvents();
      traveler.softDelete('corr-456', 'cause-456');

      expect(traveler.deletedAt).not.toBeNull();
      const events = traveler.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TravelerDeletedEvent);
    });
  });

  describe('updatePreferences()', () => {
    it('should replace preferences and emit TravelerUpdated with changedFields preferences', () => {
      const traveler = Traveler.create(validCreateProps);
      traveler.clearEvents();

      const newPreferences = TravelerPreferences.from({
        seatPreference: 'window',
        mealPreference: 'vegan',
      });
      traveler.updatePreferences(newPreferences);

      expect(traveler.preferences.seatPreference).toBe('window');
      expect(traveler.preferences.mealPreference).toBe('vegan');

      const events = traveler.getUncommittedEvents();
      expect(events).toHaveLength(1);
      expect(events[0]).toBeInstanceOf(TravelerUpdatedEvent);
      const event = events[0] as TravelerUpdatedEvent;
      expect(event.data.changedFields).toContain('preferences');
    });
  });

  describe('update()', () => {
    it('should emit TravelerUpdated with changed fields', () => {
      const traveler = Traveler.create(validCreateProps);
      traveler.clearEvents();
      traveler.update({ department: 'Product', correlationId: 'corr-789' });

      const events = traveler.getUncommittedEvents();
      expect(events).toHaveLength(1);
      const event = events[0] as TravelerUpdatedEvent;
      expect(event.data.changedFields).toContain('department');
      expect(event.data.snapshot.department).toBe('Product');
    });

    it('should emit no event when nothing changed', () => {
      const traveler = Traveler.create(validCreateProps);
      traveler.clearEvents();
      traveler.update({ name: 'Alice Smith' }); // same value
      expect(traveler.getUncommittedEvents()).toHaveLength(0);
    });
  });

  describe('anonymisePii()', () => {
    it('should set name and email to anonymised placeholders and set anonymisedAt', () => {
      const traveler = Traveler.create(validCreateProps);
      traveler.anonymisePii();

      expect(traveler.name).toMatch(/^DELETED_USER_/);
      expect(traveler.email).toMatch(/@anonymised\.invalid$/);
      expect(traveler.anonymisedAt).not.toBeNull();
    });
  });
});
