import { UpdateTravelerPreferencesUseCase } from './update-traveler-preferences.use-case';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
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
  publisher: {
    publish: jest.fn(),
  } as unknown as jest.Mocked<TravelerEventPublisher>,
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
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('UpdateTravelerPreferencesUseCase', () => {
  it('should replace preferences and invalidate cache', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findById.mockResolvedValue(buildTraveler());
    repository.save.mockResolvedValue(undefined);
    cache.invalidate.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new UpdateTravelerPreferencesUseCase(repository, cache, publisher);
    const result = await useCase.execute(
      'traveler-uuid-1',
      { seatPreference: 'window', mealPreference: 'vegan' },
    );

    expect(repository.save).toHaveBeenCalled();
    expect(cache.invalidate).toHaveBeenCalledWith('traveler-uuid-1');
    expect(result.seatPreference).toBe('window');
    expect(result.mealPreference).toBe('vegan');
  });

  it('should throw TravelerNotFoundException when traveler does not exist', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findById.mockResolvedValue(null);

    const useCase = new UpdateTravelerPreferencesUseCase(repository, cache, publisher);
    await expect(
      useCase.execute('unknown-id', { seatPreference: 'aisle' }),
    ).rejects.toBeInstanceOf(TravelerNotFoundException);
  });

  it('should publish TravelerUpdated event after updating preferences', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findById.mockResolvedValue(buildTraveler());
    repository.save.mockResolvedValue(undefined);
    cache.invalidate.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new UpdateTravelerPreferencesUseCase(repository, cache, publisher);
    await useCase.execute('traveler-uuid-1', { mealPreference: 'halal' });

    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });

  it('should merge existing preferences with new values', async () => {
    const { repository, cache, publisher } = makeMocks();
    const traveler = new Traveler({
      id: 'traveler-uuid-1',
      employeeId: 'EMP-001',
      name: 'Alice',
      email: 'alice@corp.com',
      department: 'Engineering',
      role: 'EMPLOYEE',
      preferences: TravelerPreferences.from({ seatPreference: 'window', mealPreference: 'standard' }),
      deletedAt: null,
      anonymisedAt: null,
      dbVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    repository.findById.mockResolvedValue(traveler);
    repository.save.mockResolvedValue(undefined);
    cache.invalidate.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new UpdateTravelerPreferencesUseCase(repository, cache, publisher);
    const result = await useCase.execute('traveler-uuid-1', { mealPreference: 'vegan' });

    // seatPreference from existing; mealPreference from update
    expect(result.seatPreference).toBe('window');
    expect(result.mealPreference).toBe('vegan');
  });
});
