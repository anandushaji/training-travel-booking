import { GetTravelerPreferencesUseCase } from './get-traveler-preferences.use-case';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService, TravelerCacheDto } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerNotFoundException } from '../../domain/exceptions/traveler-not-found.exception';
import { Traveler } from '../../domain/aggregates/traveler.aggregate';
import { TravelerPreferences } from '../../domain/value-objects/traveler-preferences.value-object';

const makeMocks = () => ({
  repository: {
    findByEmployeeId: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<ITravelerRepository>,
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    invalidate: jest.fn(),
  } as unknown as jest.Mocked<TravelerCacheService>,
});

const buildTraveler = (): Traveler =>
  new Traveler({
    id: 'traveler-uuid-1',
    employeeId: 'EMP-001',
    name: 'Alice',
    email: 'alice@corp.com',
    department: 'Engineering',
    role: 'EMPLOYEE',
    preferences: TravelerPreferences.from({ seatPreference: 'window', mealPreference: 'vegan' }),
    deletedAt: null,
    anonymisedAt: null,
    dbVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

const cachedDto: TravelerCacheDto = {
  id: 'traveler-uuid-1',
  employeeId: 'EMP-001',
  name: 'Alice',
  email: 'alice@corp.com',
  department: 'Engineering',
  role: 'EMPLOYEE',
  preferences: { seatPreference: 'aisle', mealPreference: 'halal', frequentFlyerNumbers: {}, preferredAirlines: [], specialAssistance: [] },
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GetTravelerPreferencesUseCase', () => {
  it('should return preferences from cache when available', async () => {
    const { repository, cache } = makeMocks();
    cache.get.mockResolvedValue(cachedDto);

    const useCase = new GetTravelerPreferencesUseCase(repository, cache);
    const result = await useCase.execute('traveler-uuid-1');

    expect(repository.findById).not.toHaveBeenCalled();
    expect(result).toEqual(cachedDto.preferences);
  });

  it('should throw TravelerNotFoundException for unknown id', async () => {
    const { repository, cache } = makeMocks();
    cache.get.mockResolvedValue(null);
    repository.findById.mockResolvedValue(null);

    const useCase = new GetTravelerPreferencesUseCase(repository, cache);
    await expect(useCase.execute('unknown-id')).rejects.toBeInstanceOf(
      TravelerNotFoundException,
    );
  });

  it('should return preferences from repository on cache miss', async () => {
    const { repository, cache } = makeMocks();
    cache.get.mockResolvedValue(null);
    repository.findById.mockResolvedValue(buildTraveler());
    cache.set.mockResolvedValue(undefined);

    const useCase = new GetTravelerPreferencesUseCase(repository, cache);
    const result = await useCase.execute('traveler-uuid-1');

    expect(result).toMatchObject({ seatPreference: 'window', mealPreference: 'vegan' });
  });
});
