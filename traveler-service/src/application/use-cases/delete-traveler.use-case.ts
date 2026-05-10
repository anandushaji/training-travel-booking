import { Injectable } from '@nestjs/common';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
import { TravelerNotFoundException } from '../../domain/exceptions/traveler-not-found.exception';

@Injectable()
export class DeleteTravelerUseCase {
  constructor(
    private readonly repository: ITravelerRepository,
    private readonly cache: TravelerCacheService,
    private readonly publisher: TravelerEventPublisher,
  ) {}

  async execute(
    travelerId: string,
    correlationId?: string,
  ): Promise<void> {
    const traveler = await this.repository.findById(travelerId);
    if (!traveler) throw new TravelerNotFoundException(travelerId);

    traveler.softDelete(correlationId);
    await this.repository.save(traveler);
    await this.cache.invalidate(travelerId);

    for (const event of traveler.getUncommittedEvents()) {
      await this.publisher.publish(event);
    }
    traveler.clearEvents();
  }
}
