import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreatePolicyDto } from './create-policy.dto';
import { CabinClass } from '../../domain/value-objects/policy-rules.value-object';

const validRules = {
  maxFlightCost: 1000,
  allowedCabinClasses: [CabinClass.ECONOMY],
  advanceBookingDays: 7,
  requiresApproval: false,
  approvalThreshold: 800,
  allowInternational: true,
};

describe('CreatePolicyDto', () => {
  it('passes validation with all required fields', async () => {
    const dto = plainToInstance(CreatePolicyDto, {
      name: 'Test Policy',
      department: 'Engineering',
      rules: validRules,
    });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails validation when name missing', async () => {
    const dto = plainToInstance(CreatePolicyDto, {
      department: 'Engineering',
      rules: validRules,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('fails validation when department missing', async () => {
    const dto = plainToInstance(CreatePolicyDto, {
      name: 'Test',
      rules: validRules,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'department')).toBe(true);
  });

  it('fails validation when rules missing', async () => {
    const dto = plainToInstance(CreatePolicyDto, {
      name: 'Test',
      department: 'Engineering',
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'rules')).toBe(true);
  });
});
