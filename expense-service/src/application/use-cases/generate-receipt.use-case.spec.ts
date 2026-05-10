import { EntityManager } from 'typeorm';
import { GenerateReceiptUseCase, BookingConfirmedData } from './generate-receipt.use-case';
import { ReceiptStatus } from '../../domain/value-objects/receipt-status.enum';
import { ExpenseStatus } from '../../domain/value-objects/expense-status.enum';
import { ExpenseCategory } from '../../domain/value-objects/expense-category.enum';

const mockData: BookingConfirmedData = {
  bookingId: 'booking-1',
  travelerId: 'traveler-1',
  travelerName: 'Alice Smith',
  travelerEmail: 'alice@example.com',
  totalAmount: 450.0,
  currency: 'USD',
  origin: 'JFK',
  destination: 'LAX',
  departureDate: '2026-06-01',
};

function makeMockEm(count = 0): EntityManager {
  return {
    count: jest.fn().mockResolvedValue(count),
  } as unknown as EntityManager;
}

describe('GenerateReceiptUseCase', () => {
  let useCase: GenerateReceiptUseCase;
  let receiptRepo: { save: jest.Mock; findById: jest.Mock; findByBookingId: jest.Mock; findByTravelerId: jest.Mock };
  let expenseRepo: { save: jest.Mock; findByTravelerId: jest.Mock; findByBookingId: jest.Mock; findAll: jest.Mock };

  beforeEach(() => {
    receiptRepo = { save: jest.fn(), findById: jest.fn(), findByBookingId: jest.fn(), findByTravelerId: jest.fn() };
    expenseRepo = { save: jest.fn(), findByTravelerId: jest.fn(), findByBookingId: jest.fn(), findAll: jest.fn() };
    useCase = new GenerateReceiptUseCase(receiptRepo as any, expenseRepo as any);
  });

  it('returns ACTIVE receipt', async () => {
    const em = makeMockEm(0);
    const { receipt } = await useCase.execute(mockData, 'corr-1', em);
    expect(receipt.status).toBe(ReceiptStatus.ACTIVE);
    expect(receipt.receiptNumber).toBeTruthy();
  });

  it('expense is ACTIVE with FLIGHT category and receiptId', async () => {
    const em = makeMockEm(0);
    const { receipt, expense } = await useCase.execute(mockData, 'corr-1', em);
    expect(expense.status).toBe(ExpenseStatus.ACTIVE);
    expect(expense.category).toBe(ExpenseCategory.FLIGHT);
    expect(expense.receiptId).toBe(receipt.id);
  });

  it('receiptNumber matches RCP-YYYY-NNNNNN pattern', async () => {
    const em = makeMockEm(0);
    const { receipt } = await useCase.execute(mockData, 'corr-1', em);
    expect(receipt.receiptNumber).toMatch(/^RCP-\d{4}-\d{6}$/);
    expect(receipt.receiptNumber).toContain(`RCP-${new Date().getFullYear()}-000001`);
  });

  it('sequence increments based on existing row count', async () => {
    const em = makeMockEm(99);
    const { receipt } = await useCase.execute(mockData, 'corr-2', em);
    expect(receipt.receiptNumber).toContain('000100');
  });

  it('defaults currency to USD when not provided', async () => {
    const em = makeMockEm(0);
    const dataWithoutCurrency: BookingConfirmedData = {
      bookingId: 'booking-2',
      travelerId: 'traveler-2',
      travelerName: 'Bob Jones',
      travelerEmail: 'bob@example.com',
      totalAmount: 300.0,
      origin: 'LAX',
      destination: 'ORD',
      departureDate: '2026-07-01',
    };
    const { receipt, expense } = await useCase.execute(dataWithoutCurrency, 'corr-3', em);
    expect(receipt.currency).toBe('USD');
    expect(expense.currency).toBe('USD');
  });
});
