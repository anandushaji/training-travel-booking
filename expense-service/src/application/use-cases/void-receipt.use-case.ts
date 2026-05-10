import { Injectable, Logger } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ReceiptRepository } from '../../infrastructure/repositories/receipt.repository';
import { ExpenseRepository } from '../../infrastructure/repositories/expense.repository';

@Injectable()
export class VoidReceiptUseCase {
  private readonly logger = new Logger(VoidReceiptUseCase.name);

  constructor(
    private readonly receiptRepo: ReceiptRepository,
    private readonly expenseRepo: ExpenseRepository,
  ) {}

  async execute(
    bookingId: string,
    correlationId: string,
    em: EntityManager,
  ): Promise<void> {
    const receipt = await this.receiptRepo.findByBookingId(bookingId);
    if (!receipt) {
      this.logger.debug(`No receipt found for bookingId=${bookingId} — no-op`);
      return;
    }

    receipt.void(new Date());
    await this.receiptRepo.save(receipt, em);

    const expense = await this.expenseRepo.findByBookingId(bookingId);
    if (expense) {
      expense.cancel(new Date());
      await this.expenseRepo.save(expense, em);
    }
  }
}
