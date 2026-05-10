import { authHandlers } from './auth.handlers';
import { inventoryHandlers } from './inventory.handlers';
import { policyHandlers } from './policy.handlers';
import { bookingHandlers } from './booking.handlers';
import { travelerHandlers } from './traveler.handlers';
import { expenseHandlers } from './expense.handlers';

// Re-export msw helpers for convenience in tests
export { http, HttpResponse } from 'msw';

export const handlers = [...authHandlers, ...inventoryHandlers, ...policyHandlers, ...bookingHandlers, ...travelerHandlers, ...expenseHandlers];
