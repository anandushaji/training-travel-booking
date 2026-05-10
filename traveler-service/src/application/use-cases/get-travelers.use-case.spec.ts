import { GetTravelersUseCase } from './get-travelers.use-case';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { Traveler } from '../../domain/aggregates/traveler.aggregate';
import { TravelerPreferences } from '../../domain/value-objects/traveler-preferences.value-object';

const makeRepo = () =>
  ({
    findByEmployeeId: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<ITravelerRepository>;

const buildTraveler = (id: string, employeeId: string): Traveler =>
  new Traveler({
    id,
    employeeId,
    name: 'Alice',
    email: `alice-${id}@corp.com`,
    department: 'Engineering',
    role: 'EMPLOYEE',
    preferences: TravelerPreferences.default(),
    deletedAt: null,
    anonymisedAt: null,
    dbVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('GetTravelersUseCase', () => {
  it('should return all active travelers', async () => {
    const repository = makeRepo();
    repository.findAll.mockResolvedValue([
      buildTraveler('id-1', 'EMP-001'),
      buildTraveler('id-2', 'EMP-002'),
    ]);

    const useCase = new GetTravelersUseCase(repository);
    const result = await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledWith(false);
    expect(result).toHaveLength(2);
    expect(result[0]!.employeeId).toBe('EMP-001');
    expect(result[1]!.employeeId).toBe('EMP-002');
  });

  it('should return empty array when no travelers exist', async () => {
    const repository = makeRepo();
    repository.findAll.mockResolvedValue([]);

    const useCase = new GetTravelersUseCase(repository);
    const result = await useCase.execute();

    expect(result).toHaveLength(0);
  });

  it('should only include active records (calls findAll with false)', async () => {
    const repository = makeRepo();
    repository.findAll.mockResolvedValue([]);

    const useCase = new GetTravelersUseCase(repository);
    await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledWith(false);
  });
});
