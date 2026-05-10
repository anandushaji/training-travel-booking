import { DomainException } from '@travel/shared';
import { Expense } from './expense.aggregate';
import { ExpenseStatus } from '../value-objects/expense-status.enum';
import { ExpenseCategory } from '../value-objects/expense-category.enum';

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

describe('Expense aggregate', () => {
  describe('create', () => {
    it('create - ACTIVE with FLIGHT category', () => {
      const expense = makeExpense();
      expect(expense.status).toBe(ExpenseStatus.ACTIVE);
      expect(expense.category).toBe(ExpenseCategory.FLIGHT);
    });

    it('sets bookingId and receiptId', () => {
      const expense = makeExpense();
      expect(expense.bookingId).toBe('booking-1');
      expect(expense.receiptId).toBe('receipt-1');
    });

    it('defaults currency to USD when not provided', () => {
      expect(makeExpense().currency).toBe('USD');
    });

    it('accepts a custom category', () => {
      const expense = Expense.create({
        bookingId: 'b',
        receiptId: 'r',
        travelerId: 't',
        travelerName: 'Bob',
        amount: 50,
        expenseDate: new Date(),
        category: ExpenseCategory.MEAL,
      });
      expect(expense.category).toBe(ExpenseCategory.MEAL);
    });
  });

  describe('cancel', () => {
    it('cancel - transitions to CANCELLED with cancelledAt', () => {
      const expense = makeExpense();
      const cancelledAt = new Date();
      expense.cancel(cancelledAt);
      expect(expense.status).toBe(ExpenseStatus.CANCELLED);
      expect(expense.cancelledAt).toBe(cancelledAt);
    });

    it('cancel - throws DomainException when already CANCELLED', () => {
      const expense = makeExpense();
      expense.cancel(new Date());
      expect(() => expense.cancel(new Date())).toThrow(DomainException);
    });
  });
});
