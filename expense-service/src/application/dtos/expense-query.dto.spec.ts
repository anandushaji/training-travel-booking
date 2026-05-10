import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { ExpenseQueryDto } from './expense-query.dto';

describe('ExpenseQueryDto', () => {
  it('fails when startDate is missing', async () => {
    const dto = plainToInstance(ExpenseQueryDto, { endDate: '2026-12-31' });
    const errors = await validate(dto);
    const fields = errors.map((e) => e.property);
    expect(fields).toContain('startDate');
  });

  it('fails when endDate is missing', async () => {
    const dto = plainToInstance(ExpenseQueryDto, { startDate: '2026-01-01' });
    const errors = await validate(dto);
    const fields = errors.map((e) => e.property);
    expect(fields).toContain('endDate');
  });

  it('passes when both dates are provided', async () => {
    const dto = plainToInstance(ExpenseQueryDto, {
      startDate: '2026-01-01',
      endDate: '2026-12-31',
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('applies default page=1 and limit=20', () => {
    const dto = new ExpenseQueryDto();
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
  });
});
