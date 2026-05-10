import { describe, it, expect } from 'vitest';
import { handlers } from '../../../mocks/handlers/index';
import { expenseHandlers } from '../../../mocks/handlers/expense.handlers';

describe('MSW handlers index — expenseHandlers included', () => {
  it('REQ-EXPENSES-05-S02: handlers array includes expense handler entries', () => {
    // Each expense handler must appear in the global handlers array
    for (const handler of expenseHandlers) {
      expect(handlers).toContain(handler);
    }
  });
});
