import { Injectable } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { Receipt } from '../../domain/aggregates/receipt.aggregate';
import { Expense } from '../../domain/aggregates/expense.aggregate';
import { ReceiptRepository } from '../../infrastructure/repositories/receipt.repository';
import { ExpenseRepository } from '../../infrastructure/repositories/expense.repository';

export interface BookingConfirmedData {
  bookingId: string;
  travelerId: string;
  travelerName: string;
  travelerEmail: string;
  totalAmount: number;
  currency?: string;
  origin: string;
  destination: string;
  departureDate: string;
}

@Injectable()
export class GenerateReceiptUseCase {
  constructor(
    private readonly receiptRepo: ReceiptRepository,
    private readonly expenseRepo: ExpenseRepository,
  ) {}

  async execute(
    data: BookingConfirmedData,
    correlationId: string,
    em: EntityManager,
  ): Promise<{ receipt: Receipt; expense: Expense }> {
    // Generate receipt number: RCP-YYYY-NNNNNN (1-indexed)
    const year = new Date().getFullYear();
    const count = await em.count(
      (await import('../../infrastructure/entities/receipt.entity')).ReceiptEntity,
    );
    const seq = String(count + 1).padStart(6, '0');
    const receiptNumber = `RCP-${year}-${seq}`;

    const receipt = Receipt.create({
      receiptNumber,
      bookingId: data.bookingId,
      travelerId: data.travelerId,
      travelerName: data.travelerName,
      travelerEmail: data.travelerEmail,
      amount: data.totalAmount,
      currency: data.currency ?? 'USD',
      origin: data.origin,
      destination: data.destination,
      departureDate: new Date(data.departureDate),
    });

    const expense = Expense.create({
      bookingId: data.bookingId,
      receiptId: receipt.id,
      travelerId: data.travelerId,
      travelerName: data.travelerName,
      amount: data.totalAmount,
      currency: data.currency ?? 'USD',
      expenseDate: new Date(data.departureDate),
    });

    await this.receiptRepo.save(receipt, em);
    await this.expenseRepo.save(expense, em);

    return { receipt, expense };
  }
}
