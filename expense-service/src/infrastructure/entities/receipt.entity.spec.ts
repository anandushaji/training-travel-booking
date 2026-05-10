import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { ReceiptEntity } from './receipt.entity';

describe('ReceiptEntity', () => {
  it('receiptNumber is unique', () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns.filter(
      (c) => c.target === ReceiptEntity && (c as any).options?.unique === true,
    );
    const names = columns.map((c) => (c as any).propertyName as string);
    expect(names).toContain('receiptNumber');
  });

  it('bookingId is unique', () => {
    const storage = getMetadataArgsStorage();
    const columns = storage.columns.filter(
      (c) => c.target === ReceiptEntity && (c as any).options?.unique === true,
    );
    const names = columns.map((c) => (c as any).propertyName as string);
    expect(names).toContain('bookingId');
  });
});
