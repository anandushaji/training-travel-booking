import { Injectable } from '@nestjs/common';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { AdminTravelerResponseDto } from '../dto/admin-traveler-response.dto';

@Injectable()
export class GetAdminTravelersUseCase {
  constructor(private readonly repository: ITravelerRepository) {}

  async execute(): Promise<AdminTravelerResponseDto[]> {
    const travelers = await this.repository.findAll(true);
    return travelers.map((t) => new AdminTravelerResponseDto(t));
  }
}
