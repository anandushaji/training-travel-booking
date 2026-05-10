import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { TravelerTypeOrmEntity } from '../persistence/entities/traveler.typeorm-entity';
import { TravelerMapper } from '../../application/mappers/traveler.mapper';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class GdprAnonymisationJob {
  private readonly logger = new Logger(GdprAnonymisationJob.name);

  constructor(
    @InjectRepository(TravelerTypeOrmEntity)
    private readonly typeormRepo: Repository<TravelerTypeOrmEntity>,
  ) {}

  /** Runs nightly at 02:00 UTC */
  @Cron('0 2 * * *')
  async run(): Promise<void> {
    const threshold = new Date(Date.now() - THIRTY_DAYS_MS);

    const entities = await this.typeormRepo.find({
      where: {
        deletedAt: LessThan(threshold),
        anonymisedAt: IsNull(),
      },
    });

    if (entities.length === 0) return;

    this.logger.log(`GDPR job: anonymising ${entities.length} traveler(s)`);

    for (const entity of entities) {
      const aggregate = TravelerMapper.toDomain(entity);
      aggregate.anonymisePii();
      TravelerMapper.updateEntity(entity, aggregate);
      await this.typeormRepo.save(entity);
      this.logger.log(`Anonymised travelerId=${entity.id}`);
    }
  }
}
