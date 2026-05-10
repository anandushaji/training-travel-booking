import { Injectable, Logger } from '@nestjs/common';
import { NotFoundException, ConflictException } from '@travel/shared';
import { BookingRepository } from '../../infrastructure/repositories/booking.repository';
import { BookingReadModelRepository } from '../../infrastructure/repositories/booking-read-model.repository';
import { BookingEventPublisher } from '../../infrastructure/kafka/booking-event.publisher';
import { BookingMetricsService } from '../../infrastructure/metrics/booking-metrics.service';
import { InventoryServiceClient } from '../../infrastructure/http/inventory-service.client';
import { PaymentServiceClient } from '../../infrastructure/http/payment-service.client';
import { BookingMapper } from '../mappers/booking.mapper';
import { CancelBookingDto } from '../dtos/cancel-booking.dto';
import { UpdateBookingDto } from '../dtos/update-booking.dto';
import { BookingResponseDto } from '../dtos/booking-response.dto';
import { BookingCancelledEvent } from '../../domain/events/booking-cancelled.event';

@Injectable()
export class CancelBookingUseCase {
  private readonly logger = new Logger(CancelBookingUseCase.name);

  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly readModelRepo: BookingReadModelRepository,
    private readonly publisher: BookingEventPublisher,
    private readonly inventoryClient: InventoryServiceClient,
    private readonly paymentClient: PaymentServiceClient,
    private readonly metrics: BookingMetricsService,
  ) {}

  async execute(
    bookingId: string,
    dto: CancelBookingDto,
    correlationId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (booking.status === 'CANCELLED' as any) {
      throw new ConflictException('Booking is already cancelled', 'BOOKING_ALREADY_CANCELLED');
    }

    const reason = dto.reason ?? 'Cancelled by user';
    booking.cancel(reason);

    // Best-effort cancel reservation
    if (booking.reservationId) {
      try {
        await this.inventoryClient.cancelReservation(booking.reservationId, correlationId);
      } catch (err) {
        this.logger.error(`Failed to cancel reservation ${booking.reservationId}: ${(err as Error).message}`);
      }
    }

    // Best-effort refund
    if (booking.paymentId) {
      try {
        await this.paymentClient.refundPayment(booking.paymentId, correlationId);
      } catch (err) {
        this.logger.error(`Failed to refund payment ${booking.paymentId}: ${(err as Error).message}`);
      }
    }

    await this.bookingRepo.save(booking);
    this.metrics.incrementBookingsCancelled();

    const event = new BookingCancelledEvent({
      aggregateId: booking.id,
      correlationId,
      data: {
        travelerId: booking.travelerId,
        reason,
        cancelledAt: booking.cancelledAt?.toISOString() ?? new Date().toISOString(),
      },
    });
    try {
      await this.publisher.publishBookingCancelled(event);
    } catch (err) {
      this.logger.error(`Failed to publish BookingCancelled: ${(err as Error).message}`);
    }

    await this.readModelRepo.updateStatus(booking.id, 'CANCELLED');

    return BookingMapper.toDto(booking);
  }
}
