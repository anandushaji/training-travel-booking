import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Receipt, ReceiptProps } from '../../domain/aggregates/receipt.aggregate';
import { ReceiptEntity } from '../entities/receipt.entity';
import { ReceiptStatus } from '../../domain/value-objects/receipt-status.enum';

@Injectable()
export class ReceiptRepository {
  constructor(
    @InjectRepository(ReceiptEntity)
    private readonly repo: Repository<ReceiptEntity>,
  ) {}

  async save(receipt: Receipt, em?: EntityManager): Promise<void> {
    const entity = this.toEntity(receipt);
    if (em) {
      await em.save(ReceiptEntity, entity);
    } else {
      await this.repo.save(entity);
    }
  }

  async findById(id: string): Promise<Receipt | null> {
    const entity = await this.repo.findOneBy({ id });
    return entity ? this.toDomain(entity) : null;
  }

  async findByBookingId(bookingId: string): Promise<Receipt | null> {
    const entity = await this.repo.findOneBy({ bookingId });
    return entity ? this.toDomain(entity) : null;
  }

  async findByTravelerId(travelerId: string): Promise<Receipt[]> {
    const entities = await this.repo.findBy({ travelerId });
    return entities.map((e: ReceiptEntity) => this.toDomain(e));
  }

  private toEntity(receipt: Receipt): ReceiptEntity {
    const e = new ReceiptEntity();
    e.id = receipt.id;
    e.receiptNumber = receipt.receiptNumber;
    e.bookingId = receipt.bookingId;
    e.travelerId = receipt.travelerId;
    e.travelerName = receipt.travelerName;
    e.travelerEmail = receipt.travelerEmail;
    e.amount = receipt.amount;
    e.currency = receipt.currency;
    e.origin = receipt.origin;
    e.destination = receipt.destination;
    e.departureDate = receipt.departureDate;
    e.status = receipt.status;
    e.generatedAt = receipt.generatedAt;
    if (receipt.voidedAt !== undefined) {
      e.voidedAt = receipt.voidedAt;
    }
    return e;
  }

  private toDomain(e: ReceiptEntity): Receipt {
    const props: ReceiptProps = {
      id: e.id,
      receiptNumber: e.receiptNumber,
      bookingId: e.bookingId,
      travelerId: e.travelerId,
      travelerName: e.travelerName,
      travelerEmail: e.travelerEmail,
      amount: Number(e.amount),
      currency: e.currency,
      origin: e.origin,
      destination: e.destination,
      departureDate: e.departureDate,
      status: e.status as ReceiptStatus,
      generatedAt: e.generatedAt,
      ...(e.voidedAt !== undefined && e.voidedAt !== null ? { voidedAt: e.voidedAt } : {}),
    };
    return new Receipt(props);
  }
}
