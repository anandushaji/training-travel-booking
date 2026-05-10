import { ExpenseRecordedEvent } from './expense-recorded.event';

describe('ExpenseRecordedEvent', () => {
  it('data contains status', () => {
    const event = new ExpenseRecordedEvent({
      aggregateId: 'expense-id-1',
      correlationId: 'corr-1',
      data: {
        bookingId: 'booking-1',
        travelerId: 'traveler-1',
        amount: 450.0,
        currency: 'USD',
        status: 'ACTIVE',
      },
    });

    const envelope = event.toEnvelope();
    const data = envelope['data'] as Record<string, unknown>;

    expect(data['status']).toBe('ACTIVE');
    expect(envelope['eventType']).toBe('ExpenseRecorded');
    expect(envelope['eventId']).toBeDefined();
    expect(envelope['version']).toBe('1.0');
  });

  it('supports CANCELLED status', () => {
    const event = new ExpenseRecordedEvent({
      aggregateId: 'expense-id-2',
      data: {
        bookingId: 'booking-2',
        travelerId: 'traveler-2',
        amount: 200,
        currency: 'USD',
        status: 'CANCELLED',
      },
    });
    const data = event.toEnvelope()['data'] as Record<string, unknown>;
    expect(data['status']).toBe('CANCELLED');
  });
});
