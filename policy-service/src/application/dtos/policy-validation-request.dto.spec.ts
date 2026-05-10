import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PolicyValidationRequestDto } from './policy-validation-request.dto';

describe('PolicyValidationRequestDto', () => {
  it('passes with valid travelerId and amount', async () => {
    const dto = plainToInstance(PolicyValidationRequestDto, {
      travelerId: '00000000-0000-4000-8000-000000000001',
      amount: 500,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails when travelerId is not UUID', async () => {
    const dto = plainToInstance(PolicyValidationRequestDto, {
      travelerId: 'not-a-uuid',
      amount: 500,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'travelerId')).toBe(true);
  });

  it('fails when amount is missing', async () => {
    const dto = plainToInstance(PolicyValidationRequestDto, {
      travelerId: '00000000-0000-4000-8000-000000000001',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });

  it('fails when amount is negative', async () => {
    const dto = plainToInstance(PolicyValidationRequestDto, {
      travelerId: '00000000-0000-4000-8000-000000000001',
      amount: -100,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'amount')).toBe(true);
  });
});
