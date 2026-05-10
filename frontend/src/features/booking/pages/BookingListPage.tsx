import React from 'react';
import { Box, Typography } from '@mui/material';
import { BookingList } from '../components/BookingList';

export function BookingListPage(): React.ReactElement {
  return (
    <Box data-testid="booking-list-page" sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>My Bookings</Typography>
      <BookingList />
    </Box>
  );
}
