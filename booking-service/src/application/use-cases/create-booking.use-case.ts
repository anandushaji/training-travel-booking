import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Booking } from '../../domain/aggregates/booking.aggregate';
import { Itinerary, CabinClass } from '../../domain/value-objects/itinerary.value-object';
import { BookingRepository } from '../../infrastructure/repositories/booking.repository';
import { BookingReadModelRepository } from '../../infrastructure/repositories/booking-read-model.repository';
import { BookingEventPublisher } from '../../infrastructure/kafka/booking-event.publisher';
import { BookingMetricsService } from '../../infrastructure/metrics/booking-metrics.service';
import { BookingSagaOrchestrator } from '../saga/booking-saga.orchestrator';
import { BookingMapper } from '../mappers/booking.mapper';
import { CreateBookingDto } from '../dtos/create-booking.dto';
import { BookingResponseDto } from '../dtos/booking-response.dto';
import { BookingCreatedEvent } from '../../domain/events/booking-created.event';

interface JwtPayload {
  sub: string;
  role: 'EMPLOYEE' | 'MANAGER' | 'ADMIN';
}

@Injectable()
export class CreateBookingUseCase {
  private readonly logger = new Logger(CreateBookingUseCase.name);

  constructor(
    private readonly bookingRepo: BookingRepository,
    private readonly readModelRepo: BookingReadModelRepository,
    private readonly publisher: BookingEventPublisher,
    private readonly orchestrator: BookingSagaOrchestrator,
    private readonly metrics: BookingMetricsService,
  ) {}

  async execute(
    dto: CreateBookingDto,
    jwtPayload: JwtPayload,
    correlationId: string,
  ): Promise<BookingResponseDto> {
    // RBAC: EMPLOYEE can only book for themselves
    if (jwtPayload.role === 'EMPLOYEE' && dto.travelerId !== jwtPayload.sub) {
      throw new ForbiddenException('EMPLOYEE can only create bookings for themselves');
    }

    const itinerary = new Itinerary({
      origin: dto.itinerary.origin,
      destination: dto.itinerary.destination,
      departureDate: new Date(dto.itinerary.departureDate),
      ...(dto.itinerary.returnDate !== undefined ? { returnDate: new Date(dto.itinerary.returnDate) } : {}),
      cabinClass: dto.itinerary.cabinClass as CabinClass,
      passengers: dto.itinerary.passengers,
    });

    const booking = Booking.create({
      travelerId: dto.travelerId,
      offerId: dto.flightOfferId,
      itinerary,
      totalAmount: dto.totalAmount,
      currency: dto.currency ?? 'USD',
    });

    await this.bookingRepo.save(booking);
    this.metrics.incrementBookingsCreated();

    // Publish BookingCreated (fire-and-forget)
    try {
      const event = new BookingCreatedEvent({
        aggregateId: booking.id,
        correlationId,
        data: {
          travelerId: booking.travelerId,
          offerId: booking.offerId,
          itinerary: booking.itinerary.toJSON(),
          totalAmount: booking.totalAmount,
          currency: booking.currency,
        },
      });
      await this.publisher.publishBookingCreated(event);
    } catch (err) {
      this.logger.error(`Failed to publish BookingCreated: ${(err as Error).message}`);
    }

    // Run saga
    try {
      await this.orchestrator.execute(booking, correlationId);
    } catch (err) {
      // Persist failed booking
      booking.fail((err as Error).message);
      await this.bookingRepo.save(booking);

      // Upsert read model with FAILED status
      await this.readModelRepo.upsert(BookingMapper.toReadModelRow(booking));
      throw err;
    }

    await this.bookingRepo.save(booking);

    // Upsert read model
    await this.readModelRepo.upsert(BookingMapper.toReadModelRow(booking));

    return BookingMapper.toDto(booking);
  }
}
