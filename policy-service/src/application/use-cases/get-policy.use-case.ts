import { Injectable } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyResponseDto } from '../dtos/policy-response.dto';
import { PolicyMapper } from '../mappers/policy.mapper';

@Injectable()
export class GetPolicyUseCase {
  constructor(private readonly policyRepository: TravelPolicyRepository) {}

  async execute(id: string): Promise<PolicyResponseDto> {
    const policy = await this.policyRepository.findById(id);
    if (!policy) {
      throw new NotFoundException(`Policy with id "${id}" not found`);
    }
    return PolicyMapper.toDto(policy);
  }
}
