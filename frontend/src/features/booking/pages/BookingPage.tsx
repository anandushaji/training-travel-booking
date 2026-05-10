import React, { useEffect } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Box, Typography } from '@mui/material';
import { selectSelectedOffer } from '../../search/searchSlice';
import { selectActiveBooking } from '../bookingSlice';
import { BookingForm } from '../components/BookingForm';
import { Alert } from '../../../common/components';
import { ROUTES } from '../../../routes/routes.config';

export function BookingPage(): React.ReactElement {
  const navigate = useNavigate();
  const selectedOffer = useSelector(selectSelectedOffer);
  const activeBooking = useSelector(selectActiveBooking);

  // Redirect to confirmation when booking is CONFIRMED
  useEffect(() => {
    if (activeBooking?.status === 'CONFIRMED') {
      void navigate(ROUTES.BOOKING_CONFIRMATION.replace(':id', activeBooking.id));
    }
  }, [activeBooking, navigate]);

  // Redirect to search if no offer selected
  if (!selectedOffer) {
    return <Navigate to={ROUTES.SEARCH} replace />;
  }

  return (
    <Box data-testid="booking-page" sx={{ maxWidth: 640, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>Confirm Your Booking</Typography>

      {activeBooking?.status === 'FAILED' && (
        <Alert
          severity="error"
          message="Your booking could not be completed. Please try again."
          data-testid="booking-failed-alert"
          sx={{ mb: 2 }}
        />
      )}

      <BookingForm />
    </Box>
  );
}
