import { Controller, Logger, Inject } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { DataSource, EntityManager } from 'typeorm';
import { GenerateReceiptUseCase } from '../../application/use-cases/generate-receipt.use-case';
import { VoidReceiptUseCase } from '../../application/use-cases/void-receipt.use-case';
import { ProcessedEventRepository } from '../repositories/processed-event.repository';
import { ExpenseEventPublisher } from './expense-event.publisher';
import { ExpenseMetricsService } from '../metrics/expense-metrics.service';
import { ReceiptGeneratedEvent } from '../../domain/events/receipt-generated.event';
import { ExpenseRecordedEvent } from '../../domain/events/expense-recorded.event';

interface BookingEventEnvelope {
  eventId: string;
  eventType: string;
  aggregateId: string;
  correlationId?: string;
  causationId?: string;
  data: Record<string, unknown>;
}

@Controller()
export class BookingEventConsumer {
  private readonly logger = new Logger(BookingEventConsumer.name);

  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
    private readonly generateReceiptUseCase: GenerateReceiptUseCase,
    private readonly voidReceiptUseCase: VoidReceiptUseCase,
    private readonly processedEventRepo: ProcessedEventRepository,
    private readonly publisher: ExpenseEventPublisher,
    private readonly metrics: ExpenseMetricsService,
  ) {}

  @MessagePattern('booking-events')
  async handleBookingEvent(@Payload() message: unknown): Promise<void> {
    let envelope: BookingEventEnvelope;
    try {
      envelope = this.parseEnvelope(message);
    } catch (err) {
      this.logger.error(`Poison pill — invalid event payload: ${(err as Error).message}`);
      return; // ack to prevent partition block
    }

    const { eventId, eventType, aggregateId, correlationId = 'unknown', data } = envelope;

    if (eventType === 'BookingConfirmed') {
      await this.handleBookingConfirmed(eventId, eventType, aggregateId, correlationId, data);
    } else if (eventType === 'BookingCancelled') {
      await this.handleBookingCancelled(eventId, eventType, aggregateId, correlationId, data);
    } else {
      this.logger.debug(`Ignoring unknown event type: ${eventType}`);
    }
  }

  private async handleBookingConfirmed(
    eventId: string,
    eventType: string,
    aggregateId: string,
    correlationId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const isDuplicate = await this.processedEventRepo.exists(eventId);
    if (isDuplicate) {
      this.logger.log(`Duplicate BookingConfirmed eventId=${eventId} — skipping`);
      this.metrics.incrementExpenseEventsProcessed('BookingConfirmed', 'duplicate');
      return;
    }

    const bookingData = {
      bookingId: aggregateId,
      travelerId: data['travelerId'] as string,
      travelerName: data['travelerName'] as string,
      travelerEmail: data['travelerEmail'] as string,
      totalAmount: data['totalAmount'] as number,
      ...(data['currency'] ? { currency: data['currency'] as string } : {}),
      origin: data['origin'] as string,
      destination: data['destination'] as string,
      departureDate: data['departureDate'] as string,
    };

    // Transient DB error: do NOT catch — let it propagate so Kafka does not ack
    const { receipt, expense } = await this.dataSource.transaction(async (em: EntityManager) => {
      const result = await this.generateReceiptUseCase.execute(bookingData, correlationId, em);
      await this.processedEventRepo.save(eventId, eventType, em);
      return result;
    });

    // Best-effort publish (do not await errors propagating)
    const receiptEvent = new ReceiptGeneratedEvent({
      aggregateId: receipt.id,
      correlationId,
      data: {
        bookingId: receipt.bookingId,
        travelerId: receipt.travelerId,
        receiptNumber: receipt.receiptNumber,
        amount: receipt.amount,
        currency: receipt.currency,
      },
    });
    const expenseEvent = new ExpenseRecordedEvent({
      aggregateId: expense.id,
      correlationId,
      data: {
        bookingId: expense.bookingId,
        travelerId: expense.travelerId,
        amount: expense.amount,
        currency: expense.currency,
        status: 'ACTIVE',
      },
    });

    void this.publisher.publishReceiptGenerated(receiptEvent);
    void this.publisher.publishExpenseRecorded(expenseEvent);

    this.metrics.incrementReceiptsGenerated();
    this.metrics.incrementExpenseEventsProcessed('BookingConfirmed', 'success');
  }

  private async handleBookingCancelled(
    eventId: string,
    eventType: string,
    aggregateId: string,
    correlationId: string,
    data: Record<string, unknown>,
  ): Promise<void> {
    const isDuplicate = await this.processedEventRepo.exists(eventId);
    if (isDuplicate) {
      this.logger.log(`Duplicate BookingCancelled eventId=${eventId} — skipping`);
      this.metrics.incrementExpenseEventsProcessed('BookingCancelled', 'duplicate');
      return;
    }

    // Transient DB error: do NOT catch — let it propagate
    await this.dataSource.transaction(async (em: EntityManager) => {
      await this.voidReceiptUseCase.execute(aggregateId, correlationId, em);
      await this.processedEventRepo.save(eventId, eventType, em);
    });

    const expenseEvent = new ExpenseRecordedEvent({
      aggregateId,
      correlationId,
      data: {
        bookingId: aggregateId,
        travelerId: data['travelerId'] as string,
        amount: 0,
        currency: 'USD',
        status: 'CANCELLED',
      },
    });
    void this.publisher.publishExpenseRecorded(expenseEvent);

    this.metrics.incrementReceiptsVoided();
    this.metrics.incrementExpenseEventsProcessed('BookingCancelled', 'success');
  }

  private parseEnvelope(message: unknown): BookingEventEnvelope {
    if (typeof message !== 'object' || message === null) {
      throw new TypeError('Message is not an object');
    }
    const m = message as Record<string, unknown>;
    if (typeof m['eventId'] !== 'string') throw new TypeError('Missing eventId');
    if (typeof m['eventType'] !== 'string') throw new TypeError('Missing eventType');
    if (typeof m['aggregateId'] !== 'string') throw new TypeError('Missing aggregateId');
    if (typeof m['data'] !== 'object' || m['data'] === null) throw new TypeError('Missing data');
    return m as unknown as BookingEventEnvelope;
  }
}
