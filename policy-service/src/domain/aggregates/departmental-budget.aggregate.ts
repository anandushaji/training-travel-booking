import { AggregateRoot, generateUuid } from '@travel/shared';

export interface DepartmentalBudgetProps {
  id: string;
  department: string;
  fiscalYear: number;
  totalBudget: number;
  spent: number;
  currency: string;
  q1Budget: number | null;
  q2Budget: number | null;
  q3Budget: number | null;
  q4Budget: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetProps {
  department: string;
  fiscalYear: number;
  totalBudget: number;
  currency: string;
  q1Budget?: number;
  q2Budget?: number;
  q3Budget?: number;
  q4Budget?: number;
}

export class DepartmentalBudget extends AggregateRoot<DepartmentalBudgetProps> {
  static create(props: CreateBudgetProps): DepartmentalBudget {
    const id = generateUuid();
    const now = new Date();
    const budgetProps: DepartmentalBudgetProps = {
      id,
      department: props.department,
      fiscalYear: props.fiscalYear,
      totalBudget: props.totalBudget,
      spent: 0,
      currency: props.currency,
      q1Budget: props.q1Budget ?? null,
      q2Budget: props.q2Budget ?? null,
      q3Budget: props.q3Budget ?? null,
      q4Budget: props.q4Budget ?? null,
      createdAt: now,
      updatedAt: now,
    };
    return new DepartmentalBudget(budgetProps);
  }

  static reconstitute(props: DepartmentalBudgetProps): DepartmentalBudget {
    return new DepartmentalBudget(props);
  }

  get department(): string {
    return this.props.department;
  }

  get fiscalYear(): number {
    return this.props.fiscalYear;
  }

  get totalBudget(): number {
    return this.props.totalBudget;
  }

  get spent(): number {
    return this.props.spent;
  }

  get currency(): string {
    return this.props.currency;
  }

  get q1Budget(): number | null {
    return this.props.q1Budget;
  }

  get q2Budget(): number | null {
    return this.props.q2Budget;
  }

  get q3Budget(): number | null {
    return this.props.q3Budget;
  }

  get q4Budget(): number | null {
    return this.props.q4Budget;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get remaining(): number {
    return this.props.totalBudget - this.props.spent;
  }

  get percentageUsed(): number {
    if (this.props.totalBudget === 0) return 0;
    return Math.round((this.props.spent / this.props.totalBudget) * 100 * 100) / 100;
  }
}
