import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { DepartmentalBudgetEntity } from '../entities/departmental-budget.entity';
import { DepartmentalBudget, DepartmentalBudgetProps } from '../../domain/aggregates/departmental-budget.aggregate';

@Injectable()
export class DepartmentalBudgetRepository {
  constructor(
    @InjectRepository(DepartmentalBudgetEntity)
    private readonly repo: Repository<DepartmentalBudgetEntity>,
  ) {}

  async findById(id: string): Promise<DepartmentalBudget | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByDepartmentAndYear(
    department: string,
    fiscalYear: number,
  ): Promise<DepartmentalBudget | null> {
    const entity = await this.repo.findOne({ where: { department, fiscalYear } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findAll(fiscalYear?: number): Promise<DepartmentalBudget[]> {
    const where: FindOptionsWhere<DepartmentalBudgetEntity> = {};
    if (fiscalYear !== undefined) where.fiscalYear = fiscalYear;
    const entities = await this.repo.find({ where });
    return entities.map((e) => this.toDomain(e));
  }

  async save(budget: DepartmentalBudget): Promise<DepartmentalBudget> {
    const entity = this.toEntity(budget);
    const saved = await this.repo.save(entity);
    return this.toDomain(saved);
  }

  private toDomain(entity: DepartmentalBudgetEntity): DepartmentalBudget {
    const props: DepartmentalBudgetProps = {
      id: entity.id,
      department: entity.department,
      fiscalYear: entity.fiscalYear,
      totalBudget: parseFloat(entity.totalBudget),
      spent: parseFloat(entity.spent),
      currency: entity.currency,
      q1Budget: entity.q1Budget !== null ? parseFloat(entity.q1Budget) : null,
      q2Budget: entity.q2Budget !== null ? parseFloat(entity.q2Budget) : null,
      q3Budget: entity.q3Budget !== null ? parseFloat(entity.q3Budget) : null,
      q4Budget: entity.q4Budget !== null ? parseFloat(entity.q4Budget) : null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return DepartmentalBudget.reconstitute(props);
  }

  private toEntity(budget: DepartmentalBudget): DepartmentalBudgetEntity {
    const entity = new DepartmentalBudgetEntity();
    entity.id = budget.id;
    entity.department = budget.department;
    entity.fiscalYear = budget.fiscalYear;
    entity.totalBudget = String(budget.totalBudget);
    entity.spent = String(budget.spent);
    entity.currency = budget.currency;
    entity.q1Budget = budget.q1Budget !== null ? String(budget.q1Budget) : null;
    entity.q2Budget = budget.q2Budget !== null ? String(budget.q2Budget) : null;
    entity.q3Budget = budget.q3Budget !== null ? String(budget.q3Budget) : null;
    entity.q4Budget = budget.q4Budget !== null ? String(budget.q4Budget) : null;
    entity.createdAt = budget.createdAt;
    entity.updatedAt = budget.updatedAt;
    return entity;
  }
}
