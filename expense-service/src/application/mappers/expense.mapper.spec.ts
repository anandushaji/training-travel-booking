import { Expense } from '../../domain/aggregates/expense.aggregate';
import { ExpenseMapper } from './expense.mapper';

function makeExpense(): Expense {
  return Expense.create({
    bookingId: 'booking-1',
    receiptId: 'receipt-1',
    travelerId: 'traveler-1',
    travelerName: 'Alice Smith',
    amount: 450.0,
    expenseDate: new Date('2026-06-01'),
  });
}

describe('ExpenseMapper', () => {
  it('toDto maps all required fields', () => {
    const expense = makeExpense();
    const dto = ExpenseMapper.toDto(expense);

    expect(dto.id).toBe(expense.id);
    expect(dto.bookingId).toBe('booking-1');
    expect(dto.receiptId).toBe('receipt-1');
    expect(dto.travelerId).toBe('traveler-1');
    expect(dto.travelerName).toBe('Alice Smith');
    expect(dto.amount).toBe(450.0);
    expect(dto.currency).toBe('USD');
    expect(dto.category).toBe('FLIGHT');
    expect(dto.status).toBe('ACTIVE');
    expect(dto.cancelledAt).toBeUndefined();
  });

  it('includes cancelledAt when cancelled', () => {
    const expense = makeExpense();
    const cancelledAt = new Date();
    expense.cancel(cancelledAt);
    const dto = ExpenseMapper.toDto(expense);
    expect(dto.cancelledAt).toBe(cancelledAt.toISOString());
  });

  it('toCsv has header row', () => {
    const expenses = [makeExpense()];
    const csv = ExpenseMapper.toCsv(expenses);
    const lines = csv.split('\n');
    expect(lines[0]).toContain('id');
    expect(lines[0]).toContain('bookingId');
    expect(lines[0]).toContain('amount');
    expect(lines.length).toBeGreaterThan(1);
  });

  it('toDto uses String() when expenseDate is not a Date', () => {
    const expense = makeExpense();
    (expense as any).props.expenseDate = '2026-06-01' as any;
    const dto = ExpenseMapper.toDto(expense);
    expect(dto.expenseDate).toBe('2026-06-01');
  });

  it('toCsv includes cancelledAt when expense is cancelled', () => {
    const expense = makeExpense();
    const cancelledAt = new Date('2026-07-01');
    expense.cancel(cancelledAt);
    const csv = ExpenseMapper.toCsv([expense]);
    expect(csv).toContain(cancelledAt.toISOString());
  });

  it('toCsv uses String() when expenseDate is not a Date', () => {
    const expense = makeExpense();
    (expense as any).props.expenseDate = '2026-06-01' as any;
    const csv = ExpenseMapper.toCsv([expense]);
    expect(csv).toContain('2026-06-01');
  });
});
