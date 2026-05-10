import { GetAdminTravelersUseCase } from './get-admin-travelers.use-case';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { Traveler } from '../../domain/aggregates/traveler.aggregate';
import { TravelerPreferences } from '../../domain/value-objects/traveler-preferences.value-object';

const makeRepo = () =>
  ({
    findByEmployeeId: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  }) as jest.Mocked<ITravelerRepository>;

const buildTraveler = (id: string, deletedAt: Date | null = null): Traveler =>
  new Traveler({
    id,
    employeeId: `EMP-${id}`,
    name: 'Alice',
    email: `alice-${id}@corp.com`,
    department: 'Engineering',
    role: 'EMPLOYEE',
    preferences: TravelerPreferences.default(),
    deletedAt,
    anonymisedAt: null,
    dbVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('GetAdminTravelersUseCase', () => {
  it('should return both active and soft-deleted travelers', async () => {
    const repository = makeRepo();
    repository.findAll.mockResolvedValue([
      buildTraveler('id-1'),
      buildTraveler('id-2', new Date('2026-01-01')),
    ]);

    const useCase = new GetAdminTravelersUseCase(repository);
    const result = await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledWith(true);
    expect(result).toHaveLength(2);
    expect(result[0]!.deletedAt).toBeNull();
    expect(result[1]!.deletedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('should call repository.findAll with includeDeleted true', async () => {
    const repository = makeRepo();
    repository.findAll.mockResolvedValue([]);

    const useCase = new GetAdminTravelersUseCase(repository);
    await useCase.execute();

    expect(repository.findAll).toHaveBeenCalledWith(true);
  });

  it('should include anonymisedAt in response', async () => {
    const repository = makeRepo();
    const t = buildTraveler('id-1', new Date('2026-01-01'));
    (t as any).props.anonymisedAt = new Date('2026-02-01');
    repository.findAll.mockResolvedValue([t]);

    const useCase = new GetAdminTravelersUseCase(repository);
    const result = await useCase.execute();

    expect(result[0]!.anonymisedAt).toBe('2026-02-01T00:00:00.000Z');
  });
});
