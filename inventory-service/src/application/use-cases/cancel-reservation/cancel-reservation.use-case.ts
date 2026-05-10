import { Injectable, Inject } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { IFlightReservationRepository, FLIGHT_RESERVATION_REPOSITORY } from '../../../domain/repositories/flight-reservation.repository.interface';
import { AmadeusHttpClient } from '../../../infrastructure/amadeus/amadeus-http.client';
import { InventoryEventPublisher } from '../../../infrastructure/kafka/inventory-event.publisher';
import { CancelReservationCommand } from './cancel-reservation.command';

@Injectable()
export class CancelReservationUseCase {
  constructor(
    @Inject(FLIGHT_RESERVATION_REPOSITORY)
    private readonly reservationRepo: IFlightReservationRepository,
    private readonly amadeusClient: AmadeusHttpClient,
    private readonly eventPublisher: InventoryEventPublisher,
  ) {}

  async execute(command: CancelReservationCommand): Promise<void> {
    const reservation = await this.reservationRepo.findById(command.reservationId);
    if (!reservation) {
      throw new NotFoundException(`Reservation ${command.reservationId} not found`);
    }

    // This throws DomainException if status is EXPIRED/CANCELLED
    reservation.cancel(command.correlationId, command.causationId);

    // Cancel with Amadeus if we have an order ID
    if (reservation.amadeusOrderId !== null) {
      await this.amadeusClient.cancelOrder(reservation.amadeusOrderId);
    }

    await this.reservationRepo.save(reservation);

    const events = reservation.getUncommittedEvents();
    for (const event of events) {
      await this.eventPublisher.publish(event);
    }
    reservation.clearEvents();
  }
}
