import { GetTravelerUseCase } from './get-traveler.use-case';
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
    preferences: TravelerPreferences.default(),
    deletedAt: null,
    anonymisedAt: null,
    dbVersion: 1,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  });

const cachedDto: TravelerCacheDto = {
  id: 'traveler-uuid-1',
  employeeId: 'EMP-001',
  name: 'Alice',
  email: 'alice@corp.com',
  department: 'Engineering',
  role: 'EMPLOYEE',
  preferences: {},
  deletedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('GetTravelerUseCase', () => {
  it('should return cached dto without calling repository on cache hit', async () => {
    const { repository, cache } = makeMocks();
    cache.get.mockResolvedValue(cachedDto);

    const useCase = new GetTravelerUseCase(repository, cache);
    const result = await useCase.execute('traveler-uuid-1');

    expect(cache.get).toHaveBeenCalledWith('traveler-uuid-1');
    expect(repository.findById).not.toHaveBeenCalled();
    expect(result).toEqual(cachedDto);
  });

  it('should call repository and populate cache on cache miss', async () => {
    const { repository, cache } = makeMocks();
    cache.get.mockResolvedValue(null);
    repository.findById.mockResolvedValue(buildTraveler());
    cache.set.mockResolvedValue(undefined);

    const useCase = new GetTravelerUseCase(repository, cache);
    await useCase.execute('traveler-uuid-1');

    expect(repository.findById).toHaveBeenCalledWith('traveler-uuid-1');
    expect(cache.set).toHaveBeenCalledWith(
      'traveler-uuid-1',
      expect.objectContaining({ id: 'traveler-uuid-1' }),
    );
  });

  it('should throw TravelerNotFoundException when repository returns null', async () => {
    const { repository, cache } = makeMocks();
    cache.get.mockResolvedValue(null);
    repository.findById.mockResolvedValue(null);

    const useCase = new GetTravelerUseCase(repository, cache);
    await expect(useCase.execute('unknown-id')).rejects.toBeInstanceOf(
      TravelerNotFoundException,
    );
  });

  it('should return dto with correct fields on cache miss', async () => {
    const { repository, cache } = makeMocks();
    cache.get.mockResolvedValue(null);
    repository.findById.mockResolvedValue(buildTraveler());
    cache.set.mockResolvedValue(undefined);

    const useCase = new GetTravelerUseCase(repository, cache);
    const result = await useCase.execute('traveler-uuid-1');

    expect(result).toMatchObject({
      id: 'traveler-uuid-1',
      name: 'Alice',
      email: 'alice@corp.com',
    });
  });
});
