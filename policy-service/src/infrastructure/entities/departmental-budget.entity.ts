import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';

@Entity('departmental_budgets')
@Unique(['department', 'fiscalYear'])
export class DepartmentalBudgetEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 100 })
  @Index('idx_dept_budgets_department')
  department!: string;

  @Column({ name: 'fiscal_year', type: 'int' })
  fiscalYear!: number;

  @Column({ name: 'total_budget', type: 'numeric', precision: 15, scale: 2 })
  totalBudget!: string;

  @Column({ type: 'numeric', precision: 15, scale: 2, default: '0' })
  spent!: string;

  @Column({ type: 'varchar', length: 3 })
  currency!: string;

  @Column({ name: 'q1_budget', type: 'numeric', precision: 15, scale: 2, nullable: true })
  q1Budget!: string | null;

  @Column({ name: 'q2_budget', type: 'numeric', precision: 15, scale: 2, nullable: true })
  q2Budget!: string | null;

  @Column({ name: 'q3_budget', type: 'numeric', precision: 15, scale: 2, nullable: true })
  q3Budget!: string | null;

  @Column({ name: 'q4_budget', type: 'numeric', precision: 15, scale: 2, nullable: true })
  q4Budget!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
