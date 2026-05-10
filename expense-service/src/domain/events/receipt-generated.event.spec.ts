import { ReceiptGeneratedEvent } from './receipt-generated.event';

describe('ReceiptGeneratedEvent', () => {
  it('serialises ADR-003 envelope with receiptNumber', () => {
    const event = new ReceiptGeneratedEvent({
      aggregateId: 'receipt-id-1',
      correlationId: 'corr-1',
      causationId: 'cause-1',
      data: {
        bookingId: 'booking-1',
        travelerId: 'traveler-1',
        receiptNumber: 'RCP-2026-000001',
        amount: 450.0,
        currency: 'USD',
      },
    });

    const envelope = event.toEnvelope();

    expect(envelope['eventId']).toBeDefined();
    expect(envelope['eventType']).toBe('ReceiptGenerated');
    expect(envelope['aggregateId']).toBe('receipt-id-1');
    expect(envelope['occurredOn']).toBeDefined();
    expect(envelope['correlationId']).toBe('corr-1');
    expect(envelope['causationId']).toBe('cause-1');
    expect(envelope['version']).toBe('1.0');
    const data = envelope['data'] as Record<string, unknown>;
    expect(data['receiptNumber']).toBe('RCP-2026-000001');
    expect(data['bookingId']).toBe('booking-1');
    expect(data['amount']).toBe(450.0);
  });
});
