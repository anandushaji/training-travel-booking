import { Injectable } from '@nestjs/common';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
import { TravelerNotFoundException } from '../../domain/exceptions/traveler-not-found.exception';
import { UpdateTravelerDto } from '../dto/update-traveler.dto';
import { TravelerResponseDto } from '../dto/traveler-response.dto';

@Injectable()
export class UpdateTravelerUseCase {
  constructor(
    private readonly repository: ITravelerRepository,
    private readonly cache: TravelerCacheService,
    private readonly publisher: TravelerEventPublisher,
  ) {}

  async execute(
    travelerId: string,
    dto: UpdateTravelerDto,
    correlationId?: string,
  ): Promise<TravelerResponseDto> {
    const traveler = await this.repository.findById(travelerId);
    if (!traveler) throw new TravelerNotFoundException(travelerId);

    traveler.update({ ...dto, ...(correlationId !== undefined && { correlationId }) });
    await this.repository.save(traveler);
    await this.cache.invalidate(travelerId);

    for (const event of traveler.getUncommittedEvents()) {
      await this.publisher.publish(event);
    }
    traveler.clearEvents();

    return new TravelerResponseDto(traveler);
  }
}
