export type SeatPreference = 'WINDOW' | 'AISLE' | 'NO_PREFERENCE';

export type MealPreference =
  | 'STANDARD'
  | 'VEGETARIAN'
  | 'VEGAN'
  | 'KOSHER'
  | 'HALAL'
  | 'GLUTEN_FREE';

export interface FrequentFlyerNumber {
  airline: string;
  number: string;
}

export interface LoyaltyProgram {
  program: string;
  number: string;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  emailAddress?: string | undefined;
  phoneNumber?: string | undefined;
}

export interface TravelerPreferences {
  seatPreference?: SeatPreference | undefined;
  mealPreference?: MealPreference | undefined;
  specialRequests?: string | undefined;
  frequentFlyerNumbers?: FrequentFlyerNumber[] | undefined;
  loyaltyPrograms?: LoyaltyProgram[] | undefined;
  notifications?: NotificationPreferences | undefined;
  updatedAt?: string | undefined;
}

export interface TravelerManager {
  id: string;
  name: string;
  email: string;
}

export interface TravelerProfile {
  id: string;
  employeeId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  department: string;
  jobTitle?: string | undefined;
  level?: string | undefined;
  manager?: TravelerManager | undefined;
  costCenter?: string | undefined;
  approvalRequired?: boolean | undefined;
  active?: boolean | undefined;
  hireDate?: string | undefined;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
  lastSyncedAt?: string | undefined;
}

export interface UpdateTravelerRequest {
  name?: string | undefined;
  department?: string | undefined;
  jobTitle?: string | undefined;
  level?: string | undefined;
  managerId?: string | undefined;
  costCenter?: string | undefined;
  approvalRequired?: boolean | undefined;
  active?: boolean | undefined;
}

export interface TravelerListResponse {
  travelers: TravelerProfile[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface ProfileState {
  viewingTravelerId: string | null;
}
