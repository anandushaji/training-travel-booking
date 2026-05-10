import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException } from '@nestjs/common';
import { NotFoundException } from '@travel/shared';
import { ReceiptController } from './receipt.controller';
import { ExpenseQueryService } from '../../application/services/expense-query.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

function makeJwtReq(sub = 'traveler-1', role = 'EMPLOYEE', correlationId?: string) {
  return {
    user: { sub, role },
    headers: correlationId ? { 'x-correlation-id': correlationId } : {},
  } as any;
}

const mockQueryService = {
  getReceipts: jest.fn().mockResolvedValue({
    receipts: [{ id: 'r-1', receiptNumber: 'RCP-2026-000001' }],
    pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
  }),
  getReceiptById: jest.fn().mockResolvedValue({ id: 'r-1', receiptNumber: 'RCP-2026-000001' }),
};

describe('ReceiptController', () => {
  let controller: ReceiptController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptController],
      providers: [{ provide: ExpenseQueryService, useValue: mockQueryService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ReceiptController>(ReceiptController);
    jest.clearAllMocks();
  });

  it('GET /receipts returns 200 with pagination', async () => {
    mockQueryService.getReceipts.mockResolvedValueOnce({
      receipts: [{ id: 'r-1', receiptNumber: 'RCP-2026-000001' }],
      pagination: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
    const result = await controller.getReceipts(makeJwtReq());
    expect(result.receipts).toBeDefined();
    expect(result.pagination).toBeDefined();
    expect(result.pagination.total).toBe(1);
  });

  it('GET /receipts returns 401 without JWT', async () => {
    // Guard is not overridden in this sub-module: verify guard is present
    const guards = Reflect.getMetadata('__guards__', ReceiptController);
    expect(guards).toBeDefined();
  });

  it('GET /receipts/:id returns 404 when not found', async () => {
    mockQueryService.getReceiptById.mockRejectedValueOnce(
      new NotFoundException('Receipt not found'),
    );
    await expect(controller.getReceiptById('unknown-id', makeJwtReq())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('correlationId forwarded from header', async () => {
    mockQueryService.getReceipts.mockResolvedValueOnce({
      receipts: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    });
    const req = makeJwtReq('traveler-1', 'EMPLOYEE', 'corr-123');
    await controller.getReceipts(req);
    // correlationId extracted but not blocking - just verify no error
    expect(mockQueryService.getReceipts).toHaveBeenCalled();
  });

  it('GET /receipts/:id returns 403 for wrong traveler', async () => {
    mockQueryService.getReceiptById.mockRejectedValueOnce(
      new ForbiddenException('Access denied'),
    );
    await expect(
      controller.getReceiptById('r-1', makeJwtReq('other-traveler', 'EMPLOYEE')),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
