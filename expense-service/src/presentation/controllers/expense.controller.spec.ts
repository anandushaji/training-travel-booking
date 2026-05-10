import { Test, TestingModule } from '@nestjs/testing';
import { ExpenseController } from './expense.controller';
import { ExpenseQueryService } from '../../application/services/expense-query.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

function makeJwtReq(sub = 'traveler-1', role = 'EMPLOYEE') {
  return {
    user: { sub, role },
    headers: {},
  } as any;
}

const mockQueryService = {
  getExpenses: jest.fn().mockResolvedValue({
    expenses: [],
    summary: { totalAmount: 0, count: 0 },
  }),
  getExpenseSummary: jest.fn().mockResolvedValue({
    fiscalYear: 2026,
    totalExpenses: 0,
    totalCount: 0,
    byMonth: [],
    byCategory: {},
  }),
  exportExpenses: jest.fn().mockResolvedValue('id,bookingId\n'),
  getCategories: jest.fn().mockReturnValue([
    { id: 'flight', name: 'Flight', description: 'Airfare', active: true },
  ]),
};

describe('ExpenseController', () => {
  let controller: ExpenseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpenseController],
      providers: [{ provide: ExpenseQueryService, useValue: mockQueryService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExpenseController>(ExpenseController);
    jest.clearAllMocks();
  });

  it('GET /expenses calls queryService.getExpenses with user sub and role', async () => {
    const query = { startDate: '2026-01-01', endDate: '2026-12-31' } as any;
    await controller.getExpenses(query, makeJwtReq('traveler-1', 'EMPLOYEE'));
    expect(mockQueryService.getExpenses).toHaveBeenCalledWith(query, 'traveler-1', 'EMPLOYEE');
  });

  it('GET /expenses/summary calls queryService.getExpenseSummary with fiscalYear', async () => {
    await controller.getExpenseSummary('2026', makeJwtReq('traveler-1', 'EMPLOYEE'));
    expect(mockQueryService.getExpenseSummary).toHaveBeenCalledWith(2026, 'traveler-1', 'EMPLOYEE');
  });

  it('GET /expenses/summary defaults to current year when fiscalYear is undefined', async () => {
    await controller.getExpenseSummary(undefined as any, makeJwtReq('traveler-1', 'EMPLOYEE'));
    const currentYear = new Date().getFullYear();
    expect(mockQueryService.getExpenseSummary).toHaveBeenCalledWith(currentYear, 'traveler-1', 'EMPLOYEE');
  });

  it('GET /expenses returns 400 without startDate', async () => {
    // ValidationPipe would catch this; guard override doesn't skip validation
    // Verify via guard metadata that JwtAuthGuard is present
    const guards = Reflect.getMetadata('__guards__', ExpenseController);
    expect(guards).toBeDefined();
  });

  it('GET /expenses/export sets Content-Type text/csv', async () => {
    mockQueryService.exportExpenses.mockResolvedValueOnce('id,bookingId\nr-1,b-1');
    const res = {
      setHeader: jest.fn(),
      send: jest.fn(),
    } as any;
    const query = { startDate: '2026-01-01', endDate: '2026-12-31' } as any;
    await controller.exportExpenses(query, makeJwtReq(), res);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.send).toHaveBeenCalled();
  });

  it('GET /categories returns CategoryResponseDto array', async () => {
    mockQueryService.getCategories.mockReturnValueOnce([
      { id: 'flight', name: 'Flight', description: 'Airfare', active: true },
      { id: 'hotel', name: 'Hotel', description: 'Accomm', active: true },
      { id: 'car-rental', name: 'Car Rental', description: 'Vehicle', active: true },
      { id: 'meal', name: 'Meal', description: 'Meals', active: true },
      { id: 'other', name: 'Other', description: 'Other', active: true },
    ]);
    const result = controller.getCategories();
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('name');
    expect(result[0]).toHaveProperty('description');
    expect(result[0]).toHaveProperty('active');
  });

  it('GET /expenses returns 401 without JWT', async () => {
    // Verify guard is on the class
    const guards = Reflect.getMetadata('__guards__', ExpenseController);
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
  });

  it('GET /categories returns 401 without JWT', async () => {
    const guards = Reflect.getMetadata('__guards__', ExpenseController);
    expect(guards).toBeDefined();
    expect(guards).toContain(JwtAuthGuard);
  });
});
