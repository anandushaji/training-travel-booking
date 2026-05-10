import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('receipts')
export class ReceiptEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'receipt_number', unique: true })
  receiptNumber!: string;

  @Column({ name: 'booking_id', unique: true })
  bookingId!: string;

  @Column({ name: 'traveler_id' })
  travelerId!: string;

  @Column({ name: 'traveler_name' })
  travelerName!: string;

  @Column({ name: 'traveler_email' })
  travelerEmail!: string;

  @Column('decimal', { precision: 12, scale: 2 })
  amount!: number;

  @Column({ length: 3 })
  currency!: string;

  @Column()
  origin!: string;

  @Column()
  destination!: string;

  @Column({ name: 'departure_date', type: 'date' })
  departureDate!: Date;

  @Column({ default: 'ACTIVE' })
  status!: string;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt!: Date;

  @Column({ name: 'voided_at', nullable: true, type: 'timestamptz' })
  voidedAt?: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
