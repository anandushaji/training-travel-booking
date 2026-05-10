import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Box, Typography } from '@mui/material';
import { useGetBookingByIdQuery } from '../bookingApi';
import { clearActiveBooking } from '../bookingSlice';
import { Button, Skeleton, Alert } from '../../../common/components';
import { ROUTES } from '../../../routes/routes.config';
import type { AppDispatch } from '../../../app/store';

export function BookingConfirmationPage(): React.ReactElement {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { data: booking, isLoading, isError } = useGetBookingByIdQuery(id, { skip: !id });

  // Clear activeBooking from slice on mount
  useEffect(() => {
    dispatch(clearActiveBooking());
  }, [dispatch]);

  if (isLoading) {
    return (
      <Box sx={{ maxWidth: 640, mx: 'auto', p: 3 }}>
        <Skeleton height={200} />
      </Box>
    );
  }

  if (isError || !booking) {
    return (
      <Box data-testid="booking-confirmation-page" sx={{ maxWidth: 640, mx: 'auto', p: 3 }}>
        <Alert severity="error" message="Could not load booking confirmation." />
      </Box>
    );
  }

  return (
    <Box data-testid="booking-confirmation-page" sx={{ maxWidth: 640, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>Booking Confirmed!</Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body1"><strong>Booking ID:</strong> {booking.id}</Typography>
        <Typography variant="body1">
          <strong>Route:</strong> {booking.itinerary.origin} → {booking.itinerary.destination}
        </Typography>
        <Typography variant="body1">
          <strong>Departure:</strong> {booking.itinerary.departureDate}
        </Typography>
        <Typography variant="body1">
          <strong>Cabin:</strong> {booking.itinerary.cabinClass}
        </Typography>
        <Typography variant="body1">
          <strong>Total:</strong> {booking.currency} {booking.totalAmount}
        </Typography>
      </Box>

      <Button
        variant="secondary"
        onClick={() => { void navigate(ROUTES.BOOKINGS_LIST); }}
        data-testid="view-bookings-button"
      >
        View My Bookings
      </Button>

      {booking.receiptId && (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="ghost"
            onClick={() => {
              void navigate(
                ROUTES.RECEIPT_DETAIL.replace(':receiptId', booking.receiptId as string),
              );
            }}
            data-testid="view-receipt-link"
          >
            View Receipt
          </Button>
        </Box>
      )}
    </Box>
  );
}
