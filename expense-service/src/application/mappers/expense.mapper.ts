import { Expense } from '../../domain/aggregates/expense.aggregate';
import { ExpenseResponseDto } from '../dtos/expense-response.dto';

export class ExpenseMapper {
  static toDto(expense: Expense): ExpenseResponseDto {
    const dto = new ExpenseResponseDto();
    dto.id = expense.id;
    dto.bookingId = expense.bookingId;
    dto.receiptId = expense.receiptId;
    dto.travelerId = expense.travelerId;
    dto.travelerName = expense.travelerName;
    dto.amount = expense.amount;
    dto.currency = expense.currency;
    dto.category = expense.category;
    dto.description = expense.description;
    dto.expenseDate = expense.expenseDate instanceof Date
      ? expense.expenseDate.toISOString()
      : String(expense.expenseDate);
    dto.status = expense.status;
    if (expense.cancelledAt !== undefined) {
      dto.cancelledAt = expense.cancelledAt.toISOString();
    }
    return dto;
  }

  static toCsv(expenses: Expense[]): string {
    const header = 'id,bookingId,receiptId,travelerId,travelerName,amount,currency,category,description,expenseDate,status,cancelledAt';
    const rows = expenses.map((e) => {
      const cancelledAt = e.cancelledAt ? e.cancelledAt.toISOString() : '';
      const expenseDate = e.expenseDate instanceof Date
        ? e.expenseDate.toISOString()
        : String(e.expenseDate);
      return [
        e.id, e.bookingId, e.receiptId, e.travelerId, e.travelerName,
        e.amount, e.currency, e.category, `"${e.description}"`,
        expenseDate, e.status, cancelledAt,
      ].join(',');
    });
    return [header, ...rows].join('\n');
  }
}
