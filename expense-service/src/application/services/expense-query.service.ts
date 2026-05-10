import { ForbiddenException, Injectable } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { ReceiptRepository } from '../../infrastructure/repositories/receipt.repository';
import { ExpenseRepository } from '../../infrastructure/repositories/expense.repository';
import { ReceiptMapper } from '../mappers/receipt.mapper';
import { ExpenseMapper } from '../mappers/expense.mapper';
import { ReceiptResponseDto, PaginationDto } from '../dtos/receipt-response.dto';
import { ExpenseResponseDto } from '../dtos/expense-response.dto';
import { ExpenseQueryDto } from '../dtos/expense-query.dto';
import { ExpenseSummaryDto } from '../dtos/expense-summary.dto';
import { CategoryResponseDto } from '../dtos/category-response.dto';

const CATEGORIES: CategoryResponseDto[] = [
  { id: 'flight', name: 'Flight', description: 'Airfare expenses', active: true },
  { id: 'hotel', name: 'Hotel', description: 'Accommodation expenses', active: true },
  { id: 'car-rental', name: 'Car Rental', description: 'Vehicle rental', active: true },
  { id: 'meal', name: 'Meal', description: 'Meal and food expenses', active: true },
  { id: 'other', name: 'Other', description: 'Other business expenses', active: true },
];

@Injectable()
export class ExpenseQueryService {
  constructor(
    private readonly receiptRepo: ReceiptRepository,
    private readonly expenseRepo: ExpenseRepository,
  ) {}

  async getReceipts(
    travelerId: string,
    role: string,
    page = 1,
    limit = 20,
  ): Promise<{ receipts: ReceiptResponseDto[]; pagination: PaginationDto }> {
    const receipts = await this.receiptRepo.findByTravelerId(travelerId);
    const total = receipts.length;
    const start = (page - 1) * limit;
    const paged = receipts.slice(start, start + limit);
    return {
      receipts: paged.map((r) => ReceiptMapper.toDto(r)),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getReceiptById(
    id: string,
    requestingTravelerId: string,
    role: string,
  ): Promise<ReceiptResponseDto> {
    const receipt = await this.receiptRepo.findById(id);
    if (!receipt) {
      throw new NotFoundException(`Receipt ${id} not found`);
    }
    if (role === 'EMPLOYEE' && receipt.travelerId !== requestingTravelerId) {
      throw new ForbiddenException('Access denied to this receipt');
    }
    return ReceiptMapper.toDto(receipt);
  }

  async getExpenses(
    query: ExpenseQueryDto,
    travelerId: string,
    role: string,
  ): Promise<{ expenses: ExpenseResponseDto[]; summary: { totalAmount: number; count: number } }> {
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);

    let expenses;
    if (role === 'EMPLOYEE') {
      // EMPLOYEE can only see own expenses
      expenses = await this.expenseRepo.findByTravelerId(travelerId, startDate, endDate);
    } else {
      // MANAGER/ADMIN: filter by travelerId if supplied, else all
      if (query.travelerId) {
        expenses = await this.expenseRepo.findByTravelerId(query.travelerId, startDate, endDate);
      } else {
        expenses = await this.expenseRepo.findAll(startDate, endDate);
      }
    }

    const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
    return {
      expenses: expenses.map((e) => ExpenseMapper.toDto(e)),
      summary: { totalAmount, count: expenses.length },
    };
  }

  async getExpenseSummary(
    fiscalYear: number,
    travelerId: string,
    role: string,
  ): Promise<ExpenseSummaryDto> {
    const startDate = new Date(`${fiscalYear}-01-01`);
    const endDate = new Date(`${fiscalYear}-12-31`);

    let expenses;
    if (role === 'EMPLOYEE') {
      expenses = await this.expenseRepo.findByTravelerId(travelerId, startDate, endDate);
    } else {
      expenses = await this.expenseRepo.findAll(startDate, endDate);
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

    // byMonth: aggregate by YYYY-MM
    const byMonthMap = new Map<string, { amount: number; count: number }>();
    for (const e of expenses) {
      const d = e.expenseDate instanceof Date ? e.expenseDate : new Date(e.expenseDate);
      const month = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const existing = byMonthMap.get(month) ?? { amount: 0, count: 0 };
      byMonthMap.set(month, { amount: existing.amount + e.amount, count: existing.count + 1 });
    }
    const byMonth = Array.from(byMonthMap.entries()).map(([month, v]) => ({
      month,
      amount: v.amount,
      count: v.count,
    }));

    // byCategory: Record<category, totalAmount>
    const byCategory: Record<string, number> = {};
    for (const e of expenses) {
      byCategory[e.category] = (byCategory[e.category] ?? 0) + e.amount;
    }

    return {
      fiscalYear,
      totalExpenses,
      totalCount: expenses.length,
      byMonth,
      byCategory,
    };
  }

  async exportExpenses(
    query: ExpenseQueryDto,
    travelerId: string,
    role: string,
  ): Promise<string> {
    const { expenses: dtos } = await this.getExpenses(query, travelerId, role);
    // Reconstruct domain objects for mapper (or just format CSV from DTOs)
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    let expenses;
    if (role === 'EMPLOYEE') {
      expenses = await this.expenseRepo.findByTravelerId(travelerId, startDate, endDate);
    } else {
      if (query.travelerId) {
        expenses = await this.expenseRepo.findByTravelerId(query.travelerId, startDate, endDate);
      } else {
        expenses = await this.expenseRepo.findAll(startDate, endDate);
      }
    }
    return ExpenseMapper.toCsv(expenses);
  }

  getCategories(): CategoryResponseDto[] {
    return CATEGORIES;
  }
}
