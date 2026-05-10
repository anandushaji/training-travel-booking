import { Injectable, Logger } from '@nestjs/common';
import { BookingReadModelRepository } from '../../infrastructure/repositories/booking-read-model.repository';
import { BookingConfirmedEvent } from '../../domain/events/booking-confirmed.event';
import { BookingCancelledEvent } from '../../domain/events/booking-cancelled.event';

@Injectable()
export class BookingReadModelUpdater {
  private readonly logger = new Logger(BookingReadModelUpdater.name);

  constructor(
    private readonly readModelRepo: BookingReadModelRepository,
  ) {}

  async onBookingConfirmed(event: BookingConfirmedEvent): Promise<void> {
    try {
      await this.readModelRepo.upsert({
        id: event.aggregateId,
        travelerId: event.data.travelerId,
        travelerName: event.data.travelerName,
        travelerEmail: event.data.travelerEmail,
        status: 'CONFIRMED',
        origin: (event.data.itinerary as any).origin,
        destination: (event.data.itinerary as any).destination,
        departureDate: (event.data.itinerary as any).departureDate,
        returnDate: (event.data.itinerary as any).returnDate,
        cabinClass: (event.data.itinerary as any).cabinClass,
        totalAmount: event.data.totalAmount,
        currency: event.data.currency,
        createdAt: new Date(),
      });
    } catch (err) {
      this.logger.error(`Failed to update read model on BookingConfirmed: ${(err as Error).message}`);
    }
  }

  async onBookingCancelled(event: BookingCancelledEvent): Promise<void> {
    try {
      await this.readModelRepo.updateStatus(event.aggregateId, 'CANCELLED');
    } catch (err) {
      this.logger.error(`Failed to update read model on BookingCancelled: ${(err as Error).message}`);
    }
  }
}
