import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('expenses')
export class ExpenseEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'booking_id', unique: true })
  bookingId!: string;

  @Column({ name: 'receipt_id' })
  receiptId!: string;

  @Column({ name: 'traveler_id' })
  travelerId!: string;

  @Column({ name: 'traveler_name' })
  travelerName!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 3 })
  currency!: string;

  @Column({ default: 'FLIGHT' })
  category!: string;

  @Column({ default: 'Travel expense' })
  description!: string;

  @Column({ name: 'expense_date', type: 'date' })
  expenseDate!: Date;

  @Column({ default: 'ACTIVE' })
  status!: string;

  @Column({ name: 'cancelled_at', nullable: true, type: 'timestamptz' })
  cancelledAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
