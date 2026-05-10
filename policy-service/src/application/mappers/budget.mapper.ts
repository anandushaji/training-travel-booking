import { DepartmentalBudget } from '../../domain/aggregates/departmental-budget.aggregate';
import { BudgetResponseDto } from '../dtos/budget-response.dto';

export class BudgetMapper {
  static toDto(budget: DepartmentalBudget): BudgetResponseDto {
    return {
      id: budget.id,
      department: budget.department,
      fiscalYear: budget.fiscalYear,
      totalBudget: budget.totalBudget,
      spent: budget.spent,
      remaining: budget.remaining,
      percentageUsed: budget.percentageUsed,
      currency: budget.currency,
      q1Budget: budget.q1Budget,
      q2Budget: budget.q2Budget,
      q3Budget: budget.q3Budget,
      q4Budget: budget.q4Budget,
      createdAt: budget.createdAt.toISOString(),
      updatedAt: budget.updatedAt.toISOString(),
    };
  }
}
