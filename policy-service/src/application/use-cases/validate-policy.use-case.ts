import { Injectable, Logger } from '@nestjs/common';
import { TravelPolicyRepository } from '../../infrastructure/repositories/travel-policy.repository';
import { PolicyViolationRepository } from '../../infrastructure/repositories/policy-violation.repository';
import { TravelerServiceClient } from '../../infrastructure/http/traveler-service.client';
import { PolicyCacheService } from '../../infrastructure/cache/policy-cache.service';
import { PolicyEventPublisher } from '../../infrastructure/kafka/policy-event.publisher';
import { PolicyMetricsService } from '../../infrastructure/metrics/policy-metrics.service';
import { PolicyValidatorDomainService } from '../../domain/services/policy-validator.domain-service';
import { PolicyValidationRequestDto } from '../dtos/policy-validation-request.dto';
import { PolicyValidationResponseDto } from '../dtos/policy-validation-response.dto';
import { PolicyValidatedEvent } from '../../domain/events/policy-validated.event';
import { PolicyViolationDetectedEvent } from '../../domain/events/policy-violation-detected.event';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  department: string;
  iat: number;
  exp: number;
}

@Injectable()
export class ValidatePolicyUseCase {
  private readonly logger = new Logger(ValidatePolicyUseCase.name);

  constructor(
    private readonly policyRepository: TravelPolicyRepository,
    private readonly violationRepository: PolicyViolationRepository,
    private readonly travelerClient: TravelerServiceClient,
    private readonly cacheService: PolicyCacheService,
    private readonly eventPublisher: PolicyEventPublisher,
    private readonly metrics: PolicyMetricsService,
    private readonly policyValidator: PolicyValidatorDomainService,
  ) {}

  async execute(
    dto: PolicyValidationRequestDto,
    jwtPayload: JwtPayload,
    correlationId: string,
  ): Promise<PolicyValidationResponseDto> {
    // Step 1: Resolve traveler department
    let department = await this.cacheService.getTravelerDepartment(dto.travelerId);
    if (department === null) {
      department = await this.travelerClient.getTravelerDepartment(
        dto.travelerId,
        jwtPayload.department,
      );
      await this.cacheService.setTravelerDepartment(dto.travelerId, department);
    }

    // Step 2: Get policies for department
    let policies = await this.cacheService.getPoliciesForDepartment(department);
    if (policies === null) {
      policies = await this.policyRepository.findByDepartment(department, true);
      await this.cacheService.setPoliciesForDepartment(department, policies);
    }

    // Step 3: Pick the first active policy (most-specific = first match)
    const policy = policies.length > 0 ? (policies[0] ?? null) : null;

    // Step 4: Validate
    const validationResult = this.policyValidator.validate(
      {
        travelerId: dto.travelerId,
        amount: dto.amount,
        ...(dto.cabinClass !== undefined && { cabinClass: dto.cabinClass }),
        ...(dto.origin !== undefined && { origin: dto.origin }),
        ...(dto.destination !== undefined && { destination: dto.destination }),
        ...(dto.advanceBookingDays !== undefined && { advanceBookingDays: dto.advanceBookingDays }),
      },
      policy,
    );

    // Step 5: Persist violation if any
    if (!validationResult.valid && policy !== null) {
      await this.violationRepository.save({
        policyId: policy.id,
        travelerId: dto.travelerId,
        ...(dto.bookingRef !== undefined && { bookingRef: dto.bookingRef }),
        violations: validationResult.violations,
        requiresApproval: validationResult.requiresApproval,
      });
    }

    // Step 6: Update metrics
    this.metrics.incrementValidationsTotal(validationResult.valid ? 'valid' : 'invalid');

    // Step 7: Publish Kafka event (fire-and-forget)
    const policyId = policy?.id ?? null;
    if (validationResult.valid) {
      this.eventPublisher
        .publishPolicyValidated(
          new PolicyValidatedEvent({
            aggregateId: dto.travelerId,
            correlationId,
            data: {
              travelerId: dto.travelerId,
              policyId,
              valid: true,
              violations: [],
            },
          }),
        )
        .catch((err: Error) => {
          this.logger.error(`Failed to publish PolicyValidated: ${err.message}`);
        });
    } else {
      this.eventPublisher
        .publishPolicyViolationDetected(
          new PolicyViolationDetectedEvent({
            aggregateId: dto.travelerId,
            correlationId,
            data: {
              travelerId: dto.travelerId,
              policyId: policyId ?? dto.travelerId,
              violations: validationResult.violations,
              requiresApproval: validationResult.requiresApproval,
            },
          }),
        )
        .catch((err: Error) => {
          this.logger.error(`Failed to publish PolicyViolationDetected: ${err.message}`);
        });
    }

    return {
      valid: validationResult.valid,
      violations: validationResult.violations,
      requiresApproval: validationResult.requiresApproval,
      policyId,
      department,
    };
  }
}
