import { GetBudgetUseCase } from './get-budget.use-case';
import { DepartmentalBudgetRepository } from '../../infrastructure/repositories/departmental-budget.repository';
import { DepartmentalBudget } from '../../domain/aggregates/departmental-budget.aggregate';
import { NotFoundException } from '@travel/shared';

describe('GetBudgetUseCase', () => {
  let useCase: GetBudgetUseCase;
  let mockRepo: jest.Mocked<DepartmentalBudgetRepository>;

  beforeEach(() => {
    mockRepo = {
      findByDepartmentAndYear: jest.fn(),
    } as unknown as jest.Mocked<DepartmentalBudgetRepository>;

    useCase = new GetBudgetUseCase(mockRepo);
  });

  it('returns budget when found', async () => {
    const budget = DepartmentalBudget.create({
      department: 'Engineering',
      fiscalYear: 2026,
      totalBudget: 100000,
      currency: 'USD',
    });
    mockRepo.findByDepartmentAndYear.mockResolvedValueOnce(budget);

    const result = await useCase.execute('Engineering', 2026);
    expect(result.department).toBe('Engineering');
  });

  it('throws NotFoundException', async () => {
    mockRepo.findByDepartmentAndYear.mockResolvedValueOnce(null);
    await expect(useCase.execute('Engineering', 2026)).rejects.toBeInstanceOf(NotFoundException);
  });
});
