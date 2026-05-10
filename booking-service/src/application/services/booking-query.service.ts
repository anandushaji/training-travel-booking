import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { BookingReadModelRepository } from '../../infrastructure/repositories/booking-read-model.repository';
import { BookingMapper } from '../mappers/booking.mapper';
import { BookingResponseDto } from '../dtos/booking-response.dto';
import { ListBookingsDto, PaginationDto } from '../dtos/list-bookings.dto';

@Injectable()
export class BookingQueryService {
  constructor(
    private readonly readModelRepo: BookingReadModelRepository,
  ) {}

  async getById(id: string): Promise<BookingResponseDto> {
    const row = await this.readModelRepo.findById(id);
    if (!row) {
      throw new NotFoundException(`Booking ${id} not found`);
    }
    return BookingMapper.toDto(row);
  }

  async listBookings(
    filters: ListBookingsDto,
  ): Promise<{ bookings: BookingResponseDto[]; pagination: PaginationDto }> {
    const travelerId = filters.travelerId && filters.travelerId.trim() !== '' ? filters.travelerId : undefined;
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    const { rows, total } = await this.readModelRepo.findByTravelerId(travelerId, {
      ...(filters.status !== undefined ? { status: filters.status } : {}),
      page,
      limit,
    });

    const pagination: PaginationDto = {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    };

    return {
      bookings: rows.map((r) => BookingMapper.toDto(r)),
      pagination,
    };
  }
}
