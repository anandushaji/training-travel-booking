import { describe, it, expectTypeOf } from 'vitest';
import type {
  TravelerProfile,
  TravelerPreferences,
  FrequentFlyerNumber,
  LoyaltyProgram,
  NotificationPreferences,
  UpdateTravelerRequest,
  TravelerListResponse,
} from './profile.types';

describe('profile.types — all exported interfaces satisfy expected shape', () => {
  it('TravelerProfile has required fields', () => {
    expectTypeOf<TravelerProfile>().toMatchTypeOf<{
      id: string;
      employeeId: string;
      email: string;
      firstName: string;
      lastName: string;
      fullName: string;
      department: string;
    }>();
  });

  it('TravelerPreferences optional fields are T | undefined', () => {
    expectTypeOf<TravelerPreferences['seatPreference']>().toEqualTypeOf<
      'WINDOW' | 'AISLE' | 'NO_PREFERENCE' | undefined
    >();
    expectTypeOf<TravelerPreferences['frequentFlyerNumbers']>().toEqualTypeOf<
      FrequentFlyerNumber[] | undefined
    >();
  });

  it('FrequentFlyerNumber has airline and number', () => {
    expectTypeOf<FrequentFlyerNumber>().toMatchTypeOf<{
      airline: string;
      number: string;
    }>();
  });

  it('LoyaltyProgram has program and number', () => {
    expectTypeOf<LoyaltyProgram>().toMatchTypeOf<{
      program: string;
      number: string;
    }>();
  });

  it('NotificationPreferences has email and sms booleans', () => {
    expectTypeOf<NotificationPreferences>().toMatchTypeOf<{
      email: boolean;
      sms: boolean;
    }>();
  });

  it('UpdateTravelerRequest all fields are optional', () => {
    const req: UpdateTravelerRequest = {};
    expect(req).toBeDefined();
  });

  it('TravelerListResponse has travelers array and pagination', () => {
    expectTypeOf<TravelerListResponse>().toMatchTypeOf<{
      travelers: TravelerProfile[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        limit: number;
      };
    }>();
  });
});
