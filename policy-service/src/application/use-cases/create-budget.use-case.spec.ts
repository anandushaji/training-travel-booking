import { CreateBudgetUseCase } from './create-budget.use-case';
import { DepartmentalBudgetRepository } from '../../infrastructure/repositories/departmental-budget.repository';
import { DepartmentalBudget } from '../../domain/aggregates/departmental-budget.aggregate';
import { ConflictException } from '@travel/shared';
import { QueryFailedError } from 'typeorm';

const baseProps = {
  department: 'Engineering',
  fiscalYear: 2026,
  totalBudget: 100000,
  currency: 'USD',
};

describe('CreateBudgetUseCase', () => {
  let useCase: CreateBudgetUseCase;
  let mockRepo: jest.Mocked<DepartmentalBudgetRepository>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
    } as unknown as jest.Mocked<DepartmentalBudgetRepository>;

    useCase = new CreateBudgetUseCase(mockRepo);
  });

  it('creates and returns budget', async () => {
    const budget = DepartmentalBudget.create(baseProps);
    mockRepo.save.mockResolvedValueOnce(budget);

    const result = await useCase.execute(baseProps);
    expect(result.department).toBe('Engineering');
    expect(result.spent).toBe(0);
  });

  it('throws ConflictException on duplicate (23505)', async () => {
    const dbError = new QueryFailedError('INSERT', [], new Error('duplicate key'));
    (dbError as any).code = '23505';
    mockRepo.save.mockRejectedValueOnce(dbError);

    await expect(useCase.execute(baseProps)).rejects.toBeInstanceOf(ConflictException);
  });

  it('rethrows non-duplicate errors', async () => {
    mockRepo.save.mockRejectedValueOnce(new Error('Connection lost'));
    await expect(useCase.execute(baseProps)).rejects.toThrow('Connection lost');
  });
});
