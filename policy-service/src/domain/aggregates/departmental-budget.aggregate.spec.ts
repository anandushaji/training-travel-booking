import { DepartmentalBudget } from './departmental-budget.aggregate';

const baseProps = {
  department: 'Engineering',
  fiscalYear: 2026,
  totalBudget: 100000,
  currency: 'USD',
};

describe('DepartmentalBudget aggregate', () => {
  describe('create', () => {
    it('initialises spent to 0', () => {
      const budget = DepartmentalBudget.create(baseProps);
      expect(budget.spent).toBe(0);
    });

    it('sets department and fiscalYear', () => {
      const budget = DepartmentalBudget.create(baseProps);
      expect(budget.department).toBe('Engineering');
      expect(budget.fiscalYear).toBe(2026);
    });

    it('sets quarterly budgets to null when not provided', () => {
      const budget = DepartmentalBudget.create(baseProps);
      expect(budget.q1Budget).toBeNull();
      expect(budget.q2Budget).toBeNull();
      expect(budget.q3Budget).toBeNull();
      expect(budget.q4Budget).toBeNull();
    });

    it('sets quarterly budgets when provided', () => {
      const budget = DepartmentalBudget.create({
        ...baseProps,
        q1Budget: 25000,
        q2Budget: 25000,
        q3Budget: 25000,
        q4Budget: 25000,
      });
      expect(budget.q1Budget).toBe(25000);
    });
  });

  describe('remaining', () => {
    it('returns totalBudget minus spent', () => {
      const budget = DepartmentalBudget.reconstitute({
        id: 'some-uuid',
        department: 'Engineering',
        fiscalYear: 2026,
        totalBudget: 100000,
        spent: 30000,
        currency: 'USD',
        q1Budget: null,
        q2Budget: null,
        q3Budget: null,
        q4Budget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(budget.remaining).toBe(70000);
    });

    it('returns totalBudget when spent is 0', () => {
      const budget = DepartmentalBudget.create(baseProps);
      expect(budget.remaining).toBe(100000);
    });
  });

  describe('percentageUsed', () => {
    it('rounds to 2 decimal places', () => {
      const budget = DepartmentalBudget.reconstitute({
        id: 'some-uuid',
        department: 'Engineering',
        fiscalYear: 2026,
        totalBudget: 3,
        spent: 1,
        currency: 'USD',
        q1Budget: null,
        q2Budget: null,
        q3Budget: null,
        q4Budget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      // 1/3 * 100 = 33.333... → rounds to 33.33
      expect(budget.percentageUsed).toBe(33.33);
    });

    it('returns 0 when totalBudget is 0', () => {
      const budget = DepartmentalBudget.reconstitute({
        id: 'some-uuid',
        department: 'Engineering',
        fiscalYear: 2026,
        totalBudget: 0,
        spent: 0,
        currency: 'USD',
        q1Budget: null,
        q2Budget: null,
        q3Budget: null,
        q4Budget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(budget.percentageUsed).toBe(0);
    });

    it('returns 50 when half spent', () => {
      const budget = DepartmentalBudget.reconstitute({
        id: 'some-uuid',
        department: 'Engineering',
        fiscalYear: 2026,
        totalBudget: 100000,
        spent: 50000,
        currency: 'USD',
        q1Budget: null,
        q2Budget: null,
        q3Budget: null,
        q4Budget: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      expect(budget.percentageUsed).toBe(50);
    });
  });
});
