import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { ProcessedEventEntity } from '../entities/processed-event.entity';

@Injectable()
export class ProcessedEventRepository {
  constructor(
    @InjectRepository(ProcessedEventEntity)
    private readonly repo: Repository<ProcessedEventEntity>,
  ) {}

  async exists(eventId: string): Promise<boolean> {
    const count = await this.repo.countBy({ eventId });
    return count > 0;
  }

  async save(eventId: string, eventType: string, em?: EntityManager): Promise<void> {
    const entity = new ProcessedEventEntity();
    entity.eventId = eventId;
    entity.eventType = eventType;
    if (em) {
      await em.save(ProcessedEventEntity, entity);
    } else {
      await this.repo.save(entity);
    }
  }
}
