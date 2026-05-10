import { DataSource } from 'typeorm';
import { TravelPolicyEntity } from './entities/travel-policy.entity';
import { DepartmentalBudgetEntity } from './entities/departmental-budget.entity';
import { PolicyViolationEntity } from './entities/policy-violation.entity';
import { CreatePolicyTables1746000000000 } from './migrations/1746000000000-CreatePolicyTables';

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'] ?? '',
  entities: [TravelPolicyEntity, DepartmentalBudgetEntity, PolicyViolationEntity],
  migrations: [CreatePolicyTables1746000000000],
  schema: 'policy_service',
  synchronize: false,
  logging: ['error'],
});
