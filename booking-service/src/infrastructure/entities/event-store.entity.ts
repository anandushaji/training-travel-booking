import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('event_store')
export class EventStoreEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  @Index('idx_event_store_aggregate')
  aggregateId!: string;

  @Column({ name: 'aggregate_type', type: 'varchar', length: 100 })
  aggregateType!: string;

  @Column({ name: 'event_type', type: 'varchar', length: 100 })
  @Index('idx_event_store_type')
  eventType!: string;

  @Column({ name: 'event_data', type: 'jsonb' })
  eventData!: Record<string, unknown>;

  @Column({ name: 'event_version', type: 'int' })
  eventVersion!: number;

  @CreateDateColumn({ name: 'occurred_on', type: 'timestamptz' })
  occurredOn!: Date;

  @Column({ name: 'correlation_id', type: 'uuid', nullable: true })
  @Index('idx_event_store_correlation')
  correlationId!: string | null;

  @Column({ name: 'causation_id', type: 'uuid', nullable: true })
  causationId!: string | null;
}
