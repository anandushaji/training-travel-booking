export const ROUTES = {
  DASHBOARD: '/',
  LOGIN: '/login',
  SEARCH: '/search',
  BOOKINGS_LIST: '/bookings',
  BOOKINGS: '/bookings',
  BOOKINGS_NEW: '/bookings/new',
  BOOKING_DETAIL: '/bookings/:id',
  BOOKING_CONFIRMATION: '/bookings/:id/confirmation',
  PROFILE: '/profile',
  EXPENSES: '/expenses',
  EXPENSE_REPORT: '/expenses/report',
  RECEIPT_DETAIL: '/expenses/receipts/:receiptId',
  ADMIN_TRAVELERS: '/admin/travelers',
  ADMIN_TRAVELER_DETAIL: '/admin/travelers/:travelerId',
} as const;

export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

export const PUBLIC_ROUTES: RoutePath[] = [ROUTES.LOGIN];
