import { http, HttpResponse } from 'msw';
import type { Receipt, ReceiptListResponse, ExpenseReport, ExpenseSummary } from '../../features/expenses/expense.types';

export const mockReceipt: Receipt = {
  id: 'receipt-test-1',
  receiptNumber: 'RCP-2026-001',
  bookingId: 'booking-test-1',
  traveler: {
    id: 'traveler-1',
    name: 'Alice Smith',
    email: 'alice@corp.com',
    employeeId: 'EMP-001',
  },
  booking: {
    id: 'booking-test-1',
    itinerary: {
      origin: 'JFK',
      destination: 'LAX',
      departureDate: '2026-06-01',
    },
  },
  amount: 450.00,
  currency: 'USD',
  breakdown: {
    basefare: 400.00,
    taxes: 40.00,
    fees: 10.00,
  },
  pdfUrl: 'https://s3.test/receipts/RCP-2026-001.pdf',
  generatedAt: '2026-06-01T12:00:00Z',
  createdAt: '2026-06-01T12:00:00Z',
};

const mockExpenseReport: ExpenseReport = {
  period: { startDate: '2026-01-01', endDate: '2026-12-31' },
  expenses: [
    {
      id: 'expense-test-1',
      bookingId: 'booking-test-1',
      receiptId: 'receipt-test-1',
      amount: 450.00,
      currency: 'USD',
      date: '2026-06-01',
      category: 'Flight',
      description: 'JFK to LAX round trip',
      approvalStatus: 'APPROVED',
    },
  ],
  summary: {
    totalAmount: 450.00,
    totalCount: 1,
    averageAmount: 450.00,
  },
};

const mockSummary: ExpenseSummary = {
  fiscalYear: 2026,
  totalExpenses: 450.00,
  totalCount: 1,
};

export const expenseHandlers = [
  http.get('http://localhost/api/receipts', () =>
    HttpResponse.json<ReceiptListResponse>({
      receipts: [mockReceipt],
      pagination: {
        currentPage: 1,
        totalPages: 1,
        totalItems: 1,
        limit: 20,
      },
    }),
  ),

  http.get('http://localhost/api/receipts/:id', () =>
    HttpResponse.json<Receipt>(mockReceipt),
  ),

  http.get('http://localhost/api/receipts/:id/download', () =>
    new HttpResponse(null, {
      status: 302,
      headers: { Location: 'https://s3.test/receipts/RCP-2026-001.pdf' },
    }),
  ),

  http.get('http://localhost/api/expenses', () =>
    HttpResponse.json<ExpenseReport>(mockExpenseReport),
  ),

  http.get('http://localhost/api/expenses/summary', () =>
    HttpResponse.json<ExpenseSummary>(mockSummary),
  ),
];
