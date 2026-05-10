import { Injectable } from '@nestjs/common';
import { Traveler } from '../../domain/aggregates/traveler.aggregate';
import { ITravelerRepository } from '../../domain/repositories/i-traveler.repository';
import { TravelerCacheService } from '../../infrastructure/cache/traveler-cache.service';
import { TravelerEventPublisher } from '../../infrastructure/kafka/traveler-event-publisher';
import { DuplicateEmployeeIdException } from '../../domain/exceptions/duplicate-employee-id.exception';
import { CreateTravelerDto } from '../dto/create-traveler.dto';
import { TravelerResponseDto } from '../dto/traveler-response.dto';

@Injectable()
export class CreateTravelerUseCase {
  constructor(
    private readonly repository: ITravelerRepository,
    private readonly cache: TravelerCacheService,
    private readonly publisher: TravelerEventPublisher,
  ) {}

  async execute(
    dto: CreateTravelerDto,
    correlationId?: string,
  ): Promise<TravelerResponseDto> {
    const existing = await this.repository.findByEmployeeId(dto.employeeId);
    if (existing) {
      throw new DuplicateEmployeeIdException(dto.employeeId);
    }

    const traveler = Traveler.create({
      employeeId: dto.employeeId,
      name: dto.name,
      email: dto.email,
      department: dto.department,
      role: dto.role,
      ...(correlationId !== undefined && { correlationId }),
    });

    await this.repository.save(traveler);

    for (const event of traveler.getUncommittedEvents()) {
      await this.publisher.publish(event);
    }
    traveler.clearEvents();

    return new TravelerResponseDto(traveler);
  }
}
