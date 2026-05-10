import 'reflect-metadata';
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('typeorm');
import { getMetadataArgsStorage } from 'typeorm';
import { DepartmentalBudgetEntity } from './departmental-budget.entity';

describe('DepartmentalBudgetEntity', () => {
  it('has unique constraint on department+fiscalYear', () => {
    const storage = getMetadataArgsStorage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const uniques = (storage.uniques as any[]).filter(
      (u: any) => u.target === DepartmentalBudgetEntity,
    );
    const deptYearUnique = uniques.find(
      (u: any) =>
        Array.isArray(u.columns) &&
        (u.columns as string[]).includes('department') &&
        (u.columns as string[]).includes('fiscalYear'),
    );
    expect(deptYearUnique).toBeDefined();
  });

  it('is mapped to departmental_budgets table', () => {
    const storage = getMetadataArgsStorage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tableMeta = (storage.tables as any[]).find(
      (t: any) => t.target === DepartmentalBudgetEntity,
    );
    expect(tableMeta?.name).toBe('departmental_budgets');
  });
});
