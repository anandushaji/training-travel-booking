import { Traveler } from '../../domain/aggregates/traveler.aggregate';

export class AdminTravelerResponseDto {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  role: string;
  preferences: object;
  deletedAt: string | null;
  anonymisedAt: string | null;
  createdAt: string;
  updatedAt: string;

  constructor(traveler: Traveler) {
    this.id = traveler.id;
    this.employeeId = traveler.employeeId;
    this.name = traveler.name;
    this.email = traveler.email;
    this.department = traveler.department;
    this.role = traveler.role;
    this.preferences = traveler.preferences.toPlainObject();
    this.deletedAt = traveler.deletedAt?.toISOString() ?? null;
    this.anonymisedAt = traveler.anonymisedAt?.toISOString() ?? null;
    this.createdAt = traveler.createdAt.toISOString();
    this.updatedAt = traveler.updatedAt.toISOString();
  }
}
