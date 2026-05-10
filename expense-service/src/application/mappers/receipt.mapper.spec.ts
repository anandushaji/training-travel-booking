import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import { ReceiptMapper } from './receipt.mapper';

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

describe('ReceiptMapper', () => {
  it('maps all fields', () => {
    const receipt = makeReceipt();
    const dto = ReceiptMapper.toDto(receipt);

    expect(dto.id).toBe(receipt.id);
    expect(dto.receiptNumber).toBe('RCP-2026-000001');
    expect(dto.bookingId).toBe('booking-1');
    expect(dto.travelerId).toBe('traveler-1');
    expect(dto.travelerName).toBe('Alice Smith');
    expect(dto.travelerEmail).toBe('alice@example.com');
    expect(dto.amount).toBe(450.0);
    expect(dto.currency).toBe('USD');
    expect(dto.origin).toBe('JFK');
    expect(dto.destination).toBe('LAX');
    expect(dto.status).toBe('ACTIVE');
    expect(dto.generatedAt).toBeDefined();
    expect(dto.voidedAt).toBeUndefined();
  });

  it('uses String() when departureDate is not a Date', () => {
    const receipt = makeReceipt();
    (receipt as any).props.departureDate = '2026-06-01' as any;
    const dto = ReceiptMapper.toDto(receipt);
    expect(dto.departureDate).toBe('2026-06-01');
  });
});
