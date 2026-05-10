import { Injectable } from '@nestjs/common';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerNotFoundException } from '../../domain/exceptions/traveler-not-found.exception';
import { TravelerResponseDto } from '../dto/traveler-response.dto';
import { TravelerMapper } from '../mappers/traveler.mapper';

@Injectable()
export class GetTravelerUseCase {
  constructor(
    private readonly repository: ITravelerRepository,
    private readonly cache: TravelerCacheService,
  ) {}

  async execute(travelerId: string): Promise<TravelerResponseDto> {
    // Cache-aside: check Redis first
    const cached = await this.cache.get(travelerId);
    if (cached) {
      return cached as TravelerResponseDto;
    }

    // Cache miss — load from DB
    const traveler = await this.repository.findById(travelerId);
    if (!traveler) {
      throw new TravelerNotFoundException(travelerId);
    }

    const dto = new TravelerResponseDto(traveler);
    await this.cache.set(travelerId, TravelerMapper.toCache(traveler));
    return dto;
  }
}
