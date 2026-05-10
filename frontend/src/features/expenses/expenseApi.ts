import { baseApi } from '../../api/baseApi';
import type {
  Receipt,
  ReceiptListResponse,
  ListReceiptsParams,
  ExpenseReport,
  ExpenseReportParams,
  ExpenseSummary,
  ExpenseSummaryParams,
} from './expense.types';

export const expenseApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listReceipts: build.query<ReceiptListResponse, ListReceiptsParams | void>({
      query: (params) => ({
        url: '/receipts',
        params: params ?? {},
      }),
      keepUnusedDataFor: 86400,
      providesTags: ['RECEIPT'],
    }),

    getReceiptById: build.query<Receipt, string>({
      query: (id) => ({ url: `/receipts/${id}` }),
      keepUnusedDataFor: 86400,
      providesTags: (_result, _error, id) => [{ type: 'RECEIPT', id }],
    }),

    getExpenseReport: build.query<ExpenseReport, ExpenseReportParams>({
      query: ({ startDate, endDate, department, travelerId, groupBy }) => ({
        url: '/expenses',
        params: {
          startDate,
          endDate,
          ...(department ? { department } : {}),
          ...(travelerId ? { travelerId } : {}),
          ...(groupBy ? { groupBy } : {}),
        },
      }),
      keepUnusedDataFor: 60,
      providesTags: ['EXPENSE_REPORT'],
    }),

    getExpenseSummary: build.query<ExpenseSummary, ExpenseSummaryParams | void>({
      query: (params) => ({
        url: '/expenses/summary',
        params: params ?? {},
      }),
      keepUnusedDataFor: 60,
      providesTags: ['EXPENSE_REPORT'],
    }),
  }),
  overrideExisting: false,
});

export const {
  useListReceiptsQuery,
  useGetReceiptByIdQuery,
  useGetExpenseReportQuery,
  useGetExpenseSummaryQuery,
} = expenseApi;
