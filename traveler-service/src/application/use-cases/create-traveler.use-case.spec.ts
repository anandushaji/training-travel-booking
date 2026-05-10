import { CreateTravelerUseCase } from './create-traveler.use-case';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
import { DuplicateEmployeeIdException } from '../../domain/exceptions/duplicate-employee-id.exception';
import { Traveler } from '../../domain/aggregates/traveler.aggregate';
import { TravelerRoleEnum } from '../../application/dto/create-traveler.dto';

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

describe('CreateTravelerUseCase', () => {
  const validDto = {
    employeeId: 'EMP-001',
    name: 'Alice',
    email: 'alice@corp.com',
    department: 'Engineering',
    role: TravelerRoleEnum.EMPLOYEE,
  };

  it('should throw DuplicateEmployeeIdException when employeeId already exists', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findByEmployeeId.mockResolvedValue({} as Traveler);

    const useCase = new CreateTravelerUseCase(repository, cache, publisher);
    await expect(useCase.execute(validDto)).rejects.toBeInstanceOf(
      DuplicateEmployeeIdException,
    );
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('should create traveler, save, and publish TravelerCreated event', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findByEmployeeId.mockResolvedValue(null);
    repository.save.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new CreateTravelerUseCase(repository, cache, publisher);
    const result = await useCase.execute(validDto, 'corr-123');

    expect(repository.findByEmployeeId).toHaveBeenCalledWith(validDto.employeeId);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(result.employeeId).toBe(validDto.employeeId);
    expect(result.name).toBe(validDto.name);
  });

  it('should return a TravelerResponseDto with correct fields', async () => {
    const { repository, cache, publisher } = makeMocks();
    repository.findByEmployeeId.mockResolvedValue(null);
    repository.save.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new CreateTravelerUseCase(repository, cache, publisher);
    const result = await useCase.execute(validDto);

    expect(result).toMatchObject({
      employeeId: 'EMP-001',
      name: 'Alice',
      email: 'alice@corp.com',
      department: 'Engineering',
      role: 'EMPLOYEE',
    });
    expect(result.id).toBeDefined();
    expect(result.createdAt).toBeDefined();
  });
});
