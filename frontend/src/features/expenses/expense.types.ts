export type ExpenseApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ReceiptTraveler {
  id: string;
  name: string;
  email: string;
  employeeId?: string | undefined;
}

export interface ReceiptBooking {
  id: string;
  itinerary?: {
    origin?: string | undefined;
    destination?: string | undefined;
    departureDate?: string | undefined;
    returnDate?: string | undefined;
  } | undefined;
}

export interface ReceiptBreakdown {
  basefare?: number | undefined;
  taxes?: number | undefined;
  fees?: number | undefined;
}

export interface Receipt {
  id: string;
  receiptNumber: string;
  bookingId: string;
  traveler?: ReceiptTraveler | undefined;
  booking?: ReceiptBooking | undefined;
  amount: number;
  currency: string;
  breakdown?: ReceiptBreakdown | undefined;
  pdfUrl: string;
  generatedAt?: string | undefined;
  createdAt?: string | undefined;
}

export interface ReceiptListResponse {
  receipts: Receipt[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    limit: number;
  };
}

export interface ExpenseTraveler {
  id: string;
  name: string;
  department?: string | undefined;
  employeeId?: string | undefined;
}

export interface ExpenseTrip {
  origin?: string | undefined;
  destination?: string | undefined;
  purpose?: string | undefined;
}

export interface Expense {
  id: string;
  bookingId?: string | undefined;
  receiptId?: string | undefined;
  traveler?: ExpenseTraveler | undefined;
  amount: number;
  currency: string;
  date?: string | undefined;
  category?: string | undefined;
  description?: string | undefined;
  trip?: ExpenseTrip | undefined;
  approvalStatus?: ExpenseApprovalStatus | undefined;
  approvedBy?: string | undefined;
  approvedAt?: string | undefined;
  createdAt?: string | undefined;
}

export interface ExpenseReportSummary {
  totalAmount: number;
  totalCount: number;
  averageAmount?: number | undefined;
  byCategory?: Record<string, number> | undefined;
  byDepartment?: Record<string, number> | undefined;
  byMonth?: Array<{ month: string; amount: number; count: number }> | undefined;
}

export interface ExpenseReport {
  reportId?: string | undefined;
  period?: {
    startDate: string;
    endDate: string;
  } | undefined;
  expenses: Expense[];
  summary?: ExpenseReportSummary | undefined;
  generatedAt?: string | undefined;
}

export interface ExpenseByQuarter {
  amount: number;
  count: number;
}

export interface ExpenseSummary {
  fiscalYear?: number | undefined;
  department?: string | undefined;
  totalExpenses?: number | undefined;
  totalCount?: number | undefined;
  byQuarter?: {
    Q1?: ExpenseByQuarter | undefined;
    Q2?: ExpenseByQuarter | undefined;
    Q3?: ExpenseByQuarter | undefined;
    Q4?: ExpenseByQuarter | undefined;
  } | undefined;
  topSpenders?: Array<{
    travelerId: string;
    name: string;
    amount: number;
    tripCount: number;
  }> | undefined;
  trends?: {
    monthOverMonth?: number | undefined;
    yearOverYear?: number | undefined;
  } | undefined;
}

export interface ExpenseReportParams {
  startDate: string;
  endDate: string;
  department?: string | undefined;
  travelerId?: string | undefined;
  groupBy?: 'department' | 'traveler' | 'month' | 'category' | undefined;
}

export interface ExpenseSummaryParams {
  fiscalYear?: number | undefined;
  department?: string | undefined;
}

export interface ListReceiptsParams {
  bookingId?: string | undefined;
  travelerId?: string | undefined;
  department?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
  page?: number | undefined;
  limit?: number | undefined;
}
