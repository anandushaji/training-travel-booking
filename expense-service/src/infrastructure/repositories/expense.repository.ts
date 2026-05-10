import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, Repository } from 'typeorm';
import { Expense, ExpenseProps } from '../../domain/aggregates/expense.aggregate';
import { ExpenseEntity } from '../entities/expense.entity';
import { ExpenseStatus } from '../../domain/value-objects/expense-status.enum';
import { ExpenseCategory } from '../../domain/value-objects/expense-category.enum';

@Injectable()
export class ExpenseRepository {
  constructor(
    @InjectRepository(ExpenseEntity)
    private readonly repo: Repository<ExpenseEntity>,
  ) {}

  async save(expense: Expense, em?: EntityManager): Promise<void> {
    const entity = this.toEntity(expense);
    if (em) {
      await em.save(ExpenseEntity, entity);
    } else {
      await this.repo.save(entity);
    }
  }

  async findByTravelerId(
    travelerId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Expense[]> {
    const entities = await this.repo.find({
      where: {
        travelerId,
        expenseDate: Between(startDate, endDate),
      },
    });
    return entities.map((e) => this.toDomain(e));
  }

  async findByBookingId(bookingId: string): Promise<Expense | null> {
    const entity = await this.repo.findOneBy({ bookingId });
    return entity ? this.toDomain(entity) : null;
  }

  async findAll(startDate: Date, endDate: Date): Promise<Expense[]> {
    const entities = await this.repo.find({
      where: {
        expenseDate: Between(startDate, endDate),
      },
    });
    return entities.map((e) => this.toDomain(e));
  }

  private toEntity(expense: Expense): ExpenseEntity {
    const e = new ExpenseEntity();
    e.id = expense.id;
    e.bookingId = expense.bookingId;
    e.receiptId = expense.receiptId;
    e.travelerId = expense.travelerId;
    e.travelerName = expense.travelerName;
    e.amount = expense.amount;
    e.currency = expense.currency;
    e.category = expense.category;
    e.description = expense.description;
    e.expenseDate = expense.expenseDate;
    e.status = expense.status;
    if (expense.cancelledAt !== undefined) {
      e.cancelledAt = expense.cancelledAt;
    }
    return e;
  }

  private toDomain(e: ExpenseEntity): Expense {
    const props: ExpenseProps = {
      id: e.id,
      bookingId: e.bookingId,
      receiptId: e.receiptId,
      travelerId: e.travelerId,
      travelerName: e.travelerName,
      amount: Number(e.amount),
      currency: e.currency,
      category: e.category as ExpenseCategory,
      description: e.description,
      expenseDate: e.expenseDate,
      status: e.status as ExpenseStatus,
      ...(e.cancelledAt !== undefined && e.cancelledAt !== null ? { cancelledAt: e.cancelledAt } : {}),
    };
    return new Expense(props);
  }
}
