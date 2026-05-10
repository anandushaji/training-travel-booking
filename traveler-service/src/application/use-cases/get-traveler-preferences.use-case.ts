import { Injectable } from '@nestjs/common';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerNotFoundException } from '../../domain/exceptions/traveler-not-found.exception';
import { TravelerPreferencesDto } from '../dto/traveler-preferences.dto';
import { TravelerMapper } from '../mappers/traveler.mapper';

@Injectable()
export class GetTravelerPreferencesUseCase {
  constructor(
    private readonly repository: ITravelerRepository,
    private readonly cache: TravelerCacheService,
  ) {}

  async execute(travelerId: string): Promise<TravelerPreferencesDto> {
    // Try cache first
    const cached = await this.cache.get(travelerId);
    if (cached) {
      return cached.preferences as TravelerPreferencesDto;
    }

    const traveler = await this.repository.findById(travelerId);
    if (!traveler) throw new TravelerNotFoundException(travelerId);

    await this.cache.set(travelerId, TravelerMapper.toCache(traveler));
    return traveler.preferences.toPlainObject() as TravelerPreferencesDto;
  }
}
