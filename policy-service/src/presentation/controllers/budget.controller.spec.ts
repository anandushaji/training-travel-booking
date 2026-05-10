import { Test, TestingModule } from '@nestjs/testing';
import { BudgetController } from './budget.controller';
import { CreateBudgetUseCase } from '../../application/use-cases/create-budget.use-case';
import { GetBudgetUseCase } from '../../application/use-cases/get-budget.use-case';
import { ListBudgetsUseCase } from '../../application/use-cases/list-budgets.use-case';
import { GetRemainingBudgetUseCase } from '../../application/use-cases/get-remaining-budget.use-case';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { generateUuid } from '@travel/shared';

const mockBudget = {
  id: generateUuid(),
  department: 'Engineering',
  fiscalYear: 2026,
  totalBudget: 100000,
  spent: 0,
  currency: 'USD',
  q1Budget: null,
  q2Budget: null,
  q3Budget: null,
  q4Budget: null,
};

describe('BudgetController', () => {
  let controller: BudgetController;
  let mockCreate: jest.Mocked<CreateBudgetUseCase>;
  let mockGet: jest.Mocked<GetBudgetUseCase>;
  let mockList: jest.Mocked<ListBudgetsUseCase>;
  let mockGetRemaining: jest.Mocked<GetRemainingBudgetUseCase>;

  beforeEach(async () => {
    mockCreate = { execute: jest.fn().mockResolvedValue(mockBudget) } as any;
    mockGet = { execute: jest.fn().mockResolvedValue(mockBudget) } as any;
    mockList = { execute: jest.fn().mockResolvedValue([mockBudget]) } as any;
    mockGetRemaining = { execute: jest.fn().mockResolvedValue({ remaining: 100000 }) } as any;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [BudgetController],
      providers: [
        { provide: CreateBudgetUseCase, useValue: mockCreate },
        { provide: GetBudgetUseCase, useValue: mockGet },
        { provide: ListBudgetsUseCase, useValue: mockList },
        { provide: GetRemainingBudgetUseCase, useValue: mockGetRemaining },
        Reflector,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<BudgetController>(BudgetController);
  });

  it('POST /budgets creates budget', async () => {
    const dto = {
      department: 'Engineering',
      fiscalYear: 2026,
      totalBudget: 100000,
      currency: 'USD',
    };
    const result = await controller.create(dto as any);
    expect(result).toEqual(mockBudget);
    expect(mockCreate.execute).toHaveBeenCalledWith(dto);
  });

  it('GET /budgets without fiscalYear returns list', async () => {
    const result = await controller.findAll(undefined);
    expect(result).toHaveLength(1);
    expect(mockList.execute).toHaveBeenCalledWith(undefined);
  });

  it('GET /budgets with fiscalYear parses it as integer', async () => {
    const result = await controller.findAll('2026');
    expect(result).toHaveLength(1);
    expect(mockList.execute).toHaveBeenCalledWith(2026);
  });

  it('GET /budgets/:department/:fiscalYear returns specific budget', async () => {
    const result = await controller.findOne('Engineering', 2026);
    expect(result).toEqual(mockBudget);
    expect(mockGet.execute).toHaveBeenCalledWith('Engineering', 2026);
  });

  it('GET /budgets/:department/:fiscalYear/remaining returns remaining budget', async () => {
    const result = await controller.getRemaining('Engineering', 2026);
    expect((result as any).remaining).toBe(100000);
    expect(mockGetRemaining.execute).toHaveBeenCalledWith('Engineering', 2026);
  });
});
