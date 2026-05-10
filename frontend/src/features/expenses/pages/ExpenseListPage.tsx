import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useSelector } from 'react-redux';
import { selectUser } from '../../auth/authSlice';
import { useListReceiptsQuery } from '../expenseApi';
import { ExpenseList } from '../components/ExpenseList';
import { Skeleton, Alert, TextInput } from '../../../common/components';

export function ExpenseListPage(): React.ReactElement {
  const user = useSelector(selectUser);
  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('');

  const queryParams = isAdminOrManager
    ? {
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(department ? { department } : {}),
      }
    : { travelerId: user?.id ?? '' };

  const { data, isLoading, isError } = useListReceiptsQuery(queryParams);

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
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <TextInput
            name="startDate"
            label="Start Date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            data-testid="filter-start-date"
          />
          <TextInput
            name="endDate"
            label="End Date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            data-testid="filter-end-date"
          />
          <TextInput
            name="department"
            label="Department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            data-testid="filter-department"
          />
        </Box>
      )}

      {isError && (
        <Alert severity="error" message="Could not load expenses. Please try again." />
      )}

      {!isError && (
        <ExpenseList receipts={data?.receipts ?? []} />
      )}
    </Box>
  );
}
