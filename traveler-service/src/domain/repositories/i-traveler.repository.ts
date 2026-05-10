import { Traveler } from '../aggregates/traveler.aggregate';

export interface ITravelerRepository {
  findById(id: string, includeDeleted?: boolean): Promise<Traveler | null>;
  findByEmail(email: string): Promise<Traveler | null>;
  findByEmployeeId(employeeId: string): Promise<Traveler | null>;
  findAll(includeDeleted: boolean): Promise<Traveler[]>;
  save(traveler: Traveler): Promise<void>;
  delete(id: string): Promise<void>;
}

export const TRAVELER_REPOSITORY = 'TRAVELER_REPOSITORY';
