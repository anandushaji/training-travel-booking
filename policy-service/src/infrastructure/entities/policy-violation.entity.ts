import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { TravelPolicyEntity } from './travel-policy.entity';
import { PolicyViolation } from '../../domain/value-objects/policy-rules.value-object';

@Entity('policy_violations')
export class PolicyViolationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'policy_id', type: 'uuid', nullable: true })
  @Index('idx_policy_violations_policy_id')
  policyId!: string | null;

  @ManyToOne(() => TravelPolicyEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'policy_id' })
  policy!: TravelPolicyEntity | null;

  @Column({ name: 'traveler_id', type: 'uuid' })
  @Index('idx_policy_violations_traveler_id')
  travelerId!: string;

  @Column({ name: 'booking_ref', type: 'varchar', length: 255, nullable: true })
  bookingRef!: string | null;

  @Column({ type: 'jsonb' })
  violations!: PolicyViolation[];

  @Column({ name: 'requires_approval', type: 'boolean', default: false })
  requiresApproval!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
