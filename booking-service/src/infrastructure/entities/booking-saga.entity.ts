import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { BookingEntity } from './booking.entity';
import { BookingSagaStepEntity } from './booking-saga-step.entity';

@Entity('booking_sagas')
export class BookingSagaEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', type: 'uuid' })
  @Index('idx_booking_sagas_booking_id')
  bookingId!: string;

  @ManyToOne(() => BookingEntity)
  @JoinColumn({ name: 'booking_id' })
  booking!: BookingEntity;

  @Column({ type: 'varchar', length: 50 })
  status!: string;

  @Column({ name: 'current_step', type: 'int', default: 0 })
  currentStep!: number;

  @OneToMany(() => BookingSagaStepEntity, (step) => step.saga, { cascade: true, eager: true })
  steps!: BookingSagaStepEntity[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
