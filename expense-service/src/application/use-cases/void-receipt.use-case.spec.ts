import { EntityManager } from 'typeorm';
import { VoidReceiptUseCase } from './void-receipt.use-case';
import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import { Expense } from '../../domain/aggregates/expense.aggregate';
import { ReceiptStatus } from '../../domain/value-objects/receipt-status.enum';
import { ExpenseStatus } from '../../domain/value-objects/expense-status.enum';

const em = {} as EntityManager;

function makeReceipt(): Receipt {
  return Receipt.create({
    receiptNumber: 'RCP-2026-000001',
    bookingId: 'booking-1',
    travelerId: 'traveler-1',
    travelerName: 'Alice Smith',
    travelerEmail: 'alice@example.com',
    amount: 450.0,
    origin: 'JFK',
    destination: 'LAX',
    departureDate: new Date('2026-06-01'),
  });
}

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

describe('VoidReceiptUseCase', () => {
  let useCase: VoidReceiptUseCase;
  let receiptRepo: { findByBookingId: jest.Mock; save: jest.Mock };
  let expenseRepo: { findByBookingId: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    receiptRepo = { findByBookingId: jest.fn(), save: jest.fn() };
    expenseRepo = { findByBookingId: jest.fn(), save: jest.fn() };
    useCase = new VoidReceiptUseCase(receiptRepo as any, expenseRepo as any);
  });

  it('voids receipt', async () => {
    const receipt = makeReceipt();
    receiptRepo.findByBookingId.mockResolvedValue(receipt);
    expenseRepo.findByBookingId.mockResolvedValue(null);

    await useCase.execute('booking-1', 'corr-1', em);

    expect(receipt.status).toBe(ReceiptStatus.VOIDED);
    expect(receipt.voidedAt).toBeDefined();
    expect(receiptRepo.save).toHaveBeenCalledWith(receipt, em);
  });

  it('cancels associated expense', async () => {
    const receipt = makeReceipt();
    const expense = makeExpense();
    receiptRepo.findByBookingId.mockResolvedValue(receipt);
    expenseRepo.findByBookingId.mockResolvedValue(expense);

    await useCase.execute('booking-1', 'corr-1', em);

    expect(expense.status).toBe(ExpenseStatus.CANCELLED);
    expect(expense.cancelledAt).toBeDefined();
    expect(expenseRepo.save).toHaveBeenCalledWith(expense, em);
  });

  it('no-op when receipt not found', async () => {
    receiptRepo.findByBookingId.mockResolvedValue(null);

    await expect(useCase.execute('booking-unknown', 'corr-1', em)).resolves.toBeUndefined();
    expect(receiptRepo.save).not.toHaveBeenCalled();
  });
});
