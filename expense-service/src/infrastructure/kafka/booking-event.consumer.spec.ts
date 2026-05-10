import { BookingEventConsumer } from './booking-event.consumer';
import { ExpenseMetricsService } from '../metrics/expense-metrics.service';
import * as prom from 'prom-client';

function makeMetrics(): ExpenseMetricsService {
  prom.register.clear();
  return new ExpenseMetricsService();
}

function makeConsumer(overrides: Partial<{
  dataSource: any;
  generateReceiptUseCase: any;
  voidReceiptUseCase: any;
  processedEventRepo: any;
  publisher: any;
  metrics: any;
}> = {}) {
  const metrics = overrides.metrics ?? makeMetrics();
  const dataSource = overrides.dataSource ?? {
    transaction: jest.fn().mockImplementation(async (cb: (em: any) => Promise<any>) => {
      const result = await cb({});
      return result;
    }),
  };
  const generateReceiptUseCase = overrides.generateReceiptUseCase ?? {
    execute: jest.fn().mockResolvedValue({
      receipt: {
        id: 'r-1', bookingId: 'b-1', travelerId: 't-1', receiptNumber: 'RCP-2026-000001',
        amount: 450, currency: 'USD',
      },
      expense: {
        id: 'e-1', bookingId: 'b-1', travelerId: 't-1', amount: 450, currency: 'USD',
      },
    }),
  };
  const voidReceiptUseCase = overrides.voidReceiptUseCase ?? {
    execute: jest.fn().mockResolvedValue(undefined),
  };
  const processedEventRepo = overrides.processedEventRepo ?? {
    exists: jest.fn().mockResolvedValue(false),
    save: jest.fn().mockResolvedValue(undefined),
  };
  const publisher = overrides.publisher ?? {
    publishReceiptGenerated: jest.fn().mockResolvedValue(undefined),
    publishExpenseRecorded: jest.fn().mockResolvedValue(undefined),
  };

  const consumer = new BookingEventConsumer(
    dataSource,
    generateReceiptUseCase,
    voidReceiptUseCase,
    processedEventRepo,
    publisher,
    metrics,
  );
  return { consumer, dataSource, generateReceiptUseCase, voidReceiptUseCase, processedEventRepo, publisher, metrics };
}

const confirmedMessage = {
  eventId: 'evt-1',
  eventType: 'BookingConfirmed',
  aggregateId: 'booking-1',
  correlationId: 'corr-1',
  data: {
    travelerId: 'traveler-1',
    travelerName: 'Alice',
    travelerEmail: 'alice@example.com',
    totalAmount: 450,
    currency: 'USD',
    origin: 'JFK',
    destination: 'LAX',
    departureDate: '2026-06-01',
  },
};

const cancelledMessage = {
  eventId: 'evt-2',
  eventType: 'BookingCancelled',
  aggregateId: 'booking-1',
  correlationId: 'corr-2',
  data: {
    travelerId: 'traveler-1',
    reason: 'Change of plans',
  },
};

describe('BookingEventConsumer', () => {
  beforeEach(() => {
    prom.register.clear();
  });

  it('BookingConfirmed calls GenerateReceiptUseCase', async () => {
    const { consumer, generateReceiptUseCase } = makeConsumer();
    await consumer.handleBookingEvent(confirmedMessage);
    expect(generateReceiptUseCase.execute).toHaveBeenCalledTimes(1);
  });

  it('duplicate BookingConfirmed is no-op', async () => {
    const processedEventRepo = {
      exists: jest.fn().mockResolvedValue(true),
      save: jest.fn(),
    };
    const { consumer, generateReceiptUseCase } = makeConsumer({ processedEventRepo });
    await consumer.handleBookingEvent(confirmedMessage);
    expect(generateReceiptUseCase.execute).not.toHaveBeenCalled();
  });

  it('BookingCancelled calls VoidReceiptUseCase', async () => {
    const { consumer, voidReceiptUseCase } = makeConsumer();
    await consumer.handleBookingEvent(cancelledMessage);
    expect(voidReceiptUseCase.execute).toHaveBeenCalledWith('booking-1', 'corr-2', expect.anything());
  });

  it('duplicate BookingCancelled is no-op', async () => {
    const processedEventRepo = {
      exists: jest.fn().mockResolvedValue(true),
      save: jest.fn(),
    };
    const { consumer, voidReceiptUseCase } = makeConsumer({ processedEventRepo });
    await consumer.handleBookingEvent(cancelledMessage);
    expect(voidReceiptUseCase.execute).not.toHaveBeenCalled();
  });

  it('missing payload field logs ERROR and returns', async () => {
    const { consumer } = makeConsumer();
    // Should NOT throw
    await expect(consumer.handleBookingEvent({ eventType: 'BookingConfirmed' })).resolves.toBeUndefined();
  });

  it('transient DB error propagates (no ack)', async () => {
    const dbError = new Error('DB connection lost');
    const dataSource = {
      transaction: jest.fn().mockRejectedValue(dbError),
    };
    const { consumer } = makeConsumer({ dataSource });
    await expect(consumer.handleBookingEvent(confirmedMessage)).rejects.toThrow('DB connection lost');
  });

  it('null message logs ERROR and returns (null object guard)', async () => {
    const { consumer } = makeConsumer();
    await expect(consumer.handleBookingEvent(null)).resolves.toBeUndefined();
  });

  it('ignores unknown event types silently', async () => {
    const { consumer, generateReceiptUseCase } = makeConsumer();
    await consumer.handleBookingEvent({
      eventId: 'evt-99',
      eventType: 'SomethingElse',
      aggregateId: 'x',
      data: {},
    });
    expect(generateReceiptUseCase.execute).not.toHaveBeenCalled();
  });
});
