import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { DepartmentalBudgetRepository } from '../../infrastructure/repositories/departmental-budget.repository';
import { BudgetResponseDto } from '../dtos/budget-response.dto';
import { BudgetMapper } from '../mappers/budget.mapper';

@Injectable()
export class GetRemainingBudgetUseCase {
  constructor(private readonly budgetRepository: DepartmentalBudgetRepository) {}

  async execute(department: string, fiscalYear: number): Promise<BudgetResponseDto> {
    const budget = await this.budgetRepository.findByDepartmentAndYear(department, fiscalYear);
    if (!budget) {
      throw new NotFoundException(
        `Budget for department "${department}" and fiscal year "${fiscalYear}" not found`,
      );
    }
    return BudgetMapper.toDto(budget);
  }
}
