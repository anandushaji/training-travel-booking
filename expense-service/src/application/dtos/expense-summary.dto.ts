export class ExpenseSummaryDto {
  fiscalYear!: number;
  totalExpenses!: number;
  totalCount!: number;
  byMonth!: { month: string; amount: number; count: number }[];
  byCategory!: Record<string, number>;
}
