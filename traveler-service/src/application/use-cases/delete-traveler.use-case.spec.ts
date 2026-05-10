import { DeleteTravelerUseCase } from './delete-traveler.use-case';
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

describe('DeleteTravelerUseCase', () => {
  it('should throw TravelerNotFoundException when traveler does not exist', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findById.mockResolvedValue(null);

    const useCase = new DeleteTravelerUseCase(repository, cache, publisher);
    await expect(useCase.execute('unknown-id')).rejects.toBeInstanceOf(
      TravelerNotFoundException,
    );
  });

  it('should set deletedAt on soft-delete and save', async () => {
    const { repository, cache, publisher } = makeMocks();
    const traveler = buildTraveler();
    repository.findById.mockResolvedValue(traveler);
    repository.save.mockResolvedValue(undefined);
    cache.invalidate.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new DeleteTravelerUseCase(repository, cache, publisher);
    await useCase.execute('traveler-uuid-1', 'corr-123');

    // Verify softDelete was called — the aggregate should now have deletedAt set
    expect(traveler.deletedAt).not.toBeNull();
    expect(repository.save).toHaveBeenCalledWith(traveler);
  });

  it('should invalidate cache after soft-delete', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findById.mockResolvedValue(buildTraveler());
    repository.save.mockResolvedValue(undefined);
    cache.invalidate.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new DeleteTravelerUseCase(repository, cache, publisher);
    await useCase.execute('traveler-uuid-1');

    expect(cache.invalidate).toHaveBeenCalledWith('traveler-uuid-1');
  });

  it('should publish TravelerDeleted event after save', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findById.mockResolvedValue(buildTraveler());
    repository.save.mockResolvedValue(undefined);
    cache.invalidate.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new DeleteTravelerUseCase(repository, cache, publisher);
    await useCase.execute('traveler-uuid-1');

    expect(publisher.publish).toHaveBeenCalledTimes(1);
  });
});
