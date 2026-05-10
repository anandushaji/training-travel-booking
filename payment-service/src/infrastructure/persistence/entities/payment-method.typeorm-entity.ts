import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('payment_methods')
export class PaymentMethodTypeOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'traveler_id', type: 'uuid' })
  @Index('idx_payment_methods_traveler_id')
  travelerId!: string;

  @Column({ name: 'stripe_payment_method_id', type: 'varchar', length: 255, unique: true })
  stripePaymentMethodId!: string;

  @Column({ name: 'card_brand', type: 'varchar', length: 20 })
  cardBrand!: string;

  @Column({ name: 'last4', type: 'char', length: 4 })
  last4!: string;

  @Column({ name: 'expiry_month', type: 'smallint' })
  expiryMonth!: number;

  @Column({ name: 'expiry_year', type: 'smallint' })
  expiryYear!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index('idx_payment_methods_active')
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
