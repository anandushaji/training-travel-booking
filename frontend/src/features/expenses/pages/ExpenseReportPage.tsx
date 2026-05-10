import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useSelector } from 'react-redux';
import { selectUser } from '../../auth/authSlice';
import { useGetExpenseSummaryQuery, useGetExpenseReportQuery } from '../expenseApi';
import { Skeleton, Alert } from '../../../common/components';
import { DatePickerInput } from '../../../common/components/Form/DatePickerInput';

const currentYear = new Date().getFullYear();

// ─── helpers ─────────────────────────────────────────────────────────────────
function currency(amount: number) {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}

// ─── Summary stat card ────────────────────────────────────────────────────────
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card elevation={2}>
      <CardContent>
        <Typography variant="subtitle2" color="text.secondary">{label}</Typography>
        <Typography variant="h5" fontWeight={700}>{value}</Typography>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function ExpenseReportPage(): React.ReactElement {
  const user = useSelector(selectUser);

  // Report date range (ISO strings — DatePickerInput works with strings)
  const now = new Date();
  const [startDate, setStartDate] = useState<string | null>(
    new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0],
  );
  const [endDate, setEndDate] = useState<string | null>(
    now.toISOString().split('T')[0],
  );
  const [fiscalYear, setFiscalYear] = useState(currentYear);

  const summaryParams =
    user?.role === 'ADMIN'
      ? { fiscalYear }
      : { fiscalYear, department: user?.role === 'MANAGER' ? undefined : undefined };

  const reportParams = {
    startDate: startDate ?? '',
    endDate: endDate ?? '',
    groupBy: 'month' as const,
  };

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useGetExpenseSummaryQuery(summaryParams);

  const {
    data: report,
    isLoading: reportLoading,
    isError: reportError,
  } = useGetExpenseReportQuery(reportParams, {
    skip: !reportParams.startDate || !reportParams.endDate,
  });

  return (
    <Box data-testid="expense-report-page" sx={{ maxWidth: 1100, mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Expense Report
      </Typography>

      {/* ── Fiscal-year summary ─────────────────────────────────────────────── */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <Typography variant="subtitle1">Fiscal year:</Typography>
        <Select
          size="small"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(Number(e.target.value))}
          data-testid="fiscal-year-select"
        >
          {[currentYear, currentYear - 1, currentYear - 2].map((y) => (
            <MenuItem key={y} value={y}>{y}</MenuItem>
          ))}
        </Select>
      </Box>

      {summaryLoading && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton height={80} />
            </Grid>
          ))}
        </Grid>
      )}

      {summaryError && (
        <Alert severity="error" message="Could not load expense summary." />
      )}

      {summary && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Total Expenses"
                value={currency(summary.totalExpenses ?? 0)}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <StatCard
                label="Total Trips"
                value={String(summary.totalCount ?? 0)}
              />
            </Grid>
            {summary.byQuarter?.Q1 && (
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label="Q1 Spend"
                  value={currency(summary.byQuarter.Q1.amount)}
                />
              </Grid>
            )}
            {summary.byQuarter?.Q2 && (
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  label="Q2 Spend"
                  value={currency(summary.byQuarter.Q2.amount)}
                />
              </Grid>
            )}
          </Grid>

          {summary.topSpenders && summary.topSpenders.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                Top Spenders
              </Typography>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr">
                    {['Name', 'Trips', 'Total Spend'].map((h) => (
                      <Box
                        key={h}
                        component="th"
                        sx={{ textAlign: 'left', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        <Typography variant="subtitle2">{h}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {summary.topSpenders.map((s) => (
                    <Box component="tr" key={s.travelerId}>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{s.name}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{s.tripCount}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{currency(s.amount)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </>
      )}

      <Divider sx={{ my: 3 }} />

      {/* ── Detailed monthly report ─────────────────────────────────────────── */}
      <Typography variant="subtitle1" fontWeight={600} gutterBottom>
        Detailed Report
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <DatePickerInput
          name="reportStartDate"
          label="From"
          value={startDate}
          onChange={setStartDate}
          data-testid="report-start-date"
        />
        <DatePickerInput
          name="reportEndDate"
          label="To"
          value={endDate}
          onChange={setEndDate}
          data-testid="report-end-date"
        />
      </Box>

      {reportLoading && <Skeleton height={200} />}
      {reportError && <Alert severity="error" message="Could not load expense details." />}

      {report && (
        <>
          {report.summary?.byMonth && report.summary.byMonth.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>Monthly Breakdown</Typography>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr">
                    {['Month', 'Trips', 'Total'].map((h) => (
                      <Box
                        key={h}
                        component="th"
                        sx={{ textAlign: 'left', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        <Typography variant="subtitle2">{h}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {report.summary.byMonth.map((m) => (
                    <Box component="tr" key={m.month}>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{m.month}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{m.count}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{currency(m.amount)}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}

          {report.expenses.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              No expenses found for the selected period.
            </Typography>
          )}

          {report.expenses.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                Expense Transactions ({report.expenses.length})
              </Typography>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
                <Box component="thead">
                  <Box component="tr">
                    {['Date', 'Traveler', 'Category', 'Amount', 'Status'].map((h) => (
                      <Box
                        key={h}
                        component="th"
                        sx={{ textAlign: 'left', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}
                      >
                        <Typography variant="subtitle2">{h}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
                <Box component="tbody">
                  {report.expenses.map((e) => (
                    <Box component="tr" key={e.id}>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{e.date ?? '—'}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{e.traveler?.name ?? '—'}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{e.category ?? '—'}</Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">
                          {e.currency} {e.amount.toFixed(2)}
                        </Typography>
                      </Box>
                      <Box component="td" sx={{ p: 1 }}>
                        <Typography variant="body2">{e.approvalStatus ?? '—'}</Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
