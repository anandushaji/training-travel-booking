import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('expense_reports')
export class ExpenseReportEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'traveler_id' })
  travelerId!: string;

  @Column({ name: 'fiscal_year' })
  fiscalYear!: number;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'generated_at' })
  generatedAt!: Date;
}
