import React from 'react';
import { Box, Typography, Divider } from '@mui/material';
import type { Receipt } from '../expense.types';

export interface ReceiptDetailsProps {
  receipt: Receipt;
}

export function ReceiptDetails({ receipt }: ReceiptDetailsProps): React.ReactElement {
  const origin = receipt.booking?.itinerary?.origin ?? '';
  const destination = receipt.booking?.itinerary?.destination ?? '';
  const route = origin && destination ? `${origin} → ${destination}` : '—';
  const departure = receipt.booking?.itinerary?.departureDate ?? '—';
  const returnDate = receipt.booking?.itinerary?.returnDate;
  const travelerName = receipt.traveler?.name ?? '—';

  return (
    <Box data-testid="receipt-details">
      <Typography variant="h6" gutterBottom>
        Receipt: {receipt.receiptNumber}
      </Typography>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Traveler</Typography>
        <Typography variant="body1">{travelerName}</Typography>
      </Box>

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Route</Typography>
        <Typography variant="body1">{route}</Typography>
        <Typography variant="body2">Departure: {departure}</Typography>
        {returnDate && (
          <Typography variant="body2">Return: {returnDate}</Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" color="text.secondary">Amount Breakdown</Typography>
        {receipt.breakdown?.basefare !== undefined && (
          <Typography variant="body2">
            Base Fare: {receipt.currency} {receipt.breakdown.basefare.toFixed(2)}
          </Typography>
        )}
        {receipt.breakdown?.taxes !== undefined && (
          <Typography variant="body2">
            Taxes: {receipt.currency} {receipt.breakdown.taxes.toFixed(2)}
          </Typography>
        )}
        {receipt.breakdown?.fees !== undefined && (
          <Typography variant="body2">
            Fees: {receipt.currency} {receipt.breakdown.fees.toFixed(2)}
          </Typography>
        )}
        <Typography variant="body1" fontWeight="bold" sx={{ mt: 1 }}>
          Total: {receipt.currency} {receipt.amount.toFixed(2)}
        </Typography>
      </Box>

      <Box sx={{ mt: 3 }}>
        <a
          href={receipt.pdfUrl}
          download
          data-testid="download-pdf-anchor"
        >
          Download PDF Receipt
        </a>
      </Box>
    </Box>
  );
}
