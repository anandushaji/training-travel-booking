import { Injectable } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import { ConflictException } from '@travel/shared';
import { DepartmentalBudget } from '../../domain/aggregates/departmental-budget.aggregate';
import { DepartmentalBudgetRepository } from '../../infrastructure/repositories/departmental-budget.repository';
import { CreateBudgetDto } from '../dtos/create-budget.dto';
import { BudgetResponseDto } from '../dtos/budget-response.dto';
import { BudgetMapper } from '../mappers/budget.mapper';

@Injectable()
export class CreateBudgetUseCase {
  constructor(private readonly budgetRepository: DepartmentalBudgetRepository) {}

  async execute(dto: CreateBudgetDto): Promise<BudgetResponseDto> {
    const budget = DepartmentalBudget.create({
      department: dto.department,
      fiscalYear: dto.fiscalYear,
      totalBudget: dto.totalBudget,
      currency: dto.currency,
      ...(dto.q1Budget !== undefined && { q1Budget: dto.q1Budget }),
      ...(dto.q2Budget !== undefined && { q2Budget: dto.q2Budget }),
      ...(dto.q3Budget !== undefined && { q3Budget: dto.q3Budget }),
      ...(dto.q4Budget !== undefined && { q4Budget: dto.q4Budget }),
    });

    let saved: DepartmentalBudget;
    try {
      saved = await this.budgetRepository.save(budget);
    } catch (err) {
      if (
        err instanceof QueryFailedError &&
        (err as any).code === '23505'
      ) {
        throw new ConflictException(
          'Budget already exists for this department and fiscal year',
          'BUDGET_ALREADY_EXISTS',
        );
      }
      throw err;
    }

    return BudgetMapper.toDto(saved);
  }
}
