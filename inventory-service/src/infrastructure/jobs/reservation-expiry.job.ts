import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { IFlightReservationRepository, FLIGHT_RESERVATION_REPOSITORY } from '../../domain/repositories/flight-reservation.repository.interface';
import { InventoryEventPublisher } from '../kafka/inventory-event.publisher';
import { MetricsService } from '../observability/metrics.service';

@Injectable()
export class ReservationExpiryJob {
  private readonly logger = new Logger(ReservationExpiryJob.name);

  constructor(
    @Inject(FLIGHT_RESERVATION_REPOSITORY)
    private readonly reservationRepo: IFlightReservationRepository,
    private readonly eventPublisher: InventoryEventPublisher,
    private readonly metrics: MetricsService,
  ) {}

  @Cron('* * * * *')
  async expireReservations(): Promise<void> {
    const expired = await this.reservationRepo.findPendingExpired(new Date());
    for (const reservation of expired) {
      try {
        reservation.expire();
        await this.reservationRepo.save(reservation);

        const events = reservation.getUncommittedEvents();
        for (const event of events) {
          await this.eventPublisher.publish(event);
        }
        reservation.clearEvents();

        this.metrics.incrementReservationsExpired();
        this.logger.log('reservation_expired', { reservationId: reservation.id });
      } catch (err) {
        this.logger.error('expiry_job_item_failed', {
          reservationId: reservation.id,
          error: String(err),
        });
      }
    }
  }
}
