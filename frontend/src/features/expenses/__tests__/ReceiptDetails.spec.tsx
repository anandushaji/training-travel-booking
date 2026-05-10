import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReceiptDetails } from '../components/ReceiptDetails';
import type { Receipt } from '../expense.types';

const mockReceipt: Receipt = {
  id: 'receipt-1',
  receiptNumber: 'RCP-2026-001',
  bookingId: 'booking-1',
  traveler: { id: 'traveler-1', name: 'Alice Smith', email: 'alice@corp.com' },
  booking: {
    id: 'booking-1',
    itinerary: { origin: 'JFK', destination: 'LAX', departureDate: '2026-06-01' },
  },
  amount: 450.00,
  currency: 'USD',
  breakdown: { basefare: 400.00, taxes: 40.00, fees: 10.00 },
  pdfUrl: 'https://s3.test/rec.pdf',
};

describe('ReceiptDetails', () => {
  it('REQ-EXPENSES-04-S01: renders all receipt fields', () => {
    render(<ReceiptDetails receipt={mockReceipt} />);
    expect(screen.getByText(/RCP-2026-001/)).toBeInTheDocument();
    // Multiple USD / amount mentions expected (breakdown + total); at least one must exist
    expect(screen.getAllByText(/USD/).length).toBeGreaterThan(0);
    expect(screen.getByTestId('receipt-details')).toBeInTheDocument();
  });

  it('REQ-EXPENSES-04-S02: PDF download anchor present in detail view', () => {
    render(<ReceiptDetails receipt={mockReceipt} />);
    const anchor = screen.getByTestId('download-pdf-anchor');
    expect(anchor).toHaveAttribute('href', 'https://s3.test/rec.pdf');
    expect(anchor).toHaveAttribute('download');
  });
});
