import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { ReceiptEntity } from './entities/receipt.entity';
import { ExpenseEntity } from './entities/expense.entity';
import { ExpenseReportEntity } from './entities/expense-report.entity';
import { ProcessedEventEntity } from './entities/processed-event.entity';
import { CreateExpenseTables1714737600000 } from './migrations/1714737600000_create_expense_tables';

export default new DataSource({
  type: 'postgres',
  url: process.env['DATABASE_URL'] ?? '',
  schema: 'expense_service',
  entities: [ReceiptEntity, ExpenseEntity, ExpenseReportEntity, ProcessedEventEntity],
  migrations: [CreateExpenseTables1714737600000],
  synchronize: false,
  extra: {
    max: 20,
    statement_timeout: 5000,
    query_timeout: 5000,
    connectionTimeoutMillis: 5000,
  },
});
