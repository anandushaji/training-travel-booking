import { Injectable } from '@nestjs/common';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
import { TravelerNotFoundException } from '../../domain/exceptions/traveler-not-found.exception';
import { TravelerPreferences } from '../../domain/value-objects/traveler-preferences.value-object';
import { TravelerPreferencesDto } from '../dto/traveler-preferences.dto';

@Injectable()
export class UpdateTravelerPreferencesUseCase {
  constructor(
    private readonly repository: ITravelerRepository,
    private readonly cache: TravelerCacheService,
    private readonly publisher: TravelerEventPublisher,
  ) {}

  async execute(
    travelerId: string,
    dto: TravelerPreferencesDto,
    correlationId?: string,
  ): Promise<TravelerPreferencesDto> {
    const traveler = await this.repository.findById(travelerId);
    if (!traveler) throw new TravelerNotFoundException(travelerId);

    const newPrefs = TravelerPreferences.from({
      ...traveler.preferences.toPlainObject(),
      ...dto,
    });

    traveler.updatePreferences(newPrefs, correlationId);
    await this.repository.save(traveler);
    await this.cache.invalidate(travelerId);

    for (const event of traveler.getUncommittedEvents()) {
      await this.publisher.publish(event);
    }
    traveler.clearEvents();

    return traveler.preferences.toPlainObject() as TravelerPreferencesDto;
  }
}
