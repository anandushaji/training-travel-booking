export class ExpenseResponseDto {
  id!: string;
  bookingId!: string;
  receiptId!: string;
  travelerId!: string;
  travelerName!: string;
  amount!: number;
  currency!: string;
  category!: string;
  description!: string;
  expenseDate!: string;
  status!: string;
  cancelledAt?: string;
}
