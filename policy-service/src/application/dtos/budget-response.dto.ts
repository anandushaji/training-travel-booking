export interface BudgetResponseDto {
  id: string;
  department: string;
  fiscalYear: number;
  totalBudget: number;
  spent: number;
  remaining: number;
  percentageUsed: number;
  currency: string;
  q1Budget: number | null;
  q2Budget: number | null;
  q3Budget: number | null;
  q4Budget: number | null;
  createdAt: string;
  updatedAt: string;
}
