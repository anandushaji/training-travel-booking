import { Injectable } from '@nestjs/common';
import { DepartmentalBudgetRepository } from '../../infrastructure/repositories/departmental-budget.repository';
import { BudgetResponseDto } from '../dtos/budget-response.dto';
import { BudgetMapper } from '../mappers/budget.mapper';

@Injectable()
export class ListBudgetsUseCase {
  constructor(private readonly budgetRepository: DepartmentalBudgetRepository) {}

  async execute(fiscalYear?: number): Promise<BudgetResponseDto[]> {
    const budgets = await this.budgetRepository.findAll(fiscalYear);
    return budgets.map((b) => BudgetMapper.toDto(b));
  }
}
