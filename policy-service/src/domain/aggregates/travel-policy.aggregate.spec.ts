import { TravelPolicy } from './travel-policy.aggregate';
import { CabinClass } from '../value-objects/policy-rules.value-object';
import { DomainException } from '@travel/shared';

const baseRules = {
  maxFlightCost: 1000,
  allowedCabinClasses: [CabinClass.ECONOMY, CabinClass.BUSINESS],
  advanceBookingDays: 7,
  requiresApproval: false,
  approvalThreshold: 800,
  allowInternational: true,
};

describe('TravelPolicy aggregate', () => {
  describe('create', () => {
    it('sets version to 0', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      expect(policy.version).toBe(0);
    });

    it('sets active to true', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      expect(policy.active).toBe(true);
    });

    it('sets createdBy', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      expect(policy.createdBy).toBe('admin-user');
    });

    it('sets description to null when not provided', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      expect(policy.description).toBeNull();
    });
  });

  describe('update', () => {
    it('increments version', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      policy.update({ name: 'Updated' });
      expect(policy.version).toBe(1);
    });

    it('updates name', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      policy.update({ name: 'New Name' });
      expect(policy.name).toBe('New Name');
    });

    it('updates rules', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      policy.update({ rules: { ...baseRules, maxFlightCost: 2000 } });
      expect(policy.rules.maxFlightCost).toBe(2000);
    });

    it('increments version multiple times', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      policy.update({ name: 'V1' });
      policy.update({ name: 'V2' });
      expect(policy.version).toBe(2);
    });
  });

  describe('deactivate', () => {
    it('sets active to false and increments version', () => {
      const policy = TravelPolicy.create(
        { name: 'Standard', department: 'Engineering', rules: baseRules },
        'admin-user',
      );
      policy.deactivate();
      expect(policy.active).toBe(false);
      expect(policy.version).toBe(1);
    });
  });
});

describe('PolicyRules value object', () => {
  it('rejects invalid cabinClass', () => {
    expect(() => {
      TravelPolicy.create(
        {
          name: 'Bad',
          department: 'Eng',
          rules: {
            ...baseRules,
            allowedCabinClasses: ['INVALID_CLASS' as CabinClass],
          },
        },
        'admin',
      );
    }).toThrow(DomainException);
  });

  it('accepts valid cabin classes', () => {
    expect(() => {
      TravelPolicy.create(
        { name: 'Good', department: 'Eng', rules: baseRules },
        'admin',
      );
    }).not.toThrow();
  });
});
