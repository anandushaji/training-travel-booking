import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  VersionColumn,
  Unique,
} from 'typeorm';
import { PolicyRulesProps } from '../../domain/value-objects/policy-rules.value-object';

@Entity('travel_policies')
@Unique(['name', 'department'])
export class TravelPolicyEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  @Index('idx_travel_policies_name')
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100 })
  @Index('idx_travel_policies_department')
  department!: string;

  @Column({ type: 'jsonb' })
  rules!: PolicyRulesProps;

  @Column({ type: 'boolean', default: true })
  active!: boolean;

  @Column({ name: 'created_by', type: 'varchar', length: 255 })
  createdBy!: string;

  @VersionColumn()
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
