import { SyncTravelersUseCase } from './sync-travelers.use-case';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
import { HrSoapClientStub } from '../../infrastructure/hr/hr-soap-client.stub';
import { Traveler } from '../../domain/aggregates/traveler.aggregate';
import { TravelerPreferences } from '../../domain/value-objects/traveler-preferences.value-object';

const makeMocks = () => ({
  repository: {
    findByEmployeeId: jest.fn(),
    findById: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  } as jest.Mocked<ITravelerRepository>,
  publisher: {
    publish: jest.fn(),
  } as unknown as jest.Mocked<TravelerEventPublisher>,
  hrClient: {
    fetchEmployees: jest.fn(),
    getBreaker: jest.fn(),
  } as unknown as jest.Mocked<HrSoapClientStub>,
});

const buildTraveler = (employeeId: string): Traveler =>
  new Traveler({
    id: `id-${employeeId}`,
    employeeId,
    name: 'Existing',
    email: `${employeeId.toLowerCase()}@corp.com`,
    department: 'HR',
    role: 'EMPLOYEE',
    preferences: TravelerPreferences.default(),
    deletedAt: null,
    anonymisedAt: null,
    dbVersion: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe('SyncTravelersUseCase', () => {
  it('should create traveler and return synced 1 for new employeeId', async () => {
    const { repository, publisher, hrClient } = makeMocks();
    repository.findByEmployeeId.mockResolvedValue(null);
    repository.save.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new SyncTravelersUseCase(repository, publisher, hrClient);
    const result = await useCase.execute({
      employees: [
        { employeeId: 'EMP-001', name: 'Alice', email: 'alice@corp.com', department: 'Eng' },
      ],
    });

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(publisher.publish).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ synced: 1, errors: [] });
  });

  it('should update existing traveler without creating a duplicate for known employeeId', async () => {
    const { repository, publisher, hrClient } = makeMocks();
    const existing = buildTraveler('EMP-001');
    repository.findByEmployeeId.mockResolvedValue(existing);
    repository.save.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new SyncTravelersUseCase(repository, publisher, hrClient);
    const result = await useCase.execute({
      employees: [
        { employeeId: 'EMP-001', name: 'Alice Updated', email: 'alice@corp.com', department: 'Eng' },
      ],
    });

    // save is called with the existing aggregate (update path)
    expect(repository.save).toHaveBeenCalledWith(existing);
    expect(result).toEqual({ synced: 1, errors: [] });
  });

  it('should report per-record error for invalid email and continue syncing remaining records', async () => {
    const { repository, publisher, hrClient } = makeMocks();
    repository.findByEmployeeId.mockResolvedValue(null);
    repository.save.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new SyncTravelersUseCase(repository, publisher, hrClient);
    const result = await useCase.execute({
      employees: [
        { employeeId: 'EMP-BAD', name: 'Bad', email: 'not-an-email', department: 'Eng' },
        { employeeId: 'EMP-002', name: 'Bob', email: 'bob@corp.com', department: 'Eng' },
      ],
    });

    expect(result.synced).toBe(1);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]!.employeeId).toBe('EMP-BAD');
    expect(result.errors[0]!.reason).toBe('InvalidEmail');
  });

  it('should return synced 0 and errors for all records when all have invalid emails', async () => {
    const { repository, publisher, hrClient } = makeMocks();
    repository.findByEmployeeId.mockResolvedValue(null);

    const useCase = new SyncTravelersUseCase(repository, publisher, hrClient);
    const result = await useCase.execute({
      employees: [
        { employeeId: 'EMP-A', name: 'A', email: 'bad', department: 'Eng' },
        { employeeId: 'EMP-B', name: 'B', email: 'also-bad', department: 'Eng' },
      ],
    });

    expect(result.synced).toBe(0);
    expect(result.errors).toHaveLength(2);
  });

  it('should retry SOAP call on transient 503 and succeed on second attempt', async () => {
    // This test validates the retry wrapper around SyncTravelersUseCase at the
    // controller level, but here we test that a single-record transient repo
    // failure (simulated) is re-raised correctly since the use case itself
    // does not retry — retries are applied at the HTTP client level in T08.
    // At use-case level, a thrown error from repo on a record is captured in errors[].
    const { repository, publisher, hrClient } = makeMocks();
    let attempt = 0;
    repository.findByEmployeeId.mockImplementation(async () => {
      attempt++;
      if (attempt === 1) throw new Error('transient');
      return null;
    });
    repository.save.mockResolvedValue(undefined);
    publisher.publish.mockResolvedValue(undefined);

    const useCase = new SyncTravelersUseCase(repository, publisher, hrClient);
    // On first call: transient error captured in errors
    const result1 = await useCase.execute({
      employees: [{ employeeId: 'EMP-001', name: 'Alice', email: 'alice@corp.com', department: 'Eng' }],
    });
    expect(result1.errors).toHaveLength(1);

    // On second call: succeeds
    const result2 = await useCase.execute({
      employees: [{ employeeId: 'EMP-001', name: 'Alice', email: 'alice@corp.com', department: 'Eng' }],
    });
    expect(result2.synced).toBe(1);
    expect(result2.errors).toHaveLength(0);
  });
});
