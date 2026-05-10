import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { useGetReceiptByIdQuery } from '../expenseApi';
import { ReceiptDetails } from '../components/ReceiptDetails';
import { Skeleton, Alert } from '../../../common/components';

export function ReceiptPage(): React.ReactElement {
  const { receiptId = '' } = useParams<{ receiptId: string }>();
  const { data: receipt, isLoading, isError } = useGetReceiptByIdQuery(receiptId, {
    skip: !receiptId,
  });

  if (isLoading) {
    return (
      <Box data-testid="receipt-page" sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
        <Skeleton height={40} />
        <Skeleton height={200} />
      </Box>
    );
  }

  if (isError || !receipt) {
    return (
      <Box data-testid="receipt-page" sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
        <Alert severity="error" message="Could not load receipt. It may not exist or you may not have access." />
      </Box>
    );
  }

  return (
    <Box data-testid="receipt-page" sx={{ maxWidth: 720, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>Receipt Details</Typography>
      <ReceiptDetails receipt={receipt} />
    </Box>
  );
}
