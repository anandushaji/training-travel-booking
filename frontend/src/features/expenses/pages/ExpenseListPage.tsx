import React, { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectUser } from '../../auth/authSlice';
import { useListReceiptsQuery } from '../expenseApi';
import { ExpenseList } from '../components/ExpenseList';
import { Skeleton, Alert } from '../../../common/components';
import { DatePickerInput } from '../../../common/components/Form/DatePickerInput';
import { TextInput } from '../../../common/components/Form/TextInput';

const PAGE_LIMIT = 10;

export function ExpenseListPage(): React.ReactElement {
  const user = useSelector(selectUser);
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [page, setPage] = useState(1);
  const [startDate, setStartDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [department, setDepartment] = useState('');

  const queryParams = isAdminOrManager
    ? {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(department ? { department } : {}),
        page,
        limit: PAGE_LIMIT,
      }
    : { travelerId: user?.id ?? '', page, limit: PAGE_LIMIT };

  const { data, isLoading, isError } = useListReceiptsQuery(queryParams);

  const pagination = data?.pagination;

  if (isLoading) {
    return (
      <Box data-testid="expense-list-page" sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
        <Skeleton height={60} />
        <Skeleton height={60} />
        <Skeleton height={60} />
      </Box>
    );
  }

  return (
    <Box data-testid="expense-list-page" sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>My Expenses</Typography>

      {isAdminOrManager && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Box data-testid="filter-start-date">
            <DatePickerInput
              name="startDate"
              label="Start Date"
              value={startDate}
              onChange={(d) => { setStartDate(d); setPage(1); }}
            />
          </Box>
          <Box data-testid="filter-end-date">
            <DatePickerInput
              name="endDate"
              label="End Date"
              value={endDate}
              onChange={(d) => { setEndDate(d); setPage(1); }}
            />
          </Box>
          <TextInput
            name="department"
            label="Department"
            value={department}
            onChange={(e) => { setDepartment(e.target.value); setPage(1); }}
            data-testid="filter-department"
          />
        </Box>
      )}

      {isError && (
        <Alert severity="error" message="Could not load expenses. Please try again." />
      )}

      {!isError && (
        <>
          <ExpenseList receipts={data?.receipts ?? []} />

          {pagination && pagination.totalPages > 1 && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                data-testid="expense-pagination-prev"
              >
                Previous
              </Button>
              <Typography variant="body2">
                Page {pagination.currentPage} of {pagination.totalPages}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                data-testid="expense-pagination-next"
              >
                Next
              </Button>
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
