import { Injectable } from '@nestjs/common';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerResponseDto } from '../dto/traveler-response.dto';

@Injectable()
export class GetTravelersUseCase {
  constructor(private readonly repository: ITravelerRepository) {}

  async execute(): Promise<TravelerResponseDto[]> {
    const travelers = await this.repository.findAll(false);
    return travelers.map((t) => new TravelerResponseDto(t));
  }
}
