import { GetRemainingBudgetUseCase } from './get-remaining-budget.use-case';
import { DepartmentalBudgetRepository } from '../../infrastructure/repositories/departmental-budget.repository';
import { DepartmentalBudget } from '../../domain/aggregates/departmental-budget.aggregate';
import { NotFoundException } from '@travel/shared';
import { generateUuid } from '@travel/shared';

describe('GetRemainingBudgetUseCase', () => {
  let useCase: GetRemainingBudgetUseCase;
  let mockRepo: jest.Mocked<DepartmentalBudgetRepository>;

  beforeEach(() => {
    mockRepo = {
      findByDepartmentAndYear: jest.fn(),
    } as unknown as jest.Mocked<DepartmentalBudgetRepository>;

    useCase = new GetRemainingBudgetUseCase(mockRepo);
  });

  it('remaining equals totalBudget minus spent', async () => {
    const budget = DepartmentalBudget.reconstitute({
      id: generateUuid(),
      department: 'Engineering',
      fiscalYear: 2026,
      totalBudget: 100000,
      spent: 40000,
      currency: 'USD',
      q1Budget: null,
      q2Budget: null,
      q3Budget: null,
      q4Budget: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockRepo.findByDepartmentAndYear.mockResolvedValueOnce(budget);

    const result = await useCase.execute('Engineering', 2026);
    expect(result.remaining).toBe(60000);
    expect(result.spent).toBe(40000);
    expect(result.totalBudget).toBe(100000);
  });

  it('throws NotFoundException when budget not found', async () => {
    mockRepo.findByDepartmentAndYear.mockResolvedValueOnce(null);
    await expect(useCase.execute('Engineering', 2026)).rejects.toBeInstanceOf(NotFoundException);
  });
});
