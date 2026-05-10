import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { BookingSagaEntity } from './booking-saga.entity';

@Entity('booking_saga_steps')
export class BookingSagaStepEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'saga_id', type: 'uuid' })
  sagaId!: string;

  @ManyToOne(() => BookingSagaEntity, (saga) => saga.steps)
  @JoinColumn({ name: 'saga_id' })
  saga!: BookingSagaEntity;

  @Column({ name: 'step_number', type: 'int' })
  stepNumber!: number;

  @Column({ name: 'step_name', type: 'varchar', length: 100 })
  stepName!: string;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  startedAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'retry_count', type: 'int', default: 0 })
  retryCount!: number;
}
