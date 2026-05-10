import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useGetBookingsQuery } from '../bookingApi';
import { StatusBadge, Skeleton, EmptyState, Alert } from '../../../common/components';
import type { Booking, BookingStatus } from '../booking.types';
import { ROUTES } from '../../../routes/routes.config';
import type { StatusColor } from '../../../common/components/DataDisplay/StatusBadge';

const BOOKING_STATUS_COLORS: Record<BookingStatus, StatusColor> = {
  PENDING: 'warning',
  CONFIRMED: 'success',
  CANCELLED: 'default',
  FAILED: 'error',
};

interface BookingListProps {
  initialPage?: number;
}

export function BookingList({ initialPage = 1 }: BookingListProps): React.ReactElement {
  const [page, setPage] = useState(initialPage);
  const { data, isLoading, isError } = useGetBookingsQuery({ page, limit: 20 });

  if (isLoading) {
    return (
      <Box data-testid="booking-list-loading" sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} height={48} />
        ))}
      </Box>
    );
  }

  const bookings = data?.bookings ?? [];
  const pagination = data?.pagination;

  if (isError) {
    return (
      <Alert
        data-testid="booking-list-error"
        severity="error"
        message="Could not load bookings. Please try again later."
      />
    );
  }

  if (bookings.length === 0) {
    return (
      <EmptyState
        data-testid="booking-list-empty"
        title="No bookings found"
        description="You have no bookings yet."
      />
    );
  }

  const detailPath = (b: Booking) =>
    ROUTES.BOOKING_DETAIL.replace(':id', b.id);

  return (
    <Box data-testid="booking-list">
      <Box
        component="table"
        sx={{ width: '100%', borderCollapse: 'collapse' }}
        role="table"
        aria-label="bookings"
      >
        <Box component="thead">
          <Box component="tr">
            {['Booking ID', 'Route', 'Departure', 'Status', ''].map((header) => (
              <Box
                key={header}
                component="th"
                sx={{ textAlign: 'left', p: 1, borderBottom: '1px solid', borderColor: 'divider' }}
              >
                <Typography variant="subtitle2">{header}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Box component="tbody">
          {bookings.map((booking) => (
            <Box
              component="tr"
              key={booking.id}
              data-testid={`booking-row-${booking.id}`}
            >
              <Box component="td" sx={{ p: 1 }}>
                <Typography variant="body2">{booking.id}</Typography>
              </Box>
              <Box component="td" sx={{ p: 1 }}>
                <Typography variant="body2">
                  {booking.itinerary.origin} → {booking.itinerary.destination}
                </Typography>
              </Box>
              <Box component="td" sx={{ p: 1 }}>
                <Typography variant="body2">{booking.itinerary.departureDate}</Typography>
              </Box>
              <Box component="td" sx={{ p: 1 }}>
                <StatusBadge status={booking.status} statusColorMap={BOOKING_STATUS_COLORS} />
              </Box>
              <Box component="td" sx={{ p: 1 }}>
                <Link to={detailPath(booking)} data-testid={`view-details-${booking.id}`}>
                  View Details
                </Link>
              </Box>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            data-testid="pagination-prev"
          >
            Previous
          </button>
          <Typography variant="body2">
            Page {pagination.currentPage} of {pagination.totalPages}
          </Typography>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page >= pagination.totalPages}
            data-testid="pagination-next"
          >
            Next
          </button>
        </Box>
      )}
    </Box>
  );
}
