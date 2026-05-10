import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { TravelerPreferencesProps } from '../../../domain/value-objects/traveler-preferences.value-object';

@Entity('travelers')
@Index('idx_travelers_deleted_at', ['id'], { where: '"deleted_at" IS NULL' })
@Index('idx_travelers_role', ['role'])
export class TravelerTypeOrmEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'employee_id', type: 'varchar', length: 50, unique: true })
  employeeId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 320, unique: true })
  email!: string;

  @Column({ type: 'varchar', length: 100 })
  department!: string;

  @Column({ type: 'varchar', length: 20 })
  role!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null;

  @Column({ type: 'jsonb', default: '{}' })
  preferences!: TravelerPreferencesProps;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deletedAt!: Date | null;

  @Column({ name: 'anonymised_at', type: 'timestamptz', nullable: true })
  anonymisedAt!: Date | null;

  @VersionColumn({ default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
