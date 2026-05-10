import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingReadModelEntity } from '../entities/booking-read-model.entity';

export interface BookingReadModelRow {
  id: string;
  travelerId: string;
  travelerName?: string;
  travelerEmail?: string;
  status: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabinClass?: string;
  totalAmount: number;
  currency: string;
  createdAt: Date;
}

@Injectable()
export class BookingReadModelRepository {
  constructor(
    @InjectRepository(BookingReadModelEntity)
    private readonly repo: Repository<BookingReadModelEntity>,
  ) {}

  async upsert(row: BookingReadModelRow): Promise<void> {
    await this.repo.upsert(
      {
        id: row.id,
        travelerId: row.travelerId,
        travelerName: row.travelerName ?? null,
        travelerEmail: row.travelerEmail ?? null,
        status: row.status,
        origin: row.origin,
        destination: row.destination,
        departureDate: row.departureDate,
        returnDate: row.returnDate ?? null,
        cabinClass: row.cabinClass ?? null,
        totalAmount: row.totalAmount.toString(),
        currency: row.currency,
        createdAt: row.createdAt,
      },
      ['id'],
    );
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.repo.update({ id }, { status });
  }

  async findById(id: string): Promise<BookingReadModelRow | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.toRow(entity);
  }

  async findByTravelerId(
    travelerId: string | undefined,
    filters?: { status?: string; page?: number; limit?: number },
  ): Promise<{ rows: BookingReadModelRow[]; total: number }> {
    const qb = this.repo.createQueryBuilder('r');
    if (travelerId) {
      qb.where('r.travelerId = :travelerId', { travelerId });
    }
    if (filters?.status) {
      travelerId
        ? qb.andWhere('r.status = :status', { status: filters.status })
        : qb.where('r.status = :status', { status: filters.status });
    }
    const limit = filters?.limit ?? 20;
    const page = filters?.page ?? 1;
    qb.skip((page - 1) * limit).take(limit).orderBy('r.createdAt', 'DESC');
    const [entities, total] = await qb.getManyAndCount();
    return { rows: entities.map((e: BookingReadModelEntity) => this.toRow(e)), total };
  }

  private toRow(entity: BookingReadModelEntity): BookingReadModelRow {
    const row: BookingReadModelRow = {
      id: entity.id,
      travelerId: entity.travelerId,
      status: entity.status,
      origin: entity.origin,
      destination: entity.destination,
      departureDate: entity.departureDate,
      totalAmount: parseFloat(entity.totalAmount),
      currency: entity.currency,
      createdAt: entity.createdAt,
    };
    if (entity.travelerName !== null && entity.travelerName !== undefined) row.travelerName = entity.travelerName;
    if (entity.travelerEmail !== null && entity.travelerEmail !== undefined) row.travelerEmail = entity.travelerEmail;
    if (entity.returnDate !== null && entity.returnDate !== undefined) row.returnDate = entity.returnDate;
    if (entity.cabinClass !== null && entity.cabinClass !== undefined) row.cabinClass = entity.cabinClass;
    return row;
  }
}
