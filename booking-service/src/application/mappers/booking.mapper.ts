import { BookingResponseDto } from '../dtos/booking-response.dto';
import { Booking } from '../../domain/aggregates/booking.aggregate';
import { BookingReadModelRow } from '../../infrastructure/repositories/booking-read-model.repository';

export class BookingMapper {
  static toDto(source: Booking | BookingReadModelRow): BookingResponseDto {
    const dto = new BookingResponseDto();

    if (source instanceof Booking) {
      dto.id = source.id;
      dto.travelerId = source.travelerId;
      dto.offerId = source.offerId;
      dto.status = source.status;
      dto.itinerary = source.itinerary.toJSON();
      dto.totalAmount = source.totalAmount;
      dto.currency = source.currency;
      if (source.reservationId !== undefined) dto.reservationId = source.reservationId;
      if (source.paymentId !== undefined) dto.paymentId = source.paymentId;
      if (source.specialRequests !== undefined) dto.specialRequests = source.specialRequests;
      if (source.travelerName !== undefined) dto.travelerName = source.travelerName;
      if (source.travelerEmail !== undefined) dto.travelerEmail = source.travelerEmail;
      if (source.confirmedAt !== undefined) dto.confirmedAt = source.confirmedAt.toISOString();
      if (source.cancelledAt !== undefined) dto.cancelledAt = source.cancelledAt.toISOString();
      if (source.cancelReason !== undefined) dto.cancelReason = source.cancelReason;
    } else {
      // BookingReadModelRow
      dto.id = source.id;
      dto.travelerId = source.travelerId;
      dto.offerId = '';
      dto.status = source.status;
      dto.itinerary = {
        origin: source.origin,
        destination: source.destination,
        departureDate: source.departureDate,
        ...(source.returnDate !== undefined && { returnDate: source.returnDate }),
        ...(source.cabinClass !== undefined && { cabinClass: source.cabinClass }),
      };
      dto.totalAmount = source.totalAmount;
      dto.currency = source.currency;
      if (source.travelerName !== undefined) dto.travelerName = source.travelerName;
      if (source.travelerEmail !== undefined) dto.travelerEmail = source.travelerEmail;
      dto.createdAt = source.createdAt.toISOString();
    }

    return dto;
  }

  static toReadModelRow(booking: Booking): BookingReadModelRow {
    const itin = booking.itinerary;
    const row: BookingReadModelRow = {
      id: booking.id,
      travelerId: booking.travelerId,
      status: booking.status,
      origin: itin.origin,
      destination: itin.destination,
      departureDate: itin.departureDate.toISOString().split('T')[0] as string,
      totalAmount: booking.totalAmount,
      currency: booking.currency,
      createdAt: new Date(),
    };
    if (booking.travelerName !== undefined) row.travelerName = booking.travelerName;
    if (booking.travelerEmail !== undefined) row.travelerEmail = booking.travelerEmail;
    if (itin.returnDate !== undefined) row.returnDate = itin.returnDate.toISOString().split('T')[0] as string;
    if (itin.cabinClass !== undefined) row.cabinClass = itin.cabinClass;
    return row;
  }
}
