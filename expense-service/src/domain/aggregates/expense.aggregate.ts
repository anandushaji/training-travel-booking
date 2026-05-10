import { AggregateRoot, DomainException, generateUuid } from '@travel/shared';
import { ExpenseStatus } from '../value-objects/expense-status.enum';
import { ExpenseCategory } from '../value-objects/expense-category.enum';

export interface ExpenseProps {
  id: string;
  bookingId: string;
  receiptId: string;
  travelerId: string;
  travelerName: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  description: string;
  expenseDate: Date;
  status: ExpenseStatus;
  cancelledAt?: Date;
}

export interface CreateExpenseProps {
  bookingId: string;
  receiptId: string;
  travelerId: string;
  travelerName: string;
  amount: number;
  currency?: string;
  category?: ExpenseCategory;
  description?: string;
  expenseDate: Date;
}

export class Expense extends AggregateRoot<ExpenseProps> {
  static create(props: CreateExpenseProps): Expense {
    const id = generateUuid();
    return new Expense({
      id,
      bookingId: props.bookingId,
      receiptId: props.receiptId,
      travelerId: props.travelerId,
      travelerName: props.travelerName,
      amount: props.amount,
      currency: props.currency ?? 'USD',
      category: props.category ?? ExpenseCategory.FLIGHT,
      description: props.description ?? 'Travel expense',
      expenseDate: props.expenseDate,
      status: ExpenseStatus.ACTIVE,
    });
  }

  get bookingId(): string {
    return this.props.bookingId;
  }

  get receiptId(): string {
    return this.props.receiptId;
  }

  get travelerId(): string {
    return this.props.travelerId;
  }

  get travelerName(): string {
    return this.props.travelerName;
  }

  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  get category(): ExpenseCategory {
    return this.props.category;
  }

  get description(): string {
    return this.props.description;
  }

  get expenseDate(): Date {
    return this.props.expenseDate;
  }

  get status(): ExpenseStatus {
    return this.props.status;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  cancel(cancelledAt: Date): void {
    if (this.props.status === ExpenseStatus.CANCELLED) {
      throw new DomainException(
        'Expense is already cancelled',
        'EXPENSE_ALREADY_CANCELLED',
        409,
      );
    }
    this.props.status = ExpenseStatus.CANCELLED;
    this.props.cancelledAt = cancelledAt;
  }
}
