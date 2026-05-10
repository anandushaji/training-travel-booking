import { ForbiddenException } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { ExpenseQueryService } from './expense-query.service';
import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import { Expense } from '../../domain/aggregates/expense.aggregate';
import { ExpenseQueryDto } from '../dtos/expense-query.dto';

function makeReceipt(travelerId = 'traveler-1'): Receipt {
  return Receipt.create({
    receiptNumber: 'RCP-2026-000001',
    bookingId: 'booking-1',
    travelerId,
    travelerName: 'Alice',
    travelerEmail: 'alice@example.com',
    amount: 450.0,
    origin: 'JFK',
    destination: 'LAX',
    departureDate: new Date('2026-06-01'),
  });
}

function makeExpense(travelerId = 'traveler-1', amount = 450.0): Expense {
  return Expense.create({
    bookingId: 'booking-1',
    receiptId: 'receipt-1',
    travelerId,
    travelerName: 'Alice',
    amount,
    expenseDate: new Date('2026-06-01'),
  });
}

describe('ExpenseQueryService', () => {
  let service: ExpenseQueryService;
  let receiptRepo: {
    findByTravelerId: jest.Mock;
    findById: jest.Mock;
    findByBookingId: jest.Mock;
    save: jest.Mock;
  };
  let expenseRepo: {
    findByTravelerId: jest.Mock;
    findByBookingId: jest.Mock;
    findAll: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(() => {
    receiptRepo = {
      findByTravelerId: jest.fn().mockResolvedValue([]),
      findById: jest.fn().mockResolvedValue(null),
      findByBookingId: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    expenseRepo = {
      findByTravelerId: jest.fn().mockResolvedValue([]),
      findByBookingId: jest.fn().mockResolvedValue(null),
      findAll: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
    };
    service = new ExpenseQueryService(receiptRepo as any, expenseRepo as any);
  });

  describe('getReceiptById', () => {
    it('throws NotFoundException when receipt does not exist', async () => {
      receiptRepo.findById.mockResolvedValue(null);
      await expect(service.getReceiptById('unknown', 'traveler-1', 'EMPLOYEE')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws ForbiddenException for wrong traveler', async () => {
      receiptRepo.findById.mockResolvedValue(makeReceipt('traveler-1'));
      await expect(
        service.getReceiptById('r-1', 'traveler-OTHER', 'EMPLOYEE'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('returns receipt when EMPLOYEE owns it', async () => {
      receiptRepo.findById.mockResolvedValue(makeReceipt('traveler-1'));
      const dto = await service.getReceiptById('r-1', 'traveler-1', 'EMPLOYEE');
      expect(dto.receiptNumber).toBe('RCP-2026-000001');
    });

    it('returns any receipt for MANAGER', async () => {
      receiptRepo.findById.mockResolvedValue(makeReceipt('traveler-1'));
      const dto = await service.getReceiptById('r-1', 'manager-1', 'MANAGER');
      expect(dto).toBeDefined();
    });
  });

  describe('getExpenses', () => {
    it('EMPLOYEE scoped to own travelerId', async () => {
      const query: ExpenseQueryDto = { startDate: '2026-01-01', endDate: '2026-12-31' };
      await service.getExpenses(query, 'traveler-1', 'EMPLOYEE');
      expect(expenseRepo.findByTravelerId).toHaveBeenCalledWith(
        'traveler-1',
        expect.any(Date),
        expect.any(Date),
      );
      expect(expenseRepo.findAll).not.toHaveBeenCalled();
    });

    it('MANAGER without travelerId queries all', async () => {
      const query: ExpenseQueryDto = { startDate: '2026-01-01', endDate: '2026-12-31' };
      await service.getExpenses(query, 'manager-1', 'MANAGER');
      expect(expenseRepo.findAll).toHaveBeenCalled();
    });

    it('MANAGER with travelerId filters by travelerId', async () => {
      const query: ExpenseQueryDto = { startDate: '2026-01-01', endDate: '2026-12-31', travelerId: 'traveler-2' };
      await service.getExpenses(query, 'manager-1', 'MANAGER');
      expect(expenseRepo.findByTravelerId).toHaveBeenCalledWith(
        'traveler-2',
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe('getExpenseSummary', () => {
    it('returns byMonth and byCategory', async () => {
      expenseRepo.findByTravelerId.mockResolvedValue([makeExpense()]);
      const summary = await service.getExpenseSummary(2026, 'traveler-1', 'EMPLOYEE');
      expect(Array.isArray(summary.byMonth)).toBe(true);
      expect(typeof summary.byCategory).toBe('object');
      expect(summary.byMonth.length).toBeGreaterThan(0);
    });

    it('returns empty byMonth and byCategory when no expenses', async () => {
      expenseRepo.findByTravelerId.mockResolvedValue([]);
      const summary = await service.getExpenseSummary(2026, 'traveler-1', 'EMPLOYEE');
      expect(summary.byMonth).toHaveLength(0);
      expect(Object.keys(summary.byCategory)).toHaveLength(0);
    });

    it('MANAGER role calls findAll', async () => {
      expenseRepo.findAll.mockResolvedValue([makeExpense('manager-1', 200)]);
      const summary = await service.getExpenseSummary(2026, 'manager-1', 'MANAGER');
      expect(expenseRepo.findAll).toHaveBeenCalled();
      expect(expenseRepo.findByTravelerId).not.toHaveBeenCalled();
      expect(summary.totalExpenses).toBe(200);
    });
  });

  describe('exportExpenses', () => {
    it('returns CSV with header', async () => {
      expenseRepo.findByTravelerId.mockResolvedValue([makeExpense()]);
      const query: ExpenseQueryDto = { startDate: '2026-01-01', endDate: '2026-12-31' };
      const csv = await service.exportExpenses(query, 'traveler-1', 'EMPLOYEE');
      expect(csv.split('\n')[0]).toContain('id');
    });

    it('MANAGER without travelerId calls findAll', async () => {
      expenseRepo.findAll.mockResolvedValue([makeExpense()]);
      const query: ExpenseQueryDto = { startDate: '2026-01-01', endDate: '2026-12-31' };
      await service.exportExpenses(query, 'manager-1', 'MANAGER');
      expect(expenseRepo.findAll).toHaveBeenCalled();
    });

    it('MANAGER with travelerId filters by travelerId', async () => {
      expenseRepo.findByTravelerId.mockResolvedValue([makeExpense('traveler-2')]);
      const query: ExpenseQueryDto = { startDate: '2026-01-01', endDate: '2026-12-31', travelerId: 'traveler-2' };
      await service.exportExpenses(query, 'manager-1', 'MANAGER');
      expect(expenseRepo.findByTravelerId).toHaveBeenCalledWith(
        'traveler-2',
        expect.any(Date),
        expect.any(Date),
      );
    });
  });

  describe('getCategories', () => {
    it('returns 5 CategoryResponseDto items', () => {
      const categories = service.getCategories();
      expect(categories).toHaveLength(5);
      for (const cat of categories) {
        expect(cat.id).toBeDefined();
        expect(cat.name).toBeDefined();
        expect(cat.description).toBeDefined();
        expect(cat.active).toBe(true);
      }
    });
  });

  describe('getReceipts', () => {
    it('returns receipts with pagination', async () => {
      receiptRepo.findByTravelerId.mockResolvedValue([makeReceipt()]);
      const result = await service.getReceipts('traveler-1', 'EMPLOYEE');
      expect(result.receipts).toHaveLength(1);
      expect(result.pagination.total).toBe(1);
    });
  });
});
