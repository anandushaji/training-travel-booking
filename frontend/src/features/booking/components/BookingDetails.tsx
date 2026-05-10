import React from 'react';
import { Box, Typography } from '@mui/material';
import { useGetBookingByIdQuery, useCancelBookingMutation } from '../bookingApi';
import { StatusBadge, Skeleton, Alert, Button } from '../../../common/components';
import type { BookingStatus } from '../booking.types';
import type { StatusColor } from '../../../common/components/DataDisplay/StatusBadge';

const BOOKING_STATUS_COLORS: Record<BookingStatus, StatusColor> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'default',
  FAILED: 'error',
};

interface BookingDetailsProps {
  bookingId: string;
}

export function BookingDetails({ bookingId }: BookingDetailsProps): React.ReactElement {
  const { data: booking, isLoading, isError } = useGetBookingByIdQuery(bookingId);
  const [cancelBooking, { isLoading: isCancelling, error: cancelError }] = useCancelBookingMutation();

  if (isLoading) {
    return (
      <Box data-testid="booking-details-loading" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Skeleton height={32} />
        <Skeleton height={24} />
        <Skeleton height={24} />
        <Skeleton height={24} />
      </Box>
    );
  }

  if (isError || !booking) {
    return (
      <Alert
        severity="error"
        message="Failed to load booking details."
        data-testid="booking-details-error"
      />
    );
  }

  const canCancel = booking.status === 'PENDING' || booking.status === 'CONFIRMED';

  const handleCancel = () => {
    void cancelBooking({ id: bookingId });
  };

  return (
    <Box data-testid="booking-details" sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box>
        <Typography variant="h6">Booking {booking.id}</Typography>
        <StatusBadge
          status={booking.status}
          statusColorMap={BOOKING_STATUS_COLORS}
        />
      </Box>

      <Box data-testid="booking-itinerary">
        <Typography variant="subtitle2" gutterBottom>Itinerary</Typography>
        <Typography variant="body2">
          {booking.itinerary.origin} → {booking.itinerary.destination}
        </Typography>
        <Typography variant="body2">
          Departure: {booking.itinerary.departureDate}
        </Typography>
        <Typography variant="body2">
          Cabin: {booking.itinerary.cabinClass}
        </Typography>
        <Typography variant="body2">
          Passengers: {booking.itinerary.passengers}
        </Typography>
      </Box>

      <Box>
        <Typography variant="body2">
          Total: {booking.currency} {booking.totalAmount}
        </Typography>
      </Box>

      {cancelError && (
        <Alert severity="error" message="Failed to cancel booking." data-testid="cancel-error" />
      )}

      {canCancel && (
        <Button
          variant="danger"
          onClick={handleCancel}
          disabled={isCancelling}
          data-testid="cancel-booking-button"
        >
          Cancel Booking
        </Button>
      )}
    </Box>
  );
}
