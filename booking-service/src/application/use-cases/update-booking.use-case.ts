import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { BookingRepository } from '../../infrastructure/repositories/booking.repository';
import { BookingMapper } from '../mappers/booking.mapper';
import { UpdateBookingDto } from '../dtos/update-booking.dto';
import { BookingResponseDto } from '../dtos/booking-response.dto';

@Injectable()
export class UpdateBookingUseCase {
  constructor(
    private readonly bookingRepo: BookingRepository,
  ) {}

  async execute(
    bookingId: string,
    dto: UpdateBookingDto,
    _correlationId: string,
  ): Promise<BookingResponseDto> {
    const booking = await this.bookingRepo.findById(bookingId);
    if (!booking) {
      throw new NotFoundException(`Booking ${bookingId} not found`);
    }

    if (dto.specialRequests !== undefined) {
      booking.updateSpecialRequests(dto.specialRequests);
    }

    await this.bookingRepo.save(booking);
    return BookingMapper.toDto(booking);
  }
}
