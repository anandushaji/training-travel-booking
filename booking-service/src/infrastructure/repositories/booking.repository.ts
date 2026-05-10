import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking, BookingProps } from '../../domain/aggregates/booking.aggregate';
import { BookingEntity } from '../entities/booking.entity';
import { BookingStatus } from '../../domain/value-objects/booking-status.enum';
import { Itinerary } from '../../domain/value-objects/itinerary.value-object';
import { CabinClass } from '../../domain/value-objects/itinerary.value-object';
import { generateUuid } from '@travel/shared';

@Injectable()
export class BookingRepository {
  constructor(
    @InjectRepository(BookingEntity)
    private readonly repo: Repository<BookingEntity>,
  ) {}

  async save(booking: Booking): Promise<void> {
    const entity = this.toEntity(booking);
    await this.repo.save(entity);
  }

  async findById(id: string): Promise<Booking | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async findByTravelerId(
    travelerId: string,
    filters?: { status?: string; page?: number; limit?: number },
  ): Promise<Booking[]> {
    const qb = this.repo.createQueryBuilder('b').where('b.travelerId = :travelerId', { travelerId });
    if (filters?.status) {
      qb.andWhere('b.status = :status', { status: filters.status });
    }
    const limit = filters?.limit ?? 20;
    const page = filters?.page ?? 1;
    qb.skip((page - 1) * limit).take(limit).orderBy('b.createdAt', 'DESC');
    const entities = await qb.getMany();
    return entities.map((e: BookingEntity) => this.toDomain(e));
  }

  private toEntity(booking: Booking): BookingEntity {
    const entity = new BookingEntity();
    entity.id = booking.id;
    entity.travelerId = booking.travelerId;
    entity.offerId = booking.offerId;
    entity.status = booking.status;
    entity.itinerary = booking.itinerary.toJSON();
    entity.policyValidationId = booking.policyValidationId ?? null;
    entity.reservationId = booking.reservationId ?? null;
    entity.paymentId = booking.paymentId ?? null;
    entity.totalAmount = booking.totalAmount.toString();
    entity.currency = booking.currency;
    entity.specialRequests = booking.specialRequests ?? null;
    entity.travelerName = booking.travelerName ?? null;
    entity.travelerEmail = booking.travelerEmail ?? null;
    entity.confirmedAt = booking.confirmedAt ?? null;
    entity.cancelledAt = booking.cancelledAt ?? null;
    entity.cancelReason = booking.cancelReason ?? null;
    entity.version = booking.version;
    return entity;
  }

  private toDomain(entity: BookingEntity): Booking {
    const itin = entity.itinerary as any;
    const itinerary = new Itinerary({
      origin: itin.origin,
      destination: itin.destination,
      departureDate: new Date(itin.departureDate),
      ...(itin.returnDate !== undefined ? { returnDate: new Date(itin.returnDate) } : {}),
      cabinClass: itin.cabinClass as CabinClass,
      passengers: itin.passengers,
    });

    const booking = new (Booking as any)({
      id: entity.id,
      travelerId: entity.travelerId,
      offerId: entity.offerId,
      status: entity.status as BookingStatus,
      itinerary,
      policyValidationId: entity.policyValidationId ?? undefined,
      reservationId: entity.reservationId ?? undefined,
      paymentId: entity.paymentId ?? undefined,
      totalAmount: parseFloat(entity.totalAmount),
      currency: entity.currency,
      specialRequests: entity.specialRequests ?? undefined,
      travelerName: entity.travelerName ?? undefined,
      travelerEmail: entity.travelerEmail ?? undefined,
      confirmedAt: entity.confirmedAt ?? undefined,
      cancelledAt: entity.cancelledAt ?? undefined,
      cancelReason: entity.cancelReason ?? undefined,
    });
    booking.reconstitute(
      {
        id: entity.id,
        travelerId: entity.travelerId,
        offerId: entity.offerId,
        status: entity.status as BookingStatus,
        itinerary,
        policyValidationId: entity.policyValidationId ?? undefined,
        reservationId: entity.reservationId ?? undefined,
        paymentId: entity.paymentId ?? undefined,
        totalAmount: parseFloat(entity.totalAmount),
        currency: entity.currency,
        specialRequests: entity.specialRequests ?? undefined,
        travelerName: entity.travelerName ?? undefined,
        travelerEmail: entity.travelerEmail ?? undefined,
        confirmedAt: entity.confirmedAt ?? undefined,
        cancelledAt: entity.cancelledAt ?? undefined,
        cancelReason: entity.cancelReason ?? undefined,
      },
      entity.version,
    );
    return booking;
  }
}
