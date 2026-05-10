import React from 'react';
import { useParams } from 'react-router-dom';
import { Box, Typography } from '@mui/material';
import { BookingDetails } from '../components/BookingDetails';

export function BookingDetailsPage(): React.ReactElement {
  const { id = '' } = useParams<{ id: string }>();

  return (
    <Box data-testid="booking-details-page" sx={{ maxWidth: 640, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>Booking Details</Typography>
      {id ? <BookingDetails bookingId={id} /> : <p>Invalid booking ID.</p>}
    </Box>
  );
}
