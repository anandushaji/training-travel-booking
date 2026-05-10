import { Traveler } from '../../domain/aggregates/traveler.aggregate';

export class TravelerResponseDto {
  id: string;
  employeeId: string;
  name: string;
  fullName: string;
  email: string;
  department: string;
  role: string;
  preferences: object;
  createdAt: string;
  updatedAt: string;

  constructor(traveler: Traveler) {
    this.id = traveler.id;
    this.employeeId = traveler.employeeId;
    this.name = traveler.name;
    this.fullName = traveler.name;
    this.email = traveler.email;
    this.department = traveler.department;
    this.role = traveler.role;
    this.preferences = traveler.preferences.toPlainObject();
    this.createdAt = traveler.createdAt.toISOString();
    this.updatedAt = traveler.updatedAt.toISOString();
  }
}
