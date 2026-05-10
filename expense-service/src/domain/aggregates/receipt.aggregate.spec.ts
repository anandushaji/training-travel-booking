import { DomainException } from '@travel/shared';
import { Receipt } from './receipt.aggregate';
import { ReceiptStatus } from '../value-objects/receipt-status.enum';

function makeReceipt(): Receipt {
  return Receipt.create({
    receiptNumber: 'RCP-2026-000001',
    bookingId: 'booking-1',
    travelerId: 'traveler-1',
    travelerName: 'Alice Smith',
    travelerEmail: 'alice@example.com',
    amount: 450.0,
    currency: 'USD',
    origin: 'JFK',
    destination: 'LAX',
    departureDate: new Date('2026-06-01'),
  });
}

describe('Receipt aggregate', () => {
  describe('create', () => {
    it('create - status ACTIVE', () => {
      const receipt = makeReceipt();
      expect(receipt.status).toBe(ReceiptStatus.ACTIVE);
    });

    it('sets receiptNumber, bookingId, travelerId', () => {
      const receipt = makeReceipt();
      expect(receipt.receiptNumber).toBe('RCP-2026-000001');
      expect(receipt.bookingId).toBe('booking-1');
      expect(receipt.travelerId).toBe('traveler-1');
    });

    it('sets generatedAt to a Date', () => {
      const before = new Date();
      const receipt = makeReceipt();
      expect(receipt.generatedAt).toBeInstanceOf(Date);
      expect(receipt.generatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('defaults currency to USD when not provided', () => {
      const receipt = Receipt.create({
        receiptNumber: 'RCP-2026-000002',
        bookingId: 'booking-2',
        travelerId: 'traveler-2',
        travelerName: 'Bob',
        travelerEmail: 'bob@example.com',
        amount: 100,
        origin: 'NYC',
        destination: 'LA',
        departureDate: new Date(),
      });
      expect(receipt.currency).toBe('USD');
    });
  });

  describe('void', () => {
    it('void - transitions to VOIDED with voidedAt', () => {
      const receipt = makeReceipt();
      const voidedAt = new Date();
      receipt.void(voidedAt);
      expect(receipt.status).toBe(ReceiptStatus.VOIDED);
      expect(receipt.voidedAt).toBe(voidedAt);
    });

    it('void - throws DomainException when already VOIDED', () => {
      const receipt = makeReceipt();
      receipt.void(new Date());
      expect(() => receipt.void(new Date())).toThrow(DomainException);
    });
  });
});
