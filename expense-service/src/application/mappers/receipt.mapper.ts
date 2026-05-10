import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import { ReceiptResponseDto } from '../dtos/receipt-response.dto';

export class ReceiptMapper {
  static toDto(receipt: Receipt): ReceiptResponseDto {
    const dto = new ReceiptResponseDto();
    dto.id = receipt.id;
    dto.receiptNumber = receipt.receiptNumber;
    dto.bookingId = receipt.bookingId;
    dto.travelerId = receipt.travelerId;
    dto.travelerName = receipt.travelerName;
    dto.travelerEmail = receipt.travelerEmail;
    dto.amount = receipt.amount;
    dto.currency = receipt.currency;
    dto.origin = receipt.origin;
    dto.destination = receipt.destination;
    dto.departureDate = receipt.departureDate instanceof Date
      ? receipt.departureDate.toISOString()
      : String(receipt.departureDate);
    dto.status = receipt.status;
    dto.generatedAt = receipt.generatedAt.toISOString();
    if (receipt.voidedAt !== undefined) {
      dto.voidedAt = receipt.voidedAt.toISOString();
    }
    return dto;
  }
}
