import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { KafkaModule } from '@travel/shared';
import { TravelPolicyEntity } from './infrastructure/entities/travel-policy.entity';
import { DepartmentalBudgetEntity } from './infrastructure/entities/departmental-budget.entity';
import { PolicyViolationEntity } from './infrastructure/entities/policy-violation.entity';
import { TravelPolicyRepository } from './infrastructure/repositories/travel-policy.repository';
import { DepartmentalBudgetRepository } from './infrastructure/repositories/departmental-budget.repository';
import { PolicyViolationRepository } from './infrastructure/repositories/policy-violation.repository';
import { TravelerServiceClient } from './infrastructure/http/traveler-service.client';
import { PolicyCacheService } from './infrastructure/cache/policy-cache.service';
import { PolicyEventPublisher } from './infrastructure/kafka/policy-event.publisher';
import { PolicyMetricsService } from './infrastructure/metrics/policy-metrics.service';
import { CreatePolicyUseCase } from './application/use-cases/create-policy.use-case';
import { GetPolicyUseCase } from './application/use-cases/get-policy.use-case';
import { ListPoliciesUseCase } from './application/use-cases/list-policies.use-case';
import { UpdatePolicyUseCase } from './application/use-cases/update-policy.use-case';
import { DeletePolicyUseCase } from './application/use-cases/delete-policy.use-case';
import { ValidatePolicyUseCase } from './application/use-cases/validate-policy.use-case';
import { CreateBudgetUseCase } from './application/use-cases/create-budget.use-case';
import { GetBudgetUseCase } from './application/use-cases/get-budget.use-case';
import { ListBudgetsUseCase } from './application/use-cases/list-budgets.use-case';
import { GetRemainingBudgetUseCase } from './application/use-cases/get-remaining-budget.use-case';
import { PolicyController } from './presentation/controllers/policy.controller';
import { BudgetController } from './presentation/controllers/budget.controller';
import { MetricsController } from './presentation/controllers/metrics.controller';
import { PolicyValidatorDomainService } from './domain/services/policy-validator.domain-service';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      TravelPolicyEntity,
      DepartmentalBudgetEntity,
      PolicyViolationEntity,
    ]),
    KafkaModule.register({
      clientId: process.env['KAFKA_CLIENT_ID'] ?? 'policy-service',
      brokers: (process.env['KAFKA_BROKERS'] ?? 'localhost:9092').split(','),
      groupId: process.env['KAFKA_GROUP_ID'] ?? 'policy-service-group',
    }),
  ],
  controllers: [PolicyController, BudgetController, MetricsController],
  providers: [
    // Infrastructure
    PolicyMetricsService,
    TravelPolicyRepository,
    DepartmentalBudgetRepository,
    PolicyViolationRepository,
    TravelerServiceClient,
    PolicyCacheService,
    PolicyEventPublisher,
    // Domain services
    PolicyValidatorDomainService,
    // Use cases
    CreatePolicyUseCase,
    GetPolicyUseCase,
    ListPoliciesUseCase,
    UpdatePolicyUseCase,
    DeletePolicyUseCase,
    ValidatePolicyUseCase,
    CreateBudgetUseCase,
    GetBudgetUseCase,
    ListBudgetsUseCase,
    GetRemainingBudgetUseCase,
  ],
  exports: [PolicyMetricsService],
})
export class PolicyModule {}
