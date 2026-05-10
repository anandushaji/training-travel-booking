import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { FlightReservation } from '../../../domain/aggregates/flight-reservation.aggregate';
import { IFlightReservationRepository } from '../../../domain/repositories/flight-reservation.repository.interface';
import { FlightReservationTypeOrmEntity } from '../entities/flight-reservation.typeorm-entity';
import { FlightReservationMapper } from '../../../application/mappers/flight-reservation.mapper';

@Injectable()
export class FlightReservationTypeOrmRepository implements IFlightReservationRepository {
  private readonly logger = new Logger(FlightReservationTypeOrmRepository.name);
  private readonly encryptionKey: string;

  constructor(
    @InjectRepository(FlightReservationTypeOrmEntity)
    private readonly repo: Repository<FlightReservationTypeOrmEntity>,
    private readonly config: ConfigService,
  ) {
    this.encryptionKey = this.config.get<string>('PASSPORT_ENCRYPTION_KEY') ?? '';
  }

  async findById(id: string): Promise<FlightReservation | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return FlightReservationMapper.toDomain(entity, this.encryptionKey);
  }

  async save(reservation: FlightReservation): Promise<void> {
    const existing = await this.repo.findOne({ where: { id: reservation.id } });
    if (existing) {
      FlightReservationMapper.updateEntity(existing, reservation);
      await this.repo.save(existing);
    } else {
      const entity = FlightReservationMapper.toPersistence(reservation, this.encryptionKey);
      await this.repo.save(entity);
    }
  }

  async findPendingExpired(now: Date): Promise<FlightReservation[]> {
    const entities = await this.repo.find({
      where: {
        status: 'PENDING',
        expiresAt: LessThan(now),
      },
    });
    return entities.map((e) => FlightReservationMapper.toDomain(e, this.encryptionKey));
  }
}
