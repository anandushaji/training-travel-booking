import { ListBudgetsUseCase } from './list-budgets.use-case';
import { DepartmentalBudgetRepository } from '../../infrastructure/repositories/departmental-budget.repository';
import { DepartmentalBudget } from '../../domain/aggregates/departmental-budget.aggregate';

const baseProps = {
  department: 'Engineering',
  fiscalYear: 2026,
  totalBudget: 100000,
  currency: 'USD',
};

describe('ListBudgetsUseCase', () => {
  let useCase: ListBudgetsUseCase;
  let mockRepo: jest.Mocked<DepartmentalBudgetRepository>;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
    } as unknown as jest.Mocked<DepartmentalBudgetRepository>;

    useCase = new ListBudgetsUseCase(mockRepo);
  });

  it('returns mapped DTOs for all budgets', async () => {
    const budget = DepartmentalBudget.create(baseProps);
    mockRepo.findAll.mockResolvedValueOnce([budget]);

    const result = await useCase.execute();
    expect(result).toHaveLength(1);
    expect(result[0]!.department).toBe('Engineering');
    expect(mockRepo.findAll).toHaveBeenCalledWith(undefined);
  });

  it('passes fiscalYear filter to repository', async () => {
    mockRepo.findAll.mockResolvedValueOnce([]);

    await useCase.execute(2025);
    expect(mockRepo.findAll).toHaveBeenCalledWith(2025);
  });

  it('returns empty array when no budgets match', async () => {
    mockRepo.findAll.mockResolvedValueOnce([]);

    const result = await useCase.execute(9999);
    expect(result).toEqual([]);
  });
});
