import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  Receipt,
  Expense,
  ExpenseReport,
  ExpenseSummary,
  ExpenseApprovalStatus,
  ReceiptListResponse,
} from './expense.types';

describe('expense.types — all exported interfaces satisfy expected shape', () => {
  it('Receipt has required fields', () => {
    expectTypeOf<Receipt>().toMatchTypeOf<{
      id: string;
      receiptNumber: string;
      bookingId: string;
      amount: number;
      currency: string;
      pdfUrl: string;
    }>();
  });

  it('Receipt optional fields are T | undefined', () => {
    expectTypeOf<Receipt['breakdown']>().toEqualTypeOf<
      { basefare?: number | undefined; taxes?: number | undefined; fees?: number | undefined } | undefined
    >();
    expectTypeOf<Receipt['generatedAt']>().toEqualTypeOf<string | undefined>();
  });

  it('Expense has required fields', () => {
    expectTypeOf<Expense>().toMatchTypeOf<{
      id: string;
      amount: number;
      currency: string;
    }>();
  });

  it('ExpenseApprovalStatus is correct union', () => {
    expectTypeOf<ExpenseApprovalStatus>().toEqualTypeOf<'PENDING' | 'APPROVED' | 'REJECTED'>();
  });

  it('ExpenseReport has expenses array', () => {
    expectTypeOf<ExpenseReport>().toMatchTypeOf<{
      expenses: Expense[];
    }>();
  });

  it('ExpenseSummary all fields are optional', () => {
    const summary: ExpenseSummary = {};
    expect(summary).toBeDefined();
  });

  it('ReceiptListResponse has receipts array and pagination', () => {
    expectTypeOf<ReceiptListResponse>().toMatchTypeOf<{
      receipts: Receipt[];
      pagination: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        limit: number;
      };
    }>();
  });
});
