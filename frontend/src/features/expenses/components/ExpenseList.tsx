import React from 'react';
import { Box, Typography, Link as MuiLink } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../common/components';
import type { Receipt } from '../expense.types';
import { ROUTES } from '../../../routes/routes.config';

export interface ExpenseListProps {
  receipts: Receipt[];
}

export function ExpenseList({ receipts }: ExpenseListProps): React.ReactElement {
  const navigate = useNavigate();

  if (receipts.length === 0) {
    return (
      <Box data-testid="expense-list-empty">
        <EmptyState
          title="No receipts found"
          description="Your receipts will appear here after bookings are confirmed."
        />
      </Box>
    );
  }

  return (
    <Box data-testid="expense-list">
      {receipts.map((receipt) => {
        const receiptDetailPath = ROUTES.RECEIPT_DETAIL.replace(':receiptId', receipt.id);
        const origin = receipt.booking?.itinerary?.origin ?? '';
        const destination = receipt.booking?.itinerary?.destination ?? '';
        const route = origin && destination ? `${origin} → ${destination}` : '—';

        return (
          <Box
            key={receipt.id}
            data-testid={`expense-row-${receipt.id}`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              mb: 1,
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 1,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight="bold">
                {receipt.receiptNumber}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {route}
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }}>
              <Typography variant="body2">
                {receipt.currency} {receipt.amount.toFixed(2)}
              </Typography>
              {receipt.booking?.itinerary?.departureDate && (
                <Typography variant="caption" color="text.secondary">
                  {receipt.booking.itinerary.departureDate}
                </Typography>
              )}
            </Box>

            <Box sx={{ flex: 1, display: 'flex', gap: 1, justifyContent: 'flex-end', alignItems: 'center' }}>
              <MuiLink
                component="button"
                variant="body2"
                onClick={() => { void navigate(receiptDetailPath); }}
                data-testid={`view-receipt-${receipt.id}`}
              >
                View
              </MuiLink>
              <a
                href={receipt.pdfUrl}
                download
                data-testid={`download-pdf-${receipt.id}`}
                style={{ fontSize: '0.875rem' }}
              >
                Download PDF
              </a>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
