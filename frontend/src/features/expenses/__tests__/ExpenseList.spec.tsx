import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ExpenseList } from '../components/ExpenseList';
import type { Receipt } from '../expense.types';

function makeReceipt(overrides?: Partial<Receipt>): Receipt {
  return {
    id: 'receipt-1',
    receiptNumber: 'RCP-2026-001',
    bookingId: 'booking-1',
    amount: 450.00,
    currency: 'USD',
    pdfUrl: 'https://s3.test/receipts/RCP-2026-001.pdf',
    booking: {
      id: 'booking-1',
      itinerary: { origin: 'JFK', destination: 'LAX', departureDate: '2026-06-01' },
    },
    ...overrides,
  };
}

function renderList(receipts: Receipt[]) {
  return render(
    <MemoryRouter>
      <ExpenseList receipts={receipts} />
    </MemoryRouter>,
  );
}

describe('ExpenseList', () => {
  it('REQ-EXPENSES-03-S01: renders 3 receipt rows', () => {
    const receipts = [
      makeReceipt({ id: 'r-1', receiptNumber: 'RCP-001' }),
      makeReceipt({ id: 'r-2', receiptNumber: 'RCP-002' }),
      makeReceipt({ id: 'r-3', receiptNumber: 'RCP-003' }),
    ];
    renderList(receipts);
    expect(screen.getByTestId('expense-row-r-1')).toBeInTheDocument();
    expect(screen.getByTestId('expense-row-r-2')).toBeInTheDocument();
    expect(screen.getByTestId('expense-row-r-3')).toBeInTheDocument();
  });

  it('REQ-EXPENSES-03-S02: renders empty state for zero receipts', () => {
    renderList([]);
    expect(screen.getByTestId('expense-list-empty')).toBeInTheDocument();
    expect(screen.getByText('No receipts found')).toBeInTheDocument();
  });

  it('REQ-EXPENSES-03-S03: PDF download anchor present', () => {
    const receipt = makeReceipt({ pdfUrl: 'https://s3.test/receipt.pdf' });
    renderList([receipt]);
    const anchor = screen.getByTestId('download-pdf-receipt-1');
    expect(anchor).toHaveAttribute('href', 'https://s3.test/receipt.pdf');
    expect(anchor).toHaveAttribute('download');
  });
});
