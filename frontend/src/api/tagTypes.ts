export const TAG_TYPES = [
  'BOOKING',
  'TRAVELER',
  'EXPENSE',
  'RECEIPT',
  'EXPENSE_REPORT',
  'FLIGHT',
  'POLICY',
  'PAYMENT_METHOD',
] as const;

export type TagType = (typeof TAG_TYPES)[number];
